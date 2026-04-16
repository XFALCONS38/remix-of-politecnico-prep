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
        .limit(body.limit ?? 500);

      const userIds = (profiles ?? []).map((p: any) => p.id);
      const { data: subscriptions } = await supabase
        .from("subscriptions")
        .select("*")
        .in("user_id", userIds)
        .order("created_at", { ascending: false });

      const { data: attempts } = await supabase
        .from("attempts")
        .select("user_id, status")
        .in("user_id", userIds);

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
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

      const roleMap = new Map<string, string[]>();
      for (const r of (roles ?? [])) {
        const arr = roleMap.get(r.user_id) || [];
        arr.push(r.role);
        roleMap.set(r.user_id, arr);
      }

      const enriched = (profiles ?? []).map((p: any) => ({
        ...p,
        subscriptions: subMap.get(p.id) || [],
        attempts: attemptMap.get(p.id) || { total: 0, completed: 0 },
        roles: roleMap.get(p.id) || [],
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

    if (action === "update_profile") {
      const { user_id, display_name, preferred_lang } = body;
      if (!user_id) throw new Error("user_id required");

      const updates: any = {};
      if (display_name !== undefined) updates.display_name = display_name;
      if (preferred_lang !== undefined) updates.preferred_lang = preferred_lang;

      const { error } = await supabase
        .from("profiles")
        .update(updates)
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

    if (action === "grant_access") {
      const { user_id, days } = body;
      if (!user_id || !days) throw new Error("user_id and days required");

      const expiry = new Date(Date.now() + days * 86400000).toISOString();
      
      // Update profile access
      await supabase.from("profiles").update({ access_expiry: expiry }).eq("id", user_id);
      
      // Create a subscription record
      await supabase.from("subscriptions").insert({
        user_id,
        amount_cents: 0,
        access_start: new Date().toISOString(),
        access_expiry: expiry,
        status: "active",
        stripe_session_id: "manual_grant_" + Date.now(),
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "revoke_access") {
      const { user_id } = body;
      if (!user_id) throw new Error("user_id required");

      await supabase.from("profiles").update({ access_expiry: null }).eq("id", user_id);
      
      // Cancel all active subscriptions
      await supabase
        .from("subscriptions")
        .update({ status: "cancelled" })
        .eq("user_id", user_id)
        .eq("status", "active");

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_user") {
      const { user_id } = body;
      if (!user_id) throw new Error("user_id required");

      // Don't allow deleting the admin themselves
      if (user_id === userData.user.id) throw new Error("Cannot delete yourself");

      // Delete in order: history, answers, attempts, subscriptions, roles, profile, auth user
      await supabase.from("user_question_history").delete().eq("user_id", user_id);
      
      // Get attempt IDs first
      const { data: userAttempts } = await supabase.from("attempts").select("id").eq("user_id", user_id);
      const attemptIds = (userAttempts ?? []).map((a: any) => a.id);
      if (attemptIds.length > 0) {
        await supabase.from("exam_attempt_answers").delete().in("exam_attempt_id", attemptIds);
      }
      await supabase.from("attempts").delete().eq("user_id", user_id);
      await supabase.from("subscriptions").delete().eq("user_id", user_id);
      await supabase.from("user_roles").delete().eq("user_id", user_id);
      await supabase.from("profiles").delete().eq("id", user_id);
      
      // Delete auth user
      const { error: authErr } = await supabase.auth.admin.deleteUser(user_id);
      if (authErr) throw authErr;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "toggle_role") {
      const { user_id, role, grant } = body;
      if (!user_id || !role) throw new Error("user_id and role required");

      if (grant) {
        await supabase.from("user_roles").upsert({ user_id, role }, { onConflict: "user_id,role" });
      } else {
        await supabase.from("user_roles").delete().eq("user_id", user_id).eq("role", role);
      }

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
