import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BASE_URL = "https://showroom.kilomat.pt";
const PAGE_SIZE = 1000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pageParam = url.searchParams.get("page");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const today = new Date().toISOString().split("T")[0];

  if (!pageParam) {
    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("include_in_catalog", true);

    const totalPages = Math.ceil((count || 0) / PAGE_SIZE);

    const staticUrls = [
      { loc: `${BASE_URL}/` },
      { loc: `${BASE_URL}/catalogos` },
      { loc: `${BASE_URL}/termos-condicoes` },
      { loc: `${BASE_URL}/politica-privacidade` },
      { loc: `${BASE_URL}/politica-cookies` },
    ];

    const staticXml = staticUrls.map((u) => `
  <sitemap>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`).join("");

    const productSitemaps = Array.from({ length: totalPages }, (_, i) => `
  <sitemap>
    <loc>${BASE_URL}/api/sitemap?page=${i + 1}</loc>
    <lastmod>${today}</lastmod>
  </sitemap>`).join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticXml}
${productSitemaps}
</sitemapindex>`;

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
      },
    });
  }

  const page = Math.max(0, parseInt(pageParam) - 1);
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: products } = await supabase
    .from("products")
    .select("slug, updated_at")
    .eq("include_in_catalog", true)
    .not("slug", "is", null)
    .order("created_at", { ascending: true })
    .range(from, to);

  const urls = (products || []).map((p: { slug: string; updated_at: string | null }) => `
  <url>
    <loc>${BASE_URL}/produto/${p.slug}</loc>
    <lastmod>${p.updated_at ? p.updated_at.split("T")[0] : today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
});