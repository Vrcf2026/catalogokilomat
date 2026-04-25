import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_WIDTH = 1200;
const WEBP_QUALITY = 85;
const FETCH_TIMEOUT_MS = 15000;
const MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024; // 25 MB hard cap

// ---------- Auth ----------
async function requireAdmin(req: Request): Promise<{ ok: true; userId: string } | { ok: false; response: Response }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }
  const supabaseAuth = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsErr } = await supabaseAuth.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims?.sub) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }
  const userId = claimsData.claims.sub;
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const [{ data: superRow }, { data: adminRow }] = await Promise.all([
    admin.from("user_roles").select("id").eq("user_id", userId).eq("role", "super_admin").maybeSingle(),
    admin.from("user_roles").select("id").eq("user_id", userId).eq("role", "admin").maybeSingle(),
  ]);
  if (!superRow && !adminRow) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }),
    };
  }
  return { ok: true, userId };
}

// ---------- SSRF protection ----------
function isPrivateIp(ip: string): boolean {
  // IPv4
  const ipv4 = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4) {
    const [a, b] = [parseInt(ipv4[1]), parseInt(ipv4[2])];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local + cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true; // multicast / reserved
    return false;
  }
  // IPv6 — block anything that looks loopback/link-local/unique-local
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (lower.startsWith("fe80")) return true;
  if (lower.startsWith("ff")) return true;
  return false;
}

async function assertPublicHttpUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Only http(s) URLs are allowed");
  }
  const host = parsed.hostname;
  // Block obvious local hostnames
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "metadata.google.internal"
  ) {
    throw new Error("Host not allowed");
  }
  // If the host is already an IP literal, validate directly
  if (/^[\d.]+$/.test(host) || host.includes(":")) {
    if (isPrivateIp(host)) throw new Error("Private IP not allowed");
    return parsed;
  }
  // Resolve DNS and validate every returned address (defends against DNS rebinding)
  try {
    const records = await Deno.resolveDns(host, "A").catch(() => [] as string[]);
    const records6 = await Deno.resolveDns(host, "AAAA").catch(() => [] as string[]);
    const all = [...records, ...records6];
    if (all.length === 0) throw new Error("DNS resolution failed");
    for (const ip of all) {
      if (isPrivateIp(ip)) throw new Error(`Resolves to private IP: ${ip}`);
    }
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "DNS check failed");
  }
  return parsed;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "manual", // prevent redirect-based SSRF bypass
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function processImage(buffer: Uint8Array): Promise<Uint8Array> {
  const image = await Image.decode(buffer);
  if (image.width > MAX_WIDTH) {
    const ratio = MAX_WIDTH / image.width;
    image.resize(MAX_WIDTH, Math.round(image.height * ratio));
  }
  return await image.encodeJPEG(WEBP_QUALITY);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // 1. Authenticate (admin only)
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const { imageUrl, sku, position = 0, productId } = await req.json();

    if (!imageUrl || typeof imageUrl !== "string") {
      return new Response(JSON.stringify({ error: "imageUrl is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip if already in our bucket
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    if (imageUrl.includes(`${supabaseUrl}/storage/v1/object/public/product-images/`)) {
      return new Response(JSON.stringify({ url: imageUrl, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. SSRF protection
    let safeUrl: URL;
    try {
      safeUrl = await assertPublicHttpUrl(imageUrl);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: `URL rejected: ${e instanceof Error ? e.message : String(e)}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 3. Download (no redirects)
    const res = await fetchWithTimeout(safeUrl.toString(), FETCH_TIMEOUT_MS);
    if (res.status >= 300 && res.status < 400) {
      return new Response(
        JSON.stringify({ error: "Redirects not allowed", url: imageUrl }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to download (${res.status})`, url: imageUrl }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Enforce content-type (must look like an image)
    const ctHeader = (res.headers.get("content-type") || "").toLowerCase();
    if (ctHeader && !ctHeader.startsWith("image/")) {
      return new Response(
        JSON.stringify({ error: `Not an image (content-type: ${ctHeader})` }),
        { status: 415, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Enforce size cap
    const contentLength = parseInt(res.headers.get("content-length") || "0", 10);
    if (contentLength > MAX_DOWNLOAD_BYTES) {
      return new Response(
        JSON.stringify({ error: `Image too large (${contentLength} bytes)` }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const arrayBuf = await res.arrayBuffer();
    const inputBuffer = new Uint8Array(arrayBuf);

    if (inputBuffer.length > MAX_DOWNLOAD_BYTES) {
      return new Response(JSON.stringify({ error: "Image too large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (inputBuffer.length < 100) {
      return new Response(JSON.stringify({ error: "Image too small / invalid" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Process (resize + compress)
    let outputBuffer: Uint8Array;
    let extension = "jpg";
    let contentType = "image/jpeg";
    try {
      outputBuffer = await processImage(inputBuffer);
    } catch (err) {
      console.error("Image processing failed, uploading original:", err);
      outputBuffer = inputBuffer;
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("png")) {
        extension = "png";
        contentType = "image/png";
      } else if (ct.includes("webp")) {
        extension = "webp";
        contentType = "image/webp";
      }
    }

    const safeSku = (sku || productId || crypto.randomUUID()).toString().replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `${safeSku}_${position}_${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(fileName, outputBuffer, {
        contentType,
        upsert: true,
        cacheControl: "31536000",
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ error: uploadError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: publicUrlData } = supabase.storage.from("product-images").getPublicUrl(fileName);

    return new Response(
      JSON.stringify({
        url: publicUrlData.publicUrl,
        size: outputBuffer.length,
        original_size: inputBuffer.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("Function error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
