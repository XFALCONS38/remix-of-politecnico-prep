import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Create user with confirmed email
  const { data: user, error: createErr } = await supabase.auth.admin.createUser({
    email: "abc123@gmail.com",
    password: "1q2w3e4r5t",
    email_confirm: true,
  });

  if (createErr && !createErr.message.includes("already been registered")) {
    return new Response(JSON.stringify({ error: createErr.message }), { status: 400 });
  }

  // Get user id
  let userId = user?.user?.id;
  if (!userId) {
    const { data: list } = await supabase.auth.admin.listUsers();
    const found = list?.users?.find((u: any) => u.email === "abc123@gmail.com");
    userId = found?.id;
  }

  if (!userId) {
    return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
  }

  // Update profile with far-future access
  const { error: updateErr } = await supabase
    .from("profiles")
    .update({ access_expiry: "2030-01-01T00:00:00Z" })
    .eq("id", userId);

  return new Response(JSON.stringify({ ok: true, userId, updateErr }));
});
