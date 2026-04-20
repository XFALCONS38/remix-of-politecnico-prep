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

    const body = await req.json();
    const action = body?.action;

    if (action === "list") {
      const { data, error } = await supabase
        .from("tips_articles")
        .select("*")
        .order("category", { ascending: true })
        .order("display_order", { ascending: true });
      if (error) throw error;
      return j({ articles: data || [] });
    }

    if (action === "upsert") {
      const a = body.article;
      const payload: any = {
        slug: a.slug,
        title_en: a.title_en,
        title_it: a.title_it ?? null,
        body_en: a.body_en,
        body_it: a.body_it ?? null,
        category: a.category ?? "tips",
        display_order: a.display_order ?? 0,
        is_published: a.is_published ?? true,
        updated_at: new Date().toISOString(),
      };
      if (a.id) {
        const { error } = await supabase.from("tips_articles").update(payload).eq("id", a.id);
        if (error) throw error;
        return j({ ok: true, id: a.id });
      }
      const { data, error } = await supabase.from("tips_articles").insert(payload).select("id").single();
      if (error) throw error;
      return j({ ok: true, id: data.id });
    }

    if (action === "delete") {
      const { error } = await supabase.from("tips_articles").delete().eq("id", body.id);
      if (error) throw error;
      return j({ ok: true });
    }

    throw new Error("Unknown action");
  } catch (e: any) {
    return j({ error: e.message }, 400);
  }
});

function j(b: any, status = 200) {
  return new Response(JSON.stringify(b), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status });
}
