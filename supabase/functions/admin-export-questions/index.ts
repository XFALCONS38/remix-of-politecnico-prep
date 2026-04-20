import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Auth + admin check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");
    const anon = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");
    const { data: userData } = await anon.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData?.user) throw new Error("Unauthorized");
    const { data: roleCheck } = await supabase.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!roleCheck) throw new Error("Admin only");

    const body = await req.json().catch(() => ({}));
    const { set_id, section, topic, difficulty } = body || {};

    let q = supabase
      .from("questions")
      .select("set_id, section, question_code, topic, subtopic, difficulty, question_text_en, question_text_it, correct_answers, wrong_answers, solution_en, solution_it, is_active, it_ready, passage_id, passage_order")
      .order("set_id", { ascending: true })
      .order("section", { ascending: true })
      .order("question_code", { ascending: true });

    if (set_id) q = q.eq("set_id", set_id);
    if (section) q = q.eq("section", section);
    if (topic) q = q.eq("topic", topic);
    if (difficulty) q = q.eq("difficulty", difficulty);

    const { data, error } = await q;
    if (error) throw error;

    // Strip nulls for cleaner round-trip
    const cleaned = (data || []).map((row: any) => {
      const out: any = {
        set_id: row.set_id,
        section: row.section,
        question_code: row.question_code,
        topic: row.topic,
        difficulty: row.difficulty,
        question_text_en: row.question_text_en,
        correct_answers: row.correct_answers,
        wrong_answers: row.wrong_answers,
        solution_en: row.solution_en,
        is_active: row.is_active ?? true,
        it_ready: row.it_ready ?? false,
      };
      if (row.subtopic) out.subtopic = row.subtopic;
      if (row.question_text_it) out.question_text_it = row.question_text_it;
      if (row.solution_it) out.solution_it = row.solution_it;
      if (row.passage_id) out.passage_id = row.passage_id;
      if (row.passage_order != null) out.passage_order = row.passage_order;
      return out;
    });

    return new Response(JSON.stringify({ count: cleaned.length, questions: cleaned }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
