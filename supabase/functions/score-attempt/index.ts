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

    // Verify attempt
    const { data: attempt, error: attemptErr } = await supabase
      .from("attempts")
      .select("id, user_id, status")
      .eq("id", attempt_id)
      .single();

    if (attemptErr || !attempt) throw new Error("Attempt not found");
    if (attempt.status !== "in_progress") throw new Error("Attempt already submitted");

    // Verify caller
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const anonClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? ""
      );
      const { data: userData } = await anonClient.auth.getUser(token);
      if (userData?.user?.id !== attempt.user_id) throw new Error("Unauthorized");
    }

    // Get all exam_attempt_answers
    const { data: eaas } = await supabase
      .from("exam_attempt_answers")
      .select("id, question_id, section, assigned_letter, student_answer")
      .eq("exam_attempt_id", attempt_id);

    if (!eaas || eaas.length === 0) throw new Error("No answers found");

    // Score
    let totalScore = 0;
    const sectionData: Record<string, { correct: number; wrong: number; blank: number; score: number; total: number }> = {};
    const correctQuestionIds: string[] = [];

    for (const eaa of eaas) {
      const section = eaa.section;
      if (!sectionData[section]) {
        sectionData[section] = { correct: 0, wrong: 0, blank: 0, score: 0, total: 0 };
      }
      sectionData[section].total++;

      if (eaa.student_answer === null || eaa.student_answer === "") {
        // Blank
        sectionData[section].blank++;
      } else if (eaa.student_answer === eaa.assigned_letter) {
        // Correct +1.0
        sectionData[section].correct++;
        sectionData[section].score += 1.0;
        totalScore += 1.0;
        correctQuestionIds.push(eaa.question_id);
      } else {
        // Wrong -0.25
        sectionData[section].wrong++;
        sectionData[section].score -= 0.25;
        totalScore -= 0.25;
      }
    }

    // Update attempt
    await supabase
      .from("attempts")
      .update({
        score: totalScore,
        section_scores: sectionData,
        status: "completed",
        submitted_at: new Date().toISOString(),
      })
      .eq("id", attempt_id);

    // Increment times_correct for correct questions
    for (const qId of correctQuestionIds) {
      const { data: q } = await supabase
        .from("questions")
        .select("times_correct")
        .eq("id", qId)
        .single();
      if (q) {
        await supabase
          .from("questions")
          .update({ times_correct: (q.times_correct ?? 0) + 1 })
          .eq("id", qId);
      }
    }

    return new Response(JSON.stringify({
      score: totalScore,
      section_scores: sectionData,
      status: "completed",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
