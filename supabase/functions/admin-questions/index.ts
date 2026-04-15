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
