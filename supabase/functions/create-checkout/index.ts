import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated");

    let body: any = {};
    try { body = await req.json(); } catch { /* no body is OK */ }
    const discountCodeRaw: string | undefined = body?.discount_code;

    // Look up discount code (server-side validation)
    let stripeCoupon: string | undefined;
    let discountRecord: any = null;
    if (discountCodeRaw) {
      const code = discountCodeRaw.trim().toUpperCase();
      const { data: dc } = await adminClient
        .from("discount_codes")
        .select("*")
        .eq("code", code)
        .maybeSingle();

      if (!dc) throw new Error("Invalid discount code");
      const now = new Date();
      if (!dc.is_active) throw new Error("Discount code inactive");
      if (new Date(dc.valid_from) > now) throw new Error("Discount not yet valid");
      if (dc.valid_until && new Date(dc.valid_until) < now) throw new Error("Discount code expired");
      if (dc.max_uses && dc.current_uses >= dc.max_uses) throw new Error("Discount fully redeemed");
      discountRecord = dc;
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Create a one-time Stripe coupon for the percent discount
    if (discountRecord) {
      const coupon = await stripe.coupons.create({
        percent_off: discountRecord.discount_percent,
        duration: "once",
        name: discountRecord.code,
      });
      stripeCoupon = coupon.id;
    }

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      client_reference_id: user.id,
      line_items: [{ price: "price_1T1EoW785evBQ3vkgSVb2i1s", quantity: 1 }],
      mode: "payment",
      discounts: stripeCoupon ? [{ coupon: stripeCoupon }] : undefined,
      metadata: discountRecord ? { discount_code: discountRecord.code, discount_id: discountRecord.id } : undefined,
      success_url: `${req.headers.get("origin")}/payment-success`,
      cancel_url: `${req.headers.get("origin")}/pricing`,
    });

    // Increment usage counter (best-effort; webhook should ideally do this on payment success)
    if (discountRecord) {
      await adminClient
        .from("discount_codes")
        .update({ current_uses: (discountRecord.current_uses ?? 0) + 1 })
        .eq("id", discountRecord.id);
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
