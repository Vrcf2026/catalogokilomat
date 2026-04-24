import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImageIcon, Loader2, CheckCircle2, XCircle, ImageOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface Product {
  id: string;
  name: string;
  image_url: string | null;
}

interface ProductImage {
  product_id: string;
}

interface Props {
  products: Product[];
  productImages: ProductImage[];
}

type RowStatus = "pending" | "searching" | "done" | "skipped" | "error";

interface Row {
  id: string;
  name: string;
  status: RowStatus;
  found: number;
  error?: string;
}

export function BulkImageSearchDialog({ products, productImages }: Props) {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [stop, setStop] = useState(false);
  const [onlyEmpty, setOnlyEmpty] = useState(true);
  const [imagesPerProduct, setImagesPerProduct] = useState(3);
  const [rows, setRows] = useState<Row[]>([]);
  const [progress, setProgress] = useState(0);
  const queryClient = useQueryClient();

  const productImagesByProduct = useMemo(() => {
    const map: Record<string, number> = {};
    productImages.forEach((pi) => { map[pi.product_id] = (map[pi.product_id] || 0) + 1; });
    return map;
  }, [productImages]);

  const candidates = useMemo(() => {
    if (!onlyEmpty) return products;
    return products.filter((p) => !p.image_url && !productImagesByProduct[p.id]);
  }, [products, productImagesByProduct, onlyEmpty]);

  const start = async () => {
    if (candidates.length === 0) {
      toast.info("Não há produtos para processar.");
      return;
    }
    setRunning(true);
    setStop(false);
    setProgress(0);

    const initial: Row[] = candidates.map((p) => ({ id: p.id, name: p.name, status: "pending", found: 0 }));
    setRows(initial);

    let done = 0;
    let stopped = false;

    for (let i = 0; i < candidates.length; i++) {
      if (stop) { stopped = true; break; }
      const p = candidates[i];
      setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, status: "searching" } : r));

      try {
        const { data, error } = await supabase.functions.invoke("search-product-images", {
          body: { query: p.name, count: imagesPerProduct * 4 },
        });
        if (error) throw error;

        const images: string[] = (data?.images || []).slice(0, imagesPerProduct);

        if (images.length === 0) {
          setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, status: "skipped", found: 0 } : r));
        } else {
          // Save images: position 0..n
          const inserts = images.map((url, pos) => ({ product_id: p.id, image_url: url, position: pos }));
          const { error: insErr } = await (supabase as any).from("product_images").insert(inserts);
          if (insErr) throw insErr;

          // Update main image_url if empty
          if (!p.image_url) {
            await (supabase as any).from("products").update({ image_url: images[0] }).eq("id", p.id);
          }

          setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, status: "done", found: images.length } : r));
        }
      } catch (e: any) {
        setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, status: "error", error: e.message } : r));
      }

      done++;
      setProgress(Math.round((done / candidates.length) * 100));
      // Small delay to avoid hammering the search providers
      await new Promise((r) => setTimeout(r, 250));
    }

    setRunning(false);
    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["product_images"] });

    if (stopped) toast.info("Processo interrompido.");
    else toast.success("Busca de imagens concluída.");
  };

  const summary = useMemo(() => {
    const ok = rows.filter((r) => r.status === "done").length;
    const empty = rows.filter((r) => r.status === "skipped").length;
    const err = rows.filter((r) => r.status === "error").length;
    return { ok, empty, err };
  }, [rows]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!running) setOpen(v); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <ImageIcon className="h-4 w-4" />
          Buscar Imagens (Web)
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Buscar imagens em massa (Bing / DuckDuckGo)</DialogTitle>
          <DialogDescription>
            Procura imagens automaticamente na web para os produtos selecionados. Não usa créditos de IA.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2 rounded-md border p-3 bg-muted/30">
            <div className="flex items-center gap-2">
              <Checkbox id="only-empty" checked={onlyEmpty} onCheckedChange={(v) => setOnlyEmpty(!!v)} disabled={running} />
              <Label htmlFor="only-empty" className="text-sm cursor-pointer">
                Apenas produtos <strong>sem imagens</strong> ({products.filter((p) => !p.image_url && !productImagesByProduct[p.id]).length})
              </Label>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Label htmlFor="img-count">Imagens por produto:</Label>
              <select
                id="img-count"
                className="border rounded px-2 py-1 bg-background"
                value={imagesPerProduct}
                onChange={(e) => setImagesPerProduct(Number(e.target.value))}
                disabled={running}
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </div>
            <p className="text-xs text-muted-foreground">
              Total a processar: <strong>{candidates.length}</strong> produto(s).
              Estimativa: ~{Math.ceil(candidates.length * 1.5 / 60)} min.
            </p>
          </div>

          {running && (
            <div className="space-y-1">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground text-center">{progress}%</p>
            </div>
          )}

          {rows.length > 0 && (
            <ScrollArea className="h-64 rounded-md border">
              <div className="p-2 space-y-1">
                {rows.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 text-sm py-1 px-2 rounded hover:bg-muted/50">
                    <span className="flex-shrink-0">
                      {r.status === "pending" && <ImageOff className="h-4 w-4 text-muted-foreground" />}
                      {r.status === "searching" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                      {r.status === "done" && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                      {r.status === "skipped" && <ImageOff className="h-4 w-4 text-amber-600" />}
                      {r.status === "error" && <XCircle className="h-4 w-4 text-destructive" />}
                    </span>
                    <span className="flex-1 truncate">{r.name}</span>
                    {r.status === "done" && <span className="text-xs text-green-600">+{r.found}</span>}
                    {r.status === "skipped" && <span className="text-xs text-amber-600">sem resultados</span>}
                    {r.status === "error" && <span className="text-xs text-destructive truncate max-w-[150px]">{r.error}</span>}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {!running && rows.length > 0 && (
            <div className="flex gap-3 text-sm justify-center">
              <span className="text-green-600">✓ {summary.ok} com imagens</span>
              <span className="text-amber-600">○ {summary.empty} sem resultados</span>
              <span className="text-destructive">✕ {summary.err} erros</span>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            {running ? (
              <Button variant="destructive" onClick={() => setStop(true)}>Parar</Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
                <Button onClick={start} disabled={candidates.length === 0}>
                  Iniciar busca ({candidates.length})
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}