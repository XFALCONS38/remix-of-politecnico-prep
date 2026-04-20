import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");
    const anon = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");
    const { data: userData } = await anon.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData?.user) throw new Error("Unauthorized");
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) throw new Error("Admin only");

    // Pull last 5000 answered EAA rows
    const { data: eaas } = await supabase
      .from("exam_attempt_answers")
      .select("section, question_id, time_spent_ms, student_answer, assigned_letter")
      .gt("time_spent_ms", 0)
      .order("created_at", { ascending: false })
      .limit(5000);

    const sectionAgg: Record<string, { total: number; sum: number }> = {};
    const perQ: Record<string, { sum: number; n: number; correct: number }> = {};

    for (const e of eaas || []) {
      const sec = e.section || "unknown";
      if (!sectionAgg[sec]) sectionAgg[sec] = { total: 0, sum: 0 };
      sectionAgg[sec].total++;
      sectionAgg[sec].sum += e.time_spent_ms || 0;
      const qId = e.question_id || "unknown";
      if (!perQ[qId]) perQ[qId] = { sum: 0, n: 0, correct: 0 };
      perQ[qId].sum += e.time_spent_ms || 0;
      perQ[qId].n += 1;
      if (e.student_answer && e.student_answer === e.assigned_letter) perQ[qId].correct += 1;
    }

    const sectionAvg = Object.entries(sectionAgg).map(([s, a]) => ({
      section: s, n: a.total, avg_ms: Math.round(a.sum / a.total),
    }));

    const slowest = Object.entries(perQ)
      .filter(([, a]) => a.n >= 2)
      .map(([qid, a]) => ({ question_id: qid, n: a.n, avg_ms: Math.round(a.sum / a.n), correct_pct: Math.round((a.correct / a.n) * 100) }))
      .sort((a, b) => b.avg_ms - a.avg_ms)
      .slice(0, 20);

    // Hydrate slowest with question metadata
    const ids = slowest.map((s) => s.question_id);
    let meta: Record<string, any> = {};
    if (ids.length > 0) {
      const { data: qs } = await supabase
        .from("questions")
        .select("id, set_id, section, topic, question_code, question_text_en")
        .in("id", ids);
      for (const q of qs || []) meta[q.id] = q;
    }
    const slowestEnriched = slowest.map((s) => ({ ...s, ...(meta[s.question_id] || {}) }));

    return new Response(JSON.stringify({ section_avg: sectionAvg, slowest: slowestEnriched }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400,
    });
  }
});
