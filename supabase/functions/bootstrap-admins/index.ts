import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPER_ADMIN_EMAIL = "vrcf.loja@gmail.com";

const ADMINS_TO_CREATE = [
  { email: "vrcf.infseg@outlook.pt", password: "vrcf2025" },
  { email: "vrcf@outlook.pt", password: "vrcf2025" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Missing auth token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (userData.user.email !== SUPER_ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: "Forbidden: super-admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const results: Array<Record<string, unknown>> = [];

    for (const a of ADMINS_TO_CREATE) {
      try {
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email: a.email,
          password: a.password,
          email_confirm: true,
        });

        let userId = created?.user?.id;

        if (createErr) {
          // If already exists, find user via listUsers
          const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
          const existing = list?.users.find((u) => u.email?.toLowerCase() === a.email.toLowerCase());
          if (!existing) {
            results.push({ email: a.email, status: "error", error: createErr.message });
            continue;
          }
          userId = existing.id;
          results.push({ email: a.email, status: "already_existed", userId });
        } else {
          results.push({ email: a.email, status: "created", userId });
        }

        if (userId) {
          const { error: roleErr } = await admin
            .from("user_roles")
            .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
          if (roleErr) {
            results[results.length - 1].roleError = roleErr.message;
          } else {
            results[results.length - 1].role = "admin";
          }
        }
      } catch (e) {
        results.push({ email: a.email, status: "error", error: String(e) });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});