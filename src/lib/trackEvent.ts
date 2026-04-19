import { supabase } from "@/integrations/supabase/client";

export async function trackEvent(productId: string, eventType: "click" | "quote" | "catalog_view") {
  try {
    await supabase.from("product_analytics" as any).insert({ product_id: productId, event_type: eventType });
  } catch {
    // Silent fail — analytics should never break the app
  }
}
