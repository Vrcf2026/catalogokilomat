import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { ok: false as const, status: 401 };
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await sb.auth.getClaims(token);
  if (error || !data?.claims) return { ok: false as const, status: 401 };
  const userId = data.claims.sub;
  const { data: isAdmin } = await sb.rpc("has_role", { _user_id: userId, _role: "admin" });
  const { data: isSuper } = await sb.rpc("has_role", { _user_id: userId, _role: "super_admin" });
  if (!isAdmin && !isSuper) return { ok: false as const, status: 403 };
  return { ok: true as const };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const blockedDomains = new Set(["supabase.co", "lovable.app", "lovableproject.com", "google.com", "gstatic.com"]);

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeQuery(query: string) {
  return normalizeText(query)
    .split(" ")
    .filter((token) => token.length >= 3);
}

function isBlockedHost(hostname: string) {
  const host = hostname.toLowerCase();
  return [...blockedDomains].some((blocked) => host === blocked || host.endsWith(`.${blocked}`));
}

function isValidCandidate(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    if (!["http:", "https:"].includes(url.protocol)) return false;
    if (isBlockedHost(url.hostname)) return false;

    const lower = `${url.pathname}${url.search}`.toLowerCase();
    const looksLikeImage =
      /\.(jpg|jpeg|png|webp|avif|gif|bmp|svg)(\?|$)/i.test(lower) ||
      lower.includes("image") ||
      lower.includes("img") ||
      lower.includes("photo") ||
      lower.includes("media");

    return looksLikeImage;
  } catch {
    return false;
  }
}

function scoreCandidate(url: string, tokens: string[]) {
  const normalized = normalizeText(url);
  let score = 0;

  for (const token of tokens) {
    if (normalized.includes(token)) score += 3;
  }

  if (/\.(png|jpg|jpeg|webp|avif)(\?|$)/i.test(url)) score += 2;
  if (normalized.includes("product")) score += 2;
  if (normalized.includes("catalog") || normalized.includes("datasheet") || normalized.includes("spec")) score += 1;

  const negativeTerms = ["logo", "icon", "avatar", "banner", "background", "news", "blog", "person", "event"];
  for (const term of negativeTerms) {
    if (normalized.includes(term)) score -= 2;
  }

  return score;
}

function dedupe(urls: string[]) {
  return Array.from(new Set(urls));
}

async function fetchBingCandidates(searchQuery: string): Promise<string[]> {
  try {
    const response = await fetch(
      `https://www.bing.com/images/search?q=${encodeURIComponent(searchQuery)}&form=HDRSC3&first=1&count=100&adlt=off`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "pt-PT,pt;q=0.9,en;q=0.8",
        },
      },
    );

    const html = await response.text();
    const urls: string[] = [];

    // Encoded payload format
    const encodedRegex = /murl&quot;:&quot;(https?:\/\/[^"&]+(?:jpg|jpeg|png|webp|avif|gif|bmp|svg)[^"&]*)&quot;/gi;
    let match: RegExpExecArray | null;
    while ((match = encodedRegex.exec(html)) !== null) {
      const url = match[1].replace(/&amp;/g, "&");
      if (isValidCandidate(url)) urls.push(url);
    }

    // Decoded JSON-like payload in attributes
    const decoded = html.replace(/\\\//g, "/");
    const murlRegex = /"murl":"(https?:\/\/[^\"]+)"/gi;
    while ((match = murlRegex.exec(decoded)) !== null) {
      const url = match[1].replace(/\\u003d/g, "=").replace(/\\u0026/g, "&");
      if (isValidCandidate(url)) urls.push(url);
    }

    return dedupe(urls);
  } catch (error) {
    console.error("Bing search error:", error);
    return [];
  }
}

async function fetchDuckCandidates(searchQuery: string): Promise<string[]> {
  try {
    const tokenResp = await fetch(
      `https://duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&iax=images&ia=images`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          "Accept": "text/html",
        },
      },
    );

    const tokenHtml = await tokenResp.text();
    const vqdMatch = tokenHtml.match(/vqd=["']([^"']+)["']/) || tokenHtml.match(/vqd=([\d-]+)/);
    const vqd = vqdMatch?.[1];
    if (!vqd) return [];

    const imgResp = await fetch(
      `https://duckduckgo.com/i.js?q=${encodeURIComponent(searchQuery)}&o=json&p=1&s=0&u=bing&f=,,,,,&l=pt-pt&vqd=${vqd}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Referer: "https://duckduckgo.com/",
        },
      },
    );

    if (!imgResp.ok) return [];

    const data = await imgResp.json();
    const urls: string[] = [];
    if (Array.isArray(data.results)) {
      for (const result of data.results) {
        const imageUrl = result?.image;
        if (typeof imageUrl === "string" && isValidCandidate(imageUrl)) {
          urls.push(imageUrl);
        }
      }
    }

    return dedupe(urls);
  } catch (error) {
    console.error("DuckDuckGo search error:", error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAdmin(req);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: "Unauthorized", images: [] }), {
      status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { query, count = 12 } = await req.json();
    if (!query?.trim()) throw new Error("Query is required");

    const requestedCount = Math.min(Math.max(Number(count) || 12, 1), 30);
    const cleanQuery = query.trim();
    const tokens = tokenizeQuery(cleanQuery);

    const queryVariants = dedupe([
      `"${cleanQuery}" product`,
      cleanQuery,
      `${cleanQuery} produto`,
      `${cleanQuery} product image`,
      `${cleanQuery} official`,
    ]);

    console.log("Searching images for:", cleanQuery);

    let candidates: string[] = [];

    for (const variant of queryVariants) {
      const bingResults = await fetchBingCandidates(variant);
      candidates = dedupe([...candidates, ...bingResults]);
      if (candidates.length >= requestedCount * 3) break;
    }

    if (candidates.length < requestedCount) {
      for (const variant of [cleanQuery, `${cleanQuery} product`]) {
        const duckResults = await fetchDuckCandidates(variant);
        candidates = dedupe([...candidates, ...duckResults]);
        if (candidates.length >= requestedCount * 3) break;
      }
    }

    const ranked = candidates
      .map((url) => ({ url, score: scoreCandidate(url, tokens) }))
      .sort((a, b) => b.score - a.score)
      .map((item) => item.url);

    const images = ranked.slice(0, requestedCount);

    console.log(`Total: ${images.length} images`);
    return new Response(JSON.stringify({ images }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Search error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Search failed", images: [] }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
