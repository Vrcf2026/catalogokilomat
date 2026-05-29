import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function invokeTransactionalEmail(payload: Record<string, unknown>) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Configuração de email incompleta no servidor");
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data, error } = await supabase.functions.invoke("send-transactional-email", {
    body: payload,
  });

  if (error) {
    const message = (error as any)?.message || "Falha ao enviar email";
    throw new Error(message);
  }

  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerName, customerEmail, customerPhone, notes, items, sendCopyToCustomer } = await req.json();

    if (!customerName || !customerEmail || !Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios em falta" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const nameStr = String(customerName).trim();
    const emailStr = String(customerEmail).trim();
    const phoneStr = String(customerPhone ?? "").trim();
    const notesStr = notes ? String(notes).trim() : "";
    if (
      nameStr.length > 200 ||
      emailStr.length > 255 ||
      phoneStr.length > 30 ||
      notesStr.length > 2000 ||
      items.length > 200 ||
      !EMAIL_RE.test(emailStr)
    ) {
      return new Response(JSON.stringify({ error: "Dados inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requestId = crypto.randomUUID();
    const safeItems = (items as any[]).map((i) => ({
      name: String(i.name ?? ""),
      sku: i.sku ? String(i.sku) : undefined,
      category: i.category ? String(i.category) : undefined,
      quantity: Number(i.quantity) || 0,
      price: i.price != null ? Number(i.price) : null,
    }));

    await invokeTransactionalEmail({
      templateName: "quote-request-admin",
      recipientEmail: "info@kilomat.pt",
      idempotencyKey: `quote-admin-${requestId}`,
      templateData: {
        customerName: String(customerName),
        customerEmail: String(customerEmail),
        customerPhone: String(customerPhone ?? ""),
        notes: notes ? String(notes) : "",
        items: safeItems,
      },
    });

    if (sendCopyToCustomer && customerEmail) {
      await invokeTransactionalEmail({
        templateName: "quote-request-customer",
        recipientEmail: String(customerEmail),
        idempotencyKey: `quote-customer-${requestId}`,
        templateData: {
          customerName: String(customerName),
          notes: notes ? String(notes) : "",
          items: safeItems,
        },
      });
    }

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
