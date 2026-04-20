import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");
    const anon = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");
    const { data: userData } = await anon.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData?.user) throw new Error("Unauthorized");
    const userId = userData.user.id;

    const body = await req.json();
    const action = body?.action || "next";

    // Resolve user's allowed sets via active subscription
    let allowedSets: string[] = [];
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("tier, status, access_expiry")
      .eq("user_id", userId)
      .eq("status", "active")
      .gt("access_expiry", new Date().toISOString());
    let activeTierName: string | null = subs && subs.length > 0 ? (subs[0].tier as string) : null;

    // Find tier row
    let tierId: string | null = null;
    if (activeTierName) {
      const { data: t } = await supabase
        .from("subscription_tiers")
        .select("id, slug, name")
        .or(`name.eq.${activeTierName},slug.eq.${activeTierName}`)
        .maybeSingle();
      tierId = t?.id ?? null;
    }
    if (!tierId) {
      const { data: free } = await supabase.from("subscription_tiers").select("id").eq("slug", "free").maybeSingle();
      tierId = free?.id ?? null;
    }
    if (tierId) {
      const { data: access } = await supabase.from("tier_set_access").select("set_id").eq("tier_id", tierId);
      allowedSets = (access || []).map((r: any) => r.set_id);
    }
    // Fallback: if no allowlist, use ALL available sets (safe default for early launch)
    if (allowedSets.length === 0) {
      const { data: avail } = await supabase.rpc("get_available_sets");
      allowedSets = (avail || []).map((r: any) => r.set_id);
    }

    if (action === "topics") {
      const { data: rows } = await supabase
        .from("questions")
        .select("section, topic")
        .eq("is_active", true)
        .in("set_id", allowedSets);
      const map = new Map<string, { section: string; topic: string; count: number }>();
      for (const r of rows || []) {
        const k = `${r.section}::${r.topic}`;
        const cur = map.get(k) || { section: r.section, topic: r.topic, count: 0 };
        cur.count++;
        map.set(k, cur);
      }
      return j({ topics: Array.from(map.values()).sort((a, b) => a.section.localeCompare(b.section) || a.topic.localeCompare(b.topic)) });
    }

    if (action === "next") {
      const { topic, section } = body;
      let q = supabase
        .from("questions")
        .select("id, set_id, section, topic, question_code, question_text_en, question_text_it, correct_answers, wrong_answers, solution_en, solution_it, passage_id")
        .eq("is_active", true)
        .in("set_id", allowedSets);
      if (topic) q = q.eq("topic", topic);
      if (section) q = q.eq("section", section);
      const { data: rows, error } = await q.limit(200);
      if (error) throw error;
      if (!rows || rows.length === 0) throw new Error("No questions available for this selection");
      const picked = rows[Math.floor(Math.random() * rows.length)];

      // Build options snapshot server-side
      const corrects = picked.correct_answers as any[];
      const wrongs = picked.wrong_answers as any[];
      if (!corrects?.length || !wrongs || wrongs.length < 4) throw new Error("Question missing answers");
      const correctPick = corrects[Math.floor(Math.random() * corrects.length)];
      const wrongPicks = shuffle(wrongs).slice(0, 4);
      const all = shuffle([
        { en: correctPick.text_en, it: correctPick.text_it ?? null, isCorrect: true },
        ...wrongPicks.map((w: any) => ({ en: w.text_en, it: w.text_it ?? null, isCorrect: false })),
      ]);
      const letters = ["A", "B", "C", "D", "E"];
      const options: Record<string, { en: string; it: string | null }> = {};
      let assignedLetter = "";
      all.forEach((o, i) => {
        options[letters[i]] = { en: o.en, it: o.it };
        if (o.isCorrect) assignedLetter = letters[i];
      });

      // Optional passage hydration
      let passage: { en: string; it: string | null } | null = null;
      if (picked.passage_id) {
        const { data: p } = await supabase.from("passages").select("passage_text_en, passage_text_it").eq("id", picked.passage_id).maybeSingle();
        if (p) passage = { en: p.passage_text_en, it: p.passage_text_it };
      }

      return j({
        question: {
          id: picked.id,
          set_id: picked.set_id,
          section: picked.section,
          topic: picked.topic,
          question_code: picked.question_code,
          question_text_en: picked.question_text_en,
          question_text_it: picked.question_text_it,
          options,
          assigned_letter: assignedLetter,
          solution_en: picked.solution_en,
          solution_it: picked.solution_it,
          passage,
        },
      });
    }

    if (action === "submit") {
      const { question_id, section, topic, options_snapshot, assigned_letter, student_answer, time_spent_ms } = body;
      const isCorrect = student_answer === assigned_letter;
      const { error } = await supabase.from("practice_attempts").insert({
        user_id: userId,
        topic: topic ?? null,
        section,
        question_id,
        options_snapshot,
        assigned_letter,
        student_answer: student_answer ?? null,
        is_correct: isCorrect,
        time_spent_ms: time_spent_ms ?? 0,
      });
      if (error) throw error;
      return j({ ok: true, is_correct: isCorrect });
    }

    throw new Error("Unknown action");
  } catch (e: any) {
    return j({ error: e.message }, 400);
  }
});

function j(b: any, status = 200) {
  return new Response(JSON.stringify(b), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });
}
