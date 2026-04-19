import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Block private/internal IP ranges to prevent SSRF
function isPrivateIp(host: string): boolean {
  // Block common metadata/loopback hosts
  if (/^(localhost|127\.|0\.0\.0\.0|169\.254\.|metadata\.google)/i.test(host)) return true;
  // Block RFC1918 ranges
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  // Block IPv6 loopback/link-local
  if (host === "::1" || host.startsWith("fe80:") || host.startsWith("fc00:") || host.startsWith("fd00:")) return true;
  return false;
}

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg", "image/jpg", "image/png", "image/webp",
  "image/avif", "image/gif", "image/svg+xml", "image/apng", "image/bmp",
]);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const target = url.searchParams.get("url");

    if (!target) {
      return new Response("Missing url", { status: 400, headers: corsHeaders });
    }

    let targetUrl: URL;
    try {
      targetUrl = new URL(target);
    } catch {
      return new Response("Invalid URL", { status: 400, headers: corsHeaders });
    }

    if (!["http:", "https:"].includes(targetUrl.protocol)) {
      return new Response("Invalid protocol", { status: 400, headers: corsHeaders });
    }

    if (isPrivateIp(targetUrl.hostname)) {
      return new Response("Forbidden host", { status: 403, headers: corsHeaders });
    }

    // DNS rebinding protection: resolve hostname and verify no resolved IP is private.
    try {
      const records = await Promise.allSettled([
        Deno.resolveDns(targetUrl.hostname, "A"),
        Deno.resolveDns(targetUrl.hostname, "AAAA"),
      ]);
      const ips: string[] = [];
      for (const r of records) {
        if (r.status === "fulfilled") ips.push(...r.value);
      }
      if (ips.length === 0) {
        return new Response("DNS resolution failed", { status: 400, headers: corsHeaders });
      }
      if (ips.some((ip) => isPrivateIp(ip))) {
        return new Response("Forbidden host (resolved to private IP)", { status: 403, headers: corsHeaders });
      }
    } catch (e) {
      console.error("DNS resolution error", e);
      return new Response("DNS resolution failed", { status: 400, headers: corsHeaders });
    }

    const response = await fetch(targetUrl.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; LovableCatalogProxy/1.0)",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return new Response("Image fetch failed", { status: response.status, headers: corsHeaders });
    }

    const upstreamType = (response.headers.get("content-type") || "").toLowerCase().split(";")[0].trim();
    // Only forward known image content types — never HTML/JS/etc.
    const safeContentType = ALLOWED_CONTENT_TYPES.has(upstreamType) ? upstreamType : "image/jpeg";
    const cacheControl = response.headers.get("cache-control") || "public, max-age=86400";
    const body = await response.arrayBuffer();

    return new Response(body, {
      headers: {
        ...corsHeaders,
        "Content-Type": safeContentType,
        "Content-Security-Policy": "default-src 'none'; img-src 'self' data:;",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": cacheControl,
      },
    });
  } catch (error) {
    console.error("proxy-image error", error);
    return new Response("Proxy error", { status: 500, headers: corsHeaders });
  }
});
