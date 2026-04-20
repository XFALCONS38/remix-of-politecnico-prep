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
    const anon = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "");
    const { data: userData } = await anon.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!userData?.user) throw new Error("Unauthorized");
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) throw new Error("Admin only");

    const body = await req.json();
    const action = body?.action;

    if (action === "list") {
      const { data: tiers } = await supabase
        .from("subscription_tiers")
        .select("*")
        .order("display_order", { ascending: true });
      const { data: access } = await supabase.from("tier_set_access").select("*");
      const { data: setRows } = await supabase.rpc("get_available_sets");
      return j({ tiers: tiers || [], access: access || [], available_sets: (setRows || []).map((r: any) => r.set_id) });
    }

    if (action === "upsert_tier") {
      const t = body.tier;
      if (!t?.name || !t?.slug) throw new Error("name + slug required");
      const payload: any = {
        name: t.name,
        slug: t.slug,
        duration_days: t.duration_days ?? 30,
        price_cents: t.price_cents ?? 0,
        display_order: t.display_order ?? 0,
        is_active: t.is_active ?? true,
        features: t.features ?? {},
        max_sets: t.max_sets ?? null,
        bonus_sets_count: t.bonus_sets_count ?? 0,
      };
      if (t.id) {
        const { error } = await supabase.from("subscription_tiers").update(payload).eq("id", t.id);
        if (error) throw error;
        return j({ ok: true, id: t.id });
      } else {
        const { data, error } = await supabase.from("subscription_tiers").insert(payload).select("id").single();
        if (error) throw error;
        return j({ ok: true, id: data.id });
      }
    }

    if (action === "delete_tier") {
      const { error } = await supabase.from("subscription_tiers").delete().eq("id", body.tier_id);
      if (error) throw error;
      return j({ ok: true });
    }

    if (action === "set_access") {
      const tierId = body.tier_id;
      const sets: { set_id: string; is_bonus: boolean }[] = body.sets || [];
      // Replace strategy
      await supabase.from("tier_set_access").delete().eq("tier_id", tierId);
      if (sets.length > 0) {
        const rows = sets.map((s) => ({ tier_id: tierId, set_id: s.set_id, is_bonus: !!s.is_bonus }));
        const { error } = await supabase.from("tier_set_access").insert(rows);
        if (error) throw error;
      }
      return j({ ok: true, count: sets.length });
    }

    throw new Error("Unknown action");
  } catch (e: any) {
    return j({ error: e.message }, 400);
  }
});

function j(b: any, status = 200) {
  return new Response(JSON.stringify(b), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });
}
