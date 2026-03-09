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
    const { data: attempt } = await supabase
      .from("attempts")
      .select("id, user_id, score, section_scores, status, submitted_at, is_free_attempt")
      .eq("id", attempt_id)
      .single();

    if (!attempt) throw new Error("Attempt not found");
    if (attempt.user_id !== userData.user.id) throw new Error("Unauthorized");

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
      .select("id, question_text_en, solution_en, section, topic, passage_id")
      .in("id", questionIds);

    const qMap = new Map((questions || []).map((q: any) => [q.id, q]));

    // Get passages
    const passageIds = [...new Set((questions || []).filter((q: any) => q.passage_id).map((q: any) => q.passage_id))];
    const passageMap = new Map<string, string>();
    if (passageIds.length > 0) {
      const { data: passages } = await supabase
        .from("passages")
        .select("id, passage_text_en")
        .in("id", passageIds);
      (passages || []).forEach((p: any) => passageMap.set(p.id, p.passage_text_en));
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
      return {
        eaa_id: eaa.id,
        question_id: eaa.question_id,
        section: eaa.section,
        question_order: eaa.question_order,
        question_text_en: q?.question_text_en ?? "",
        topic: q?.topic ?? "",
        passage_text_en: q?.passage_id ? passageMap.get(q.passage_id) ?? null : null,
        options: eaa.options_snapshot,
        assigned_letter: eaa.assigned_letter,
        student_answer: eaa.student_answer,
        solution_en: hasPaidAccess ? (q?.solution_en ?? "") : null,
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
