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

    // ─── Total users ───
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });

    // ─── Active subscribers ───
    const { data: activeProfiles } = await supabase
      .from("profiles")
      .select("id")
      .gt("access_expiry", new Date().toISOString());
    const activeSubscribers = activeProfiles?.length ?? 0;

    // ─── Revenue from subscriptions ───
    const { data: subscriptions } = await supabase
      .from("subscriptions")
      .select("amount_cents, currency, status, created_at, access_start, access_expiry");

    const now = new Date();
    const activeSubsList = (subscriptions ?? []).filter((s: any) => s.status === "active");
    const totalRevenueCents = activeSubsList.reduce((sum: number, s: any) => sum + (s.amount_cents ?? 0), 0);

    // MRR: sum of active subscription amounts / avg duration in months
    let mrrCents = 0;
    for (const s of activeSubsList) {
      const start = new Date(s.access_start);
      const end = new Date(s.access_expiry);
      const months = Math.max(1, (end.getTime() - start.getTime()) / (30 * 86400000));
      mrrCents += (s.amount_cents ?? 0) / months;
    }

    // Revenue by month (last 6 months)
    const revenueByMonth: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      revenueByMonth[key] = 0;
    }
    for (const s of (subscriptions ?? [])) {
      if (s.status === "active" || s.status === "expired") {
        const d = new Date(s.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (revenueByMonth[key] !== undefined) revenueByMonth[key] += (s.amount_cents ?? 0);
      }
    }

    // Revenue by tier (amount bucket)
    const revenueByTier: Record<string, { count: number; revenue: number }> = {};
    for (const s of activeSubsList) {
      const tier = s.amount_cents === 0 ? "Free/Manual" : `€${(s.amount_cents / 100).toFixed(0)}`;
      if (!revenueByTier[tier]) revenueByTier[tier] = { count: 0, revenue: 0 };
      revenueByTier[tier].count++;
      revenueByTier[tier].revenue += s.amount_cents;
    }

    // ─── Questions stats ───
    const { data: questions } = await supabase
      .from("questions")
      .select("section, set_id, is_active");
    
    const questionsBySection: Record<string, number> = {};
    const questionsBySet: Record<string, number> = {};
    let totalActive = 0;
    for (const q of (questions ?? [])) {
      questionsBySection[q.section] = (questionsBySection[q.section] ?? 0) + 1;
      questionsBySet[q.set_id] = (questionsBySet[q.set_id] ?? 0) + 1;
      if (q.is_active) totalActive++;
    }

    // ─── Attempts stats ───
    const { count: totalAttempts } = await supabase
      .from("attempts")
      .select("id", { count: "exact", head: true });

    const { count: completedAttempts } = await supabase
      .from("attempts")
      .select("id", { count: "exact", head: true })
      .in("status", ["completed", "auto_submitted"]);

    // Average score
    const { data: completedScores } = await supabase
      .from("attempts")
      .select("score")
      .in("status", ["completed", "auto_submitted"])
      .not("score", "is", null);
    const avgScore = completedScores && completedScores.length > 0
      ? (completedScores.reduce((s: number, a: any) => s + (a.score ?? 0), 0) / completedScores.length).toFixed(1)
      : "0";

    // ─── Recent signups (30 days) ───
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: recentSignups } = await supabase
      .from("profiles")
      .select("id, email, created_at")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(20);

    // Signups by day (last 30 days)
    const signupsByDay: Record<string, number> = {};
    for (const s of (recentSignups ?? [])) {
      const day = new Date(s.created_at).toISOString().slice(0, 10);
      signupsByDay[day] = (signupsByDay[day] ?? 0) + 1;
    }

    // ─── Discount codes stats ───
    const { count: totalDiscounts } = await supabase
      .from("discount_codes")
      .select("id", { count: "exact", head: true });

    const { count: activeDiscounts } = await supabase
      .from("discount_codes")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);

    // ─── New this week ───
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { count: newThisWeek } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekAgo);

    return new Response(JSON.stringify({
      totalUsers: totalUsers ?? 0,
      activeSubscribers,
      totalRevenueCents,
      mrrCents: Math.round(mrrCents),
      revenueByMonth,
      revenueByTier,
      totalQuestions: questions?.length ?? 0,
      totalActiveQuestions: totalActive,
      questionsBySection,
      questionsBySet,
      totalAttempts: totalAttempts ?? 0,
      completedAttempts: completedAttempts ?? 0,
      completionRate: totalAttempts ? ((completedAttempts ?? 0) / totalAttempts * 100).toFixed(1) : "0",
      avgScore,
      recentSignups: recentSignups ?? [],
      signupsByDay,
      totalDiscounts: totalDiscounts ?? 0,
      activeDiscounts: activeDiscounts ?? 0,
      newThisWeek: newThisWeek ?? 0,
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
