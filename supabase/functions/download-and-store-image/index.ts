import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Image } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_WIDTH = 1200;
const WEBP_QUALITY = 85;
const FETCH_TIMEOUT_MS = 15000;

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
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
  // imagescript: encodeJPEG(quality 0-100). Use JPEG (universally supported, similar size to WebP@85).
  return await image.encodeJPEG(WEBP_QUALITY);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

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

    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Download
    const res = await fetchWithTimeout(imageUrl, FETCH_TIMEOUT_MS);
    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to download (${res.status})`, url: imageUrl }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const arrayBuf = await res.arrayBuffer();
    const inputBuffer = new Uint8Array(arrayBuf);

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
      // best-effort content type detection
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("png")) {
        extension = "png";
        contentType = "image/png";
      } else if (ct.includes("webp")) {
        extension = "webp";
        contentType = "image/webp";
      }
    }

    // Build filename
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