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

    // Total users
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true });

    // Active subscribers (access_expiry > now)
    const { data: activeProfiles } = await supabase
      .from("profiles")
      .select("id")
      .gt("access_expiry", new Date().toISOString());
    const activeSubscribers = activeProfiles?.length ?? 0;

    // Revenue from subscriptions
    const { data: subscriptions } = await supabase
      .from("subscriptions")
      .select("amount_cents, currency, status, created_at");
    
    const totalRevenueCents = (subscriptions ?? [])
      .filter((s: any) => s.status === "active")
      .reduce((sum: number, s: any) => sum + (s.amount_cents ?? 0), 0);

    // Questions by section
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

    // Attempts stats
    const { count: totalAttempts } = await supabase
      .from("attempts")
      .select("id", { count: "exact", head: true });

    const { count: completedAttempts } = await supabase
      .from("attempts")
      .select("id", { count: "exact", head: true })
      .in("status", ["completed", "auto_submitted"]);

    // Recent signups (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: recentSignups } = await supabase
      .from("profiles")
      .select("id, email, created_at")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(20);

    // Discount codes stats
    const { count: totalDiscounts } = await supabase
      .from("discount_codes")
      .select("id", { count: "exact", head: true });

    const { count: activeDiscounts } = await supabase
      .from("discount_codes")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);

    return new Response(JSON.stringify({
      totalUsers: totalUsers ?? 0,
      activeSubscribers,
      totalRevenueCents,
      totalQuestions: questions?.length ?? 0,
      totalActiveQuestions: totalActive,
      questionsBySection,
      questionsBySet,
      totalAttempts: totalAttempts ?? 0,
      completedAttempts: completedAttempts ?? 0,
      completionRate: totalAttempts ? ((completedAttempts ?? 0) / totalAttempts * 100).toFixed(1) : "0",
      recentSignups: recentSignups ?? [],
      totalDiscounts: totalDiscounts ?? 0,
      activeDiscounts: activeDiscounts ?? 0,
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
