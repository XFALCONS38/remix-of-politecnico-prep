import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface QuotaSlot {
  topics: string[];
  count: number;
}

const SECTION_QUOTAS: Record<string, QuotaSlot[]> = {
  mathematics: [
    { topics: ["algebra"], count: 2 },
    { topics: ["functions"], count: 1 },
    { topics: ["exp_log"], count: 2 },
    { topics: ["trigonometry"], count: 2 },
    { topics: ["analytic_geometry"], count: 2 },
    { topics: ["sequences_series"], count: 1 },
    { topics: ["probability"], count: 2 },
    { topics: ["euclidean_geometry"], count: 2 },
    { topics: ["_free"], count: 2 },
  ],
  logic: [
    { topics: ["sequence_pattern"], count: 1 },
    { topics: ["ordering_puzzle"], count: 1 },
    { topics: ["syllogism"], count: 1 },
    { topics: ["cipher"], count: 1 },
    { topics: ["set_overlap"], count: 1 },
    { topics: ["text_comprehension"], count: 5 },
  ],
  physics: [
    { topics: ["kinematics", "dynamics"], count: 2 },
    { topics: ["energy_collisions"], count: 1 },
    { topics: ["thermodynamics", "fluid_mechanics"], count: 2 },
    { topics: ["electrostatics", "dc_circuits"], count: 2 },
    { topics: ["magnetism", "optics"], count: 1 },
    { topics: ["orbital_mechanics"], count: 1 },
    { topics: ["_free"], count: 1 },
  ],
  technical: [
    { topics: ["boolean_logic"], count: 1 },
    { topics: ["pseudocode"], count: 1 },
    { topics: ["bitwise"], count: 1 },
    { topics: ["topology_3d"], count: 1 },
    { topics: ["spatial_reasoning"], count: 1 },
    { topics: ["cross_section"], count: 1 },
  ],
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

function assembleAnswers(question: any) {
  const correctAnswers = question.correct_answers as any[];
  const wrongAnswers = question.wrong_answers as any[];
  const correctPick = correctAnswers[Math.floor(Math.random() * correctAnswers.length)];
  const wrongPicks = pickRandom(wrongAnswers, 4);

  const allOptions = [
    { text: correctPick.text_en, isCorrect: true },
    ...wrongPicks.map((w: any) => ({ text: w.text_en, isCorrect: false })),
  ];

  const shuffled = shuffle(allOptions);
  const letters = ["A", "B", "C", "D", "E"];
  const optionsSnapshot: Record<string, string> = {};
  let assignedLetter = "";

  shuffled.forEach((opt, i) => {
    optionsSnapshot[letters[i]] = opt.text;
    if (opt.isCorrect) assignedLetter = letters[i];
  });

  return { optionsSnapshot, assignedLetter };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    const { data: userData, error: authErr } = await anonClient.auth.getUser(token);
    if (authErr || !userData?.user) throw new Error("Unauthorized");
    const userId = userData.user.id;

    // Parse body
    let isFree = true;
    try {
      const body = await req.json();
      isFree = body?.is_free ?? true;
    } catch {
      // default free
    }

    // Check for existing in-progress attempt
    const { data: existingAttempt } = await supabase
      .from("attempts")
      .select("id, started_at")
      .eq("user_id", userId)
      .eq("status", "in_progress")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingAttempt) {
      // Resume existing attempt
      const { data: eaas } = await supabase
        .from("exam_attempt_answers")
        .select("id, question_id, section, question_order, options_snapshot, student_answer")
        .eq("exam_attempt_id", existingAttempt.id)
        .order("question_order", { ascending: true });

      if (!eaas || eaas.length === 0) throw new Error("No questions found for attempt");

      const questionIds = eaas.map((e: any) => e.question_id);
      const { data: questions } = await supabase
        .from("questions")
        .select("id, question_text_en, passage_id")
        .in("id", questionIds);

      const qMap = new Map((questions || []).map((q: any) => [q.id, q]));

      const passageIds = [...new Set((questions || []).filter((q: any) => q.passage_id).map((q: any) => q.passage_id))];
      const passageMap = new Map<string, string>();
      if (passageIds.length > 0) {
        const { data: passages } = await supabase
          .from("passages")
          .select("id, passage_text_en")
          .in("id", passageIds);
        (passages || []).forEach((p: any) => passageMap.set(p.id, p.passage_text_en));
      }

      const responseQuestions = eaas.map((eaa: any) => {
        const q = qMap.get(eaa.question_id);
        return {
          eaa_id: eaa.id,
          question_id: eaa.question_id,
          section: eaa.section,
          question_order: eaa.question_order,
          question_text_en: q?.question_text_en ?? "",
          passage_text_en: q?.passage_id ? passageMap.get(q.passage_id) ?? null : null,
          options: eaa.options_snapshot,
          student_answer: eaa.student_answer,
        };
      });

      return new Response(JSON.stringify({
        attempt_id: existingAttempt.id,
        started_at: existingAttempt.started_at,
        questions: responseQuestions,
        resumed: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Create new exam ---

    // Difficulty distribution
    let mediumPct = 0.5;
    const { data: completedAttempts } = await supabase
      .from("attempts")
      .select("score")
      .eq("user_id", userId)
      .eq("status", "completed")
      .order("score", { ascending: false });

    if (completedAttempts && completedAttempts.length >= 5) {
      const bestScore = completedAttempts[0].score ?? 0;
      if (bestScore < 50) mediumPct = 0.6;
      else if (bestScore >= 80) mediumPct = 0.3;
    }

    // Excluded question IDs (last 2 attempts)
    const { data: recentAttempts } = await supabase
      .from("attempts")
      .select("id")
      .eq("user_id", userId)
      .in("status", ["completed", "auto_submitted"])
      .order("created_at", { ascending: false })
      .limit(2);

    let excludedIds: string[] = [];
    if (recentAttempts && recentAttempts.length > 0) {
      const { data: history } = await supabase
        .from("user_question_history")
        .select("question_id")
        .in("exam_attempt_id", recentAttempts.map((a: any) => a.id));
      excludedIds = (history || []).map((h: any) => h.question_id);
    }

    // Load all active questions
    let questionsQuery = supabase
      .from("questions")
      .select("*")
      .eq("is_active", true);

    if (isFree) {
      questionsQuery = questionsQuery.eq("set_id", "SET_01");
    }

    const { data: allQuestions } = await questionsQuery;
    if (!allQuestions || allQuestions.length === 0) {
      throw new Error("No questions available in the pool");
    }

    const usedIds = new Set<string>();

    function selectForSlot(section: string, topics: string[], count: number): any[] {
      const isFreeSlot = topics.includes("_free");
      let eligible = allQuestions.filter((q: any) =>
        q.section === section &&
        !usedIds.has(q.id) &&
        (isFreeSlot || topics.includes(q.topic))
      );

      const unseen = eligible.filter((q: any) => !excludedIds.includes(q.id));
      const seen = eligible.filter((q: any) => excludedIds.includes(q.id));

      const targetMedium = Math.round(count * mediumPct);
      const targetHard = count - targetMedium;
      const result: any[] = [];

      // Fill medium from unseen then seen
      let mNeeded = targetMedium;
      for (const q of shuffle(unseen.filter((q: any) => q.difficulty === "medium"))) {
        if (mNeeded <= 0) break;
        result.push(q); mNeeded--;
      }
      for (const q of shuffle(seen.filter((q: any) => q.difficulty === "medium"))) {
        if (mNeeded <= 0) break;
        result.push(q); mNeeded--;
      }

      // Fill hard
      let hNeeded = targetHard;
      for (const q of shuffle(unseen.filter((q: any) => q.difficulty === "hard"))) {
        if (hNeeded <= 0 || result.find((r: any) => r.id === q.id)) continue;
        result.push(q); hNeeded--;
      }
      for (const q of shuffle(seen.filter((q: any) => q.difficulty === "hard"))) {
        if (hNeeded <= 0 || result.find((r: any) => r.id === q.id)) continue;
        result.push(q); hNeeded--;
      }

      // Fill remaining with any available
      if (result.length < count) {
        const remaining = [...unseen, ...seen].filter((q: any) => !result.find((r: any) => r.id === q.id));
        for (const q of shuffle(remaining)) {
          if (result.length >= count) break;
          result.push(q);
        }
      }

      result.forEach((q: any) => usedIds.add(q.id));
      return result.slice(0, count);
    }

    // Handle passage block for text_comprehension
    let passageBlock: any[] = [];
    let passageText: string | null = null;

    const tcQuestions = allQuestions.filter((q: any) =>
      q.section === "logic" && q.topic === "text_comprehension" && q.passage_id
    );
    const passageGroups = new Map<string, any[]>();
    for (const q of tcQuestions) {
      const group = passageGroups.get(q.passage_id) || [];
      group.push(q);
      passageGroups.set(q.passage_id, group);
    }

    let selectedPassageId: string | null = null;
    for (const [passageId, pqs] of passageGroups) {
      if (pqs.length >= 5) {
        const unseenCount = pqs.filter((q: any) => !excludedIds.includes(q.id)).length;
        if (unseenCount >= 3 || !selectedPassageId) {
          selectedPassageId = passageId;
          if (unseenCount >= 3) break;
        }
      }
    }

    if (selectedPassageId) {
      passageBlock = passageGroups.get(selectedPassageId)!
        .sort((a: any, b: any) => (a.passage_order ?? 0) - (b.passage_order ?? 0))
        .slice(0, 5);
      passageBlock.forEach((q: any) => usedIds.add(q.id));

      const { data: passage } = await supabase
        .from("passages")
        .select("passage_text_en")
        .eq("id", selectedPassageId)
        .single();
      passageText = passage?.passage_text_en ?? null;
    }

    // Expected totals per section
    const SECTION_TOTALS: Record<string, number> = {
      mathematics: 16,
      logic: 10,
      physics: 10,
      technical: 6,
    };

    // Build ordered question list
    let questionOrder = 1;
    const orderedQuestions: Array<{ question: any; section: string; order: number; passageText?: string }> = [];
    const sections = ["mathematics", "logic", "physics", "technical"];

    for (const section of sections) {
      const sectionStart = orderedQuestions.length;
      const quotas = SECTION_QUOTAS[section];
      for (const slot of quotas) {
        if (slot.topics.includes("text_comprehension")) {
          for (const q of passageBlock) {
            orderedQuestions.push({ question: q, section, order: questionOrder++, passageText: passageText ?? undefined });
          }
          continue;
        }
        const selected = selectForSlot(section, slot.topics, slot.count);
        for (const q of selected) {
          orderedQuestions.push({ question: q, section, order: questionOrder++ });
        }
      }

      // Fill any shortfall from remaining unused questions in this section
      const sectionCount = orderedQuestions.length - sectionStart;
      const expectedTotal = SECTION_TOTALS[section] ?? sectionCount;
      if (sectionCount < expectedTotal) {
        const deficit = expectedTotal - sectionCount;
        const remaining = allQuestions.filter((q: any) =>
          q.section === section && !usedIds.has(q.id)
        );
        const unseen = remaining.filter((q: any) => !excludedIds.includes(q.id));
        const seen = remaining.filter((q: any) => excludedIds.includes(q.id));
        const fillPool = shuffle([...unseen, ...seen]);
        for (const q of fillPool) {
          if (orderedQuestions.length - sectionStart >= expectedTotal) break;
          usedIds.add(q.id);
          orderedQuestions.push({ question: q, section, order: questionOrder++ });
        }
      }
    }

    // Create attempt
    const { count: attemptCount } = await supabase
      .from("attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    const { data: newAttempt, error: attemptErr } = await supabase
      .from("attempts")
      .insert({
        user_id: userId,
        is_free_attempt: (attemptCount ?? 0) === 0 || isFree,
        current_section: 1,
      })
      .select("id, started_at")
      .single();

    if (attemptErr || !newAttempt) throw new Error("Failed to create attempt: " + (attemptErr?.message ?? ""));

    // Insert exam_attempt_answers
    const eaaRows = orderedQuestions.map(oq => {
      const { optionsSnapshot, assignedLetter } = assembleAnswers(oq.question);
      return {
        exam_attempt_id: newAttempt.id,
        question_id: oq.question.id,
        section: oq.section,
        question_order: oq.order,
        assigned_letter: assignedLetter,
        student_answer: null,
        options_snapshot: optionsSnapshot,
      };
    });

    const { data: insertedEaas, error: eaaErr } = await supabase
      .from("exam_attempt_answers")
      .insert(eaaRows)
      .select("id, question_id, question_order, options_snapshot");

    if (eaaErr) throw new Error("Failed to insert exam answers: " + eaaErr.message);

    // Insert user_question_history
    const historyRows = orderedQuestions.map(oq => ({
      user_id: userId,
      question_id: oq.question.id,
      exam_attempt_id: newAttempt.id,
    }));
    await supabase.from("user_question_history").insert(historyRows);

    // Increment times_served
    const qIds = orderedQuestions.map(oq => oq.question.id);
    for (const qId of qIds) {
      await supabase.rpc("increment_times_served_noop", { q_id: qId }).catch(() => {
        // fallback: manual update
      });
    }
    // Manual increment since rpc may not exist yet
    for (const qId of qIds) {
      await supabase
        .from("questions")
        .update({ times_served: (allQuestions.find((q: any) => q.id === qId)?.times_served ?? 0) + 1 })
        .eq("id", qId);
    }

    // Build response
    const eaaMap = new Map((insertedEaas || []).map((e: any) => [e.question_id + "_" + e.question_order, e]));
    const responseQuestions = orderedQuestions.map(oq => {
      const eaa = (insertedEaas || []).find((e: any) => e.question_id === oq.question.id && e.question_order === oq.order);
      return {
        eaa_id: eaa?.id,
        question_id: oq.question.id,
        section: oq.section,
        question_order: oq.order,
        question_text_en: oq.question.question_text_en,
        passage_text_en: oq.passageText ?? null,
        options: eaa?.options_snapshot,
        student_answer: null,
      };
    });

    return new Response(JSON.stringify({
      attempt_id: newAttempt.id,
      started_at: newAttempt.started_at,
      questions: responseQuestions,
      resumed: false,
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
