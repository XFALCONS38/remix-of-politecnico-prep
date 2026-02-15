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

    // Use service role to bypass RLS and read correct answers
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify the attempt exists and is in_progress
    const { data: attempt, error: attemptErr } = await supabase
      .from("attempts")
      .select("id, user_id, status")
      .eq("id", attempt_id)
      .single();

    if (attemptErr || !attempt) throw new Error("Attempt not found");
    if (attempt.status !== "in_progress") throw new Error("Attempt already submitted");

    // Verify caller owns this attempt
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

    // Get all answers for this attempt
    const { data: answers } = await supabase
      .from("answers")
      .select("id, question_id, selected_option_index")
      .eq("attempt_id", attempt_id);

    if (!answers) throw new Error("No answers found");

    // Get all questions with correct answers
    const questionIds = answers.map(a => a.question_id);
    const { data: questions } = await supabase
      .from("questions")
      .select("id, correct_option_index, section")
      .in("id", questionIds);

    if (!questions) throw new Error("Questions not found");

    const questionMap = new Map(questions.map(q => [q.id, q]));

    // Score each answer
    let totalScore = 0;
    const sectionData: Record<string, { correct: number; wrong: number; blank: number; score: number; total: number }> = {};

    for (const answer of answers) {
      const question = questionMap.get(answer.question_id);
      if (!question) continue;

      const section = question.section;
      if (!sectionData[section]) {
        sectionData[section] = { correct: 0, wrong: 0, blank: 0, score: 0, total: 0 };
      }
      sectionData[section].total++;

      let isCorrect: boolean | null = null;
      let pointsEarned = 0;

      if (answer.selected_option_index === null) {
        // Blank = 0 points
        sectionData[section].blank++;
        isCorrect = null;
        pointsEarned = 0;
      } else if (answer.selected_option_index === question.correct_option_index) {
        // Correct = +1.0
        sectionData[section].correct++;
        isCorrect = true;
        pointsEarned = 1.0;
      } else {
        // Wrong = -0.25
        sectionData[section].wrong++;
        isCorrect = false;
        pointsEarned = -0.25;
      }

      totalScore += pointsEarned;
      sectionData[section].score += pointsEarned;

      // Update answer with is_correct
      await supabase
        .from("answers")
        .update({ is_correct: isCorrect })
        .eq("id", answer.id);
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

    return new Response(JSON.stringify({
      score: totalScore,
      section_scores: sectionData,
      status: "completed",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
