// Runs before `vite build` (prebuild hook); writes public/sitemap.xml
// with all kilomat URLs (static + dynamic product pages).

import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://showroom.kilomat.pt";
const SUPABASE_URL = "https://cyuvtugxjfblpgabhfvb.supabase.co";
const SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5dXZ0dWd4amZibHBnYWJoZnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MjU5ODIsImV4cCI6MjA5MjIwMTk4Mn0.Ffd6e9zZXpaIX1V1qcYfxdZ_92QkVdZN1PX9LkTJ2YA";

const STATIC_PATHS = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/catalogos", priority: "0.7", changefreq: "weekly" },
  { path: "/catalogos/destaques", priority: "0.6", changefreq: "weekly" },
  { path: "/catalogos/kilomat", priority: "0.6", changefreq: "weekly" },
  { path: "/termos-e-condicoes", priority: "0.3", changefreq: "yearly" },
  { path: "/politica-de-privacidade", priority: "0.3", changefreq: "yearly" },
  { path: "/politica-de-cookies", priority: "0.3", changefreq: "yearly" },
];

interface Product { slug: string; updated_at: string | null }

async function fetchAllProducts(): Promise<Product[]> {
  const PAGE = 1000;
  let from = 0;
  const all: Product[] = [];
  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/products?select=slug,updated_at&slug=not.is.null&order=created_at.asc&offset=${from}&limit=${PAGE}`;
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON,
        Authorization: `Bearer ${SUPABASE_ANON}`,
      },
    });
    if (!res.ok) throw new Error(`Failed fetch products: ${res.status}`);
    const rows = (await res.json()) as Product[];
    all.push(...rows);
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

function urlTag(loc: string, lastmod: string, changefreq: string, priority: string) {
  return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

async function main() {
  const today = new Date().toISOString().split("T")[0];
  const staticUrls = STATIC_PATHS.map((e) =>
    urlTag(`${BASE_URL}${e.path}`, today, e.changefreq, e.priority),
  );

  let products: Product[] = [];
  try {
    products = await fetchAllProducts();
  } catch (e) {
    console.warn("[sitemap] product fetch failed, writing static-only sitemap:", e);
  }

  const productUrls = products.map((p) =>
    urlTag(
      `${BASE_URL}/produto/${p.slug}`,
      p.updated_at ? p.updated_at.split("T")[0] : today,
      "monthly",
      "0.6",
    ),
  );

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...staticUrls,
    ...productUrls,
    `</urlset>`,
  ].join("\n");

  writeFileSync(resolve("public/sitemap.xml"), xml);
  console.log(`[sitemap] wrote ${staticUrls.length + productUrls.length} URLs`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});