import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, phone, message } = await req.json();

    if (!name || !email || !message) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios em falta" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const requestId = crypto.randomUUID();
    const data = {
      name: String(name),
      email: String(email),
      phone: phone ? String(phone) : "",
      message: String(message),
    };

    const { error: adminError } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "contact-admin",
        recipientEmail: "kilomat@gmail.com",
        idempotencyKey: `contact-admin-${requestId}`,
        templateData: data,
      },
    });
    if (adminError) throw adminError;

    const { error: customerError } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "contact-customer",
        recipientEmail: data.email,
        idempotencyKey: `contact-customer-${requestId}`,
        templateData: { name: data.name, message: data.message },
      },
    });
    if (customerError) console.error("Customer email failed:", customerError);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
