import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { CloudDownload, Loader2, Pause, Play, X } from "lucide-react";

const BATCH_SIZE = 5;
const DELAY_BETWEEN_MS_MIN = 300;
const DELAY_BETWEEN_MS_MAX = 800;
const LONG_PAUSE_EVERY = 50;
const LONG_PAUSE_MS = 10_000;

interface ImageRow {
  id: string;
  product_id: string;
  image_url: string;
  position: number;
}

export function MigrateImagesDialog() {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [total, setTotal] = useState(0);
  const [done, setDone] = useState(0);
  const [success, setSuccess] = useState(0);
  const [errors, setErrors] = useState(0);
  const [savedKB, setSavedKB] = useState(0);
  const [currentItem, setCurrentItem] = useState("");
  const [pauseInfo, setPauseInfo] = useState("");
  const queryClient = useQueryClient();

  const isExternal = (url: string) => {
    if (!url || !url.startsWith("http")) return false;
    const supabaseHost = new URL(import.meta.env.VITE_SUPABASE_URL || "https://x.supabase.co").host;
    try {
      return new URL(url).host !== supabaseHost;
    } catch {
      return false;
    }
  };

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const start = async () => {
    setRunning(true);
    setStopped(false);
    setPaused(false);
    setDone(0);
    setSuccess(0);
    setErrors(0);
    setSavedKB(0);
    setPauseInfo("");

    // Fetch all product_images and products with image_url that are external
    const { data: imgRows } = await supabase
      .from("product_images")
      .select("id, product_id, image_url, position");

    const { data: products } = await supabase
      .from("products")
      .select("id, sku, image_url");

    const productMap = new Map<string, { sku: string | null; image_url: string | null }>();
    (products || []).forEach((p) => productMap.set(p.id, { sku: p.sku, image_url: p.image_url }));

    const externalImages: (ImageRow & { sku: string | null })[] = (imgRows || [])
      .filter((r) => isExternal(r.image_url))
      .map((r) => ({ ...r, sku: productMap.get(r.product_id)?.sku || null }));

    setTotal(externalImages.length);

    if (externalImages.length === 0) {
      toast.success("Todas as imagens já estão guardadas localmente!");
      setRunning(false);
      return;
    }

    let okCount = 0;
    let errCount = 0;
    let totalSaved = 0;

    for (let i = 0; i < externalImages.length; i++) {
      if (stopped) break;
      while (paused && !stopped) await sleep(500);
      if (stopped) break;

      const img = externalImages[i];
      setCurrentItem(`${img.sku || img.product_id.slice(0, 8)} #${img.position}`);

      try {
        const { data, error } = await supabase.functions.invoke("download-and-store-image", {
          body: {
            imageUrl: img.image_url,
            sku: img.sku || img.product_id,
            position: img.position,
            productId: img.product_id,
          },
        });

        if (error || !data?.url) throw error || new Error("No URL returned");

        if (data.url !== img.image_url) {
          await supabase.from("product_images").update({ image_url: data.url }).eq("id", img.id);

          // Also update products.image_url if this was the primary
          const prod = productMap.get(img.product_id);
          if (prod && prod.image_url === img.image_url) {
            await supabase.from("products").update({ image_url: data.url }).eq("id", img.product_id);
          }

          if (data.original_size && data.size) {
            totalSaved += Math.max(0, data.original_size - data.size);
          }
        }
        okCount++;
        setSuccess(okCount);
        setSavedKB(Math.round(totalSaved / 1024));
      } catch (e) {
        console.error("Migration error for", img.id, e);
        errCount++;
        setErrors(errCount);
      }

      setDone(i + 1);

      // Random delay
      const delay = DELAY_BETWEEN_MS_MIN + Math.random() * (DELAY_BETWEEN_MS_MAX - DELAY_BETWEEN_MS_MIN);
      await sleep(delay);

      // Long pause every N
      if ((i + 1) % LONG_PAUSE_EVERY === 0 && i + 1 < externalImages.length) {
        setPauseInfo(`Pausa de ${LONG_PAUSE_MS / 1000}s para evitar sobrecarga...`);
        await sleep(LONG_PAUSE_MS);
        setPauseInfo("");
      }
    }

    setRunning(false);
    setCurrentItem("");
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["product_images"] });

    if (stopped) {
      toast.info(`Migração interrompida: ${okCount} migradas, ${errCount} erros`);
    } else {
      toast.success(`Concluído! ${okCount} migradas, ${errCount} erros, ~${Math.round(totalSaved / 1024 / 1024)}MB poupados`);
    }
  };

  const progress = total > 0 ? (done / total) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!running) setOpen(o); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CloudDownload className="h-4 w-4" />
          Migrar imagens externas
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Migrar imagens para armazenamento local</DialogTitle>
          <DialogDescription>
            Descarrega imagens de URLs externas (Bing, DuckDuckGo, etc.), comprime para JPEG q85 e guarda no Cloud Storage.
            Evita links quebrados e melhora a velocidade.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!running && total === 0 && (
            <Button onClick={start} className="w-full gap-2">
              <Play className="h-4 w-4" />
              Iniciar migração
            </Button>
          )}

          {(running || total > 0) && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{done} / {total}</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-md bg-muted p-2">
                  <div className="text-lg font-semibold text-green-600">{success}</div>
                  <div className="text-muted-foreground">Sucesso</div>
                </div>
                <div className="rounded-md bg-muted p-2">
                  <div className="text-lg font-semibold text-destructive">{errors}</div>
                  <div className="text-muted-foreground">Erros</div>
                </div>
                <div className="rounded-md bg-muted p-2">
                  <div className="text-lg font-semibold">{Math.round(savedKB / 1024)}MB</div>
                  <div className="text-muted-foreground">Poupados</div>
                </div>
              </div>

              {currentItem && (
                <p className="text-xs text-muted-foreground text-center truncate">
                  A processar: <span className="font-mono">{currentItem}</span>
                </p>
              )}

              {pauseInfo && (
                <p className="text-xs text-amber-600 text-center">{pauseInfo}</p>
              )}

              {running && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPaused(!paused)} className="flex-1 gap-2">
                    {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                    {paused ? "Retomar" : "Pausar"}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setStopped(true)} className="flex-1 gap-2">
                    <X className="h-3 w-3" />
                    Parar
                  </Button>
                </div>
              )}

              {!running && done > 0 && (
                <Button variant="outline" onClick={() => { setDone(0); setTotal(0); }} className="w-full">
                  Fechar
                </Button>
              )}
            </>
          )}

          {running && done === 0 && (
            <div className="flex items-center justify-center py-4 text-sm text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              A preparar lista...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}