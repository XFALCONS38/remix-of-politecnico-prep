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

    const body = await req.json();
    const action = body.action;

    if (action === "list") {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, display_name, access_expiry, preferred_lang, created_at")
        .order("created_at", { ascending: false })
        .limit(body.limit ?? 200);

      // Get subscriptions for these users
      const userIds = (profiles ?? []).map((p: any) => p.id);
      const { data: subscriptions } = await supabase
        .from("subscriptions")
        .select("*")
        .in("user_id", userIds)
        .order("created_at", { ascending: false });

      // Get attempt counts
      const { data: attempts } = await supabase
        .from("attempts")
        .select("user_id, status")
        .in("user_id", userIds);

      const subMap = new Map<string, any[]>();
      for (const s of (subscriptions ?? [])) {
        const arr = subMap.get(s.user_id) || [];
        arr.push(s);
        subMap.set(s.user_id, arr);
      }

      const attemptMap = new Map<string, { total: number; completed: number }>();
      for (const a of (attempts ?? [])) {
        const stats = attemptMap.get(a.user_id) || { total: 0, completed: 0 };
        stats.total++;
        if (a.status === "completed" || a.status === "auto_submitted") stats.completed++;
        attemptMap.set(a.user_id, stats);
      }

      const enriched = (profiles ?? []).map((p: any) => ({
        ...p,
        subscriptions: subMap.get(p.id) || [],
        attempts: attemptMap.get(p.id) || { total: 0, completed: 0 },
        isActive: p.access_expiry && new Date(p.access_expiry) > new Date(),
      }));

      return new Response(JSON.stringify({ subscribers: enriched }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_access") {
      const { user_id, access_expiry } = body;
      if (!user_id) throw new Error("user_id required");

      const { error } = await supabase
        .from("profiles")
        .update({ access_expiry })
        .eq("id", user_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_subscription_status") {
      const { subscription_id, status } = body;
      if (!subscription_id || !status) throw new Error("subscription_id and status required");

      const { error } = await supabase
        .from("subscriptions")
        .update({ status })
        .eq("id", subscription_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown action: " + action);
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
