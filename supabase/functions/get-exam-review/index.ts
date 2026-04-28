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
    const { attempt_id } = await req.json();
    if (!attempt_id) throw new Error("attempt_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");
    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const { data: userData } = await anonClient.auth.getUser(token);
    if (!userData?.user) throw new Error("Unauthorized");

    // Get attempt
    const { data: attempt, error: attemptErr } = await supabase
      .from("attempts")
      .select("id, user_id, score, section_scores, status, submitted_at, is_free_attempt, lang, set_id")
      .eq("id", attempt_id)
      .maybeSingle();

    if (attemptErr) {
      return new Response(JSON.stringify({ error: `DB error: ${attemptErr.message}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
    if (!attempt) {
      return new Response(JSON.stringify({ error: "Attempt not found", attempt_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }
    if (attempt.user_id !== userData.user.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // Get exam_attempt_answers
    const { data: eaas } = await supabase
      .from("exam_attempt_answers")
      .select("id, question_id, section, question_order, assigned_letter, student_answer, options_snapshot")
      .eq("exam_attempt_id", attempt_id)
      .order("question_order", { ascending: true });

    if (!eaas) throw new Error("No answers found");

    // Get question details (service role bypasses RLS)
    const questionIds = eaas.map((e: any) => e.question_id);
    const { data: questions } = await supabase
      .from("questions")
      .select("id, question_text_en, question_text_it, solution_en, solution_it, section, topic, passage_id")
      .in("id", questionIds);

    const qMap = new Map((questions || []).map((q: any) => [q.id, q]));

    // Get passages
    const passageIds = [...new Set((questions || []).filter((q: any) => q.passage_id).map((q: any) => q.passage_id))];
    const passageMap = new Map<string, { en: string; it: string | null }>();
    if (passageIds.length > 0) {
      const { data: passages } = await supabase
        .from("passages")
        .select("id, passage_text_en, passage_text_it")
        .in("id", passageIds);
      (passages || []).forEach((p: any) => passageMap.set(p.id, { en: p.passage_text_en, it: p.passage_text_it }));
    }

    // Check if user has paid access
    const { data: profile } = await supabase
      .from("profiles")
      .select("access_expiry")
      .eq("id", userData.user.id)
      .single();

    const hasPaidAccess = profile?.access_expiry && new Date(profile.access_expiry) > new Date();

    // Build review data
    const reviewQuestions = eaas.map((eaa: any) => {
      const q = qMap.get(eaa.question_id);
      const passage = q?.passage_id ? passageMap.get(q.passage_id) : null;
      return {
        eaa_id: eaa.id,
        question_id: eaa.question_id,
        section: eaa.section,
        question_order: eaa.question_order,
        question_text_en: q?.question_text_en ?? "",
        question_text_it: q?.question_text_it ?? null,
        topic: q?.topic ?? "",
        passage_text_en: passage?.en ?? null,
        passage_text_it: passage?.it ?? null,
        options: eaa.options_snapshot,
        assigned_letter: eaa.assigned_letter,
        student_answer: eaa.student_answer,
        solution_en: hasPaidAccess ? (q?.solution_en ?? "") : null,
        solution_it: hasPaidAccess ? (q?.solution_it ?? null) : null,
      };
    });

    return new Response(JSON.stringify({
      attempt,
      questions: reviewQuestions,
      has_paid_access: hasPaidAccess,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
