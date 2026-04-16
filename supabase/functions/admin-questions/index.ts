import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");
    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const { data: userData } = await anonClient.auth.getUser(token);
    if (!userData?.user) throw new Error("Unauthorized");

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) throw new Error("Admin access required");

    const body = await req.json();
    const action = body.action;

    if (action === "list") {
      let query = supabase.from("questions").select("*").order("created_at", { ascending: false });
      if (body.section) query = query.eq("section", body.section);
      if (body.topic) query = query.eq("topic", body.topic);
      if (body.difficulty) query = query.eq("difficulty", body.difficulty);
      if (body.set_id) query = query.eq("set_id", body.set_id);
      if (body.is_active !== undefined) query = query.eq("is_active", body.is_active);

      const limit = body.limit ?? 100;
      const offset = body.offset ?? 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({ questions: data, count }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get") {
      const { question_id } = body;
      if (!question_id) throw new Error("question_id required");

      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("id", question_id)
        .single();
      if (error) throw error;

      return new Response(JSON.stringify({ question: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "toggle_active") {
      const { question_id, is_active } = body;
      if (!question_id) throw new Error("question_id required");

      const { error } = await supabase
        .from("questions")
        .update({ is_active })
        .eq("id", question_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      const { question_id, ...updates } = body;
      if (!question_id) throw new Error("question_id required");
      delete updates.action;

      const { error } = await supabase
        .from("questions")
        .update(updates)
        .eq("id", question_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { question_id } = body;
      if (!question_id) throw new Error("question_id required");

      const { error } = await supabase
        .from("questions")
        .delete()
        .eq("id", question_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "bulk_insert") {
      const { questions } = body;
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error("questions array required");
      }

      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.set_id || !q.section || !q.question_code || !q.topic || !q.difficulty ||
            !q.question_text_en || !q.correct_answers || !q.wrong_answers || !q.solution_en) {
          throw new Error(`Question at index ${i} missing required fields`);
        }
        if (!Array.isArray(q.correct_answers) || q.correct_answers.length < 1) {
          throw new Error(`Question ${i}: correct_answers must have at least 1 entry`);
        }
        if (!Array.isArray(q.wrong_answers) || q.wrong_answers.length < 4) {
          throw new Error(`Question ${i}: wrong_answers must have at least 4 entries`);
        }
      }

      // Resolve non-UUID passage_id strings (e.g., "set04_passage_anc") via passages.title within the same set_id
      const passageLookups = new Map<string, string>(); // key: `${set_id}::${code}` -> uuid
      const needed = new Map<string, Set<string>>(); // set_id -> Set<code>
      for (const q of questions) {
        if (q.passage_id && typeof q.passage_id === "string" && !UUID_RE.test(q.passage_id)) {
          if (!needed.has(q.set_id)) needed.set(q.set_id, new Set());
          needed.get(q.set_id)!.add(q.passage_id);
        }
      }
      for (const [setId, codes] of needed) {
        const codeArr = Array.from(codes);
        const { data: rows, error: pErr } = await supabase
          .from("passages")
          .select("id, title, set_id")
          .eq("set_id", setId)
          .in("title", codeArr);
        if (pErr) throw pErr;

        const found = new Map<string, string>();
        for (const r of rows ?? []) found.set((r as any).title, (r as any).id);

        const missing = codeArr.filter(c => !found.has(c));
        if (missing.length > 0) {
          // Auto-create stub passages so question import doesn't fail.
          // Admin can update passage_text_en later via the Passages UI.
          const stubs = missing.map(code => ({
            set_id: setId,
            title: code,
            passage_text_en: `[STUB] Passage "${code}" — please update with real text.`,
          }));
          const { data: created, error: cErr } = await supabase
            .from("passages")
            .insert(stubs)
            .select("id, title");
          if (cErr) throw new Error(`Failed to auto-create passages: ${cErr.message}`);
          for (const r of created ?? []) found.set((r as any).title, (r as any).id);
        }

        for (const code of codeArr) {
          passageLookups.set(`${setId}::${code}`, found.get(code)!);
        }
      }
      // Apply resolved UUIDs / null-out empty strings
      for (const q of questions) {
        if (q.passage_id === "" || q.passage_id === undefined) {
          q.passage_id = null;
        } else if (typeof q.passage_id === "string" && !UUID_RE.test(q.passage_id)) {
          q.passage_id = passageLookups.get(`${q.set_id}::${q.passage_id}`) ?? null;
        }
      }

      const { data, error } = await supabase
        .from("questions")
        .insert(questions)
        .select("id, question_code, section");
      if (error) throw error;

      return new Response(JSON.stringify({ inserted: data?.length ?? 0, questions: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "bulk_insert_passages") {
      const { passages } = body;
      if (!Array.isArray(passages) || passages.length === 0) {
        throw new Error("passages array required");
      }

      const { data, error } = await supabase
        .from("passages")
        .insert(passages)
        .select("id, set_id, title");
      if (error) throw error;

      return new Response(JSON.stringify({ inserted: data?.length ?? 0, passages: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown action: " + action);

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
