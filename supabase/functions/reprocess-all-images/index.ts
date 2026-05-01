import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { ok: false as const, status: 401 };
  const sb = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await sb.auth.getClaims(token);
  if (error || !data?.claims) return { ok: false as const, status: 401 };
  const userId = data.claims.sub;
  const { data: isAdmin } = await sb.rpc("has_role", { _user_id: userId, _role: "admin" });
  const { data: isSuper } = await sb.rpc("has_role", { _user_id: userId, _role: "super_admin" });
  if (!isAdmin && !isSuper) return { ok: false as const, status: 403 };
  return { ok: true as const, token };
}

type Product = {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  brand_id: string | null;
  family_id: string | null;
};

async function searchImagesForProduct(
  token: string,
  product: Product,
  brandName: string | null,
  familyName: string | null,
  allBrandNames: string[],
): Promise<string[]> {
  const brand = (brandName || "").trim();
  const excludeBrands = brand ? [] : allBrandNames;
  const res = await fetch(`${SUPABASE_URL}/functions/v1/search-product-images`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "apikey": ANON_KEY,
    },
    body: JSON.stringify({
      query: product.name,
      count: 6,
      brand,
      excludeBrands,
      category: product.category || undefined,
      family: familyName || undefined,
      sku: product.sku || undefined,
    }),
  });
  if (!res.ok) {
    console.warn("search failed for", product.id, res.status);
    return [];
  }
  const json = await res.json();
  const images: string[] = Array.isArray(json?.images) ? json.images : [];
  return images.slice(0, 3);
}

async function processBatch(token: string) {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: brands } = await admin.from("brands").select("id, name");
  const { data: families } = await admin.from("product_families").select("id, name");
  const brandById = new Map<string, string>((brands || []).map((b: any) => [b.id, b.name]));
  const familyById = new Map<string, string>((families || []).map((f: any) => [f.id, f.name]));
  const allBrandNames = (brands || []).map((b: any) => b.name);

  const { data: products, error: prodErr } = await admin
    .from("products")
    .select("id, name, sku, category, brand_id, family_id")
    .order("created_at", { ascending: true });

  if (prodErr) throw prodErr;
  const list: Product[] = products || [];

  console.log(`Reprocessing ${list.length} products...`);

  // Wipe ALL existing product_images first.
  const { error: delErr } = await admin.from("product_images").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (delErr) console.error("Failed to wipe product_images:", delErr);
  await admin.from("products").update({ image_url: null }).neq("id", "00000000-0000-0000-0000-000000000000");

  let ok = 0;
  let fail = 0;

  // Process sequentially (search function is heavy; avoid hammering Bing).
  for (const p of list) {
    try {
      const brandName = p.brand_id ? brandById.get(p.brand_id) || null : null;
      const familyName = p.family_id ? familyById.get(p.family_id) || null : null;
      const urls = await searchImagesForProduct(token, p, brandName, familyName, allBrandNames);
      if (urls.length > 0) {
        const rows = urls.map((url, i) => ({ product_id: p.id, image_url: url, position: i }));
        await admin.from("product_images").insert(rows);
        await admin.from("products").update({ image_url: urls[0] }).eq("id", p.id);
        ok++;
      } else {
        fail++;
      }
    } catch (e) {
      console.error("Error on product", p.id, e);
      fail++;
    }
  }

  console.log(`Done. ok=${ok} fail=${fail}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: auth.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Run in background — return immediately.
  // @ts-ignore EdgeRuntime is available in Supabase Edge Functions.
  EdgeRuntime.waitUntil(processBatch(auth.token));

  return new Response(
    JSON.stringify({ started: true, message: "Reprocessamento iniciado em background. Pode demorar vários minutos." }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});