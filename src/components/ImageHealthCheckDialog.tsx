import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ScanSearch, Loader2, CheckCircle2, XCircle, AlertTriangle, ExternalLink, Trash2, ImageOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  image_url: string | null;
}

interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  position: number;
}

interface CheckResult {
  productId: string;
  productName: string;
  imageUrl: string;
  source: "principal" | "galeria";
  status: "ok" | "broken" | "slow";
  timeMs?: number;
}

interface IncompleteProduct {
  productId: string;
  productName: string;
  imageCount: number;
}

interface ImageHealthCheckDialogProps {
  products: Product[];
  productImages: ProductImage[];
  onEditProduct?: (productId: string) => void;
  onImagesRemoved?: () => void;
}

export function ImageHealthCheckDialog({ products, productImages, onEditProduct, onImagesRemoved }: ImageHealthCheckDialogProps) {
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [results, setResults] = useState<CheckResult[]>([]);
  const [incompleteProducts, setIncompleteProducts] = useState<IncompleteProduct[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const checkImage = (url: string): Promise<{ status: "ok" | "broken" | "slow"; timeMs: number }> => {
    return new Promise((resolve) => {
      const start = Date.now();
      const img = new Image();
      const timeout = setTimeout(() => {
        img.src = "";
        resolve({ status: "slow", timeMs: 10000 });
      }, 10000);

      img.onload = () => {
        clearTimeout(timeout);
        const timeMs = Date.now() - start;
        resolve({ status: timeMs > 5000 ? "slow" : "ok", timeMs });
      };
      img.onerror = () => {
        clearTimeout(timeout);
        resolve({ status: "broken", timeMs: Date.now() - start });
      };
      img.src = url;
    });
  };

  const runCheck = async () => {
    setChecking(true);
    setResults([]);
    setIncompleteProducts([]);

    const productMap = Object.fromEntries(products.map((p) => [p.id, p.name]));

    // Build list of all images to check
    const toCheck: { productId: string; productName: string; imageUrl: string; source: "principal" | "galeria" }[] = [];

    for (const p of products) {
      if (p.image_url) {
        toCheck.push({ productId: p.id, productName: p.name, imageUrl: p.image_url, source: "principal" });
      }
    }
    for (const img of productImages) {
      toCheck.push({
        productId: img.product_id,
        productName: productMap[img.product_id] || "Desconhecido",
        imageUrl: img.image_url,
        source: "galeria",
      });
    }

    setProgress({ done: 0, total: toCheck.length });

    // Check in batches of 5
    const allResults: CheckResult[] = [];
    for (let i = 0; i < toCheck.length; i += 5) {
      const batch = toCheck.slice(i, i + 5);
      const batchResults = await Promise.all(
        batch.map(async (item) => {
          const result = await checkImage(item.imageUrl);
          return { ...item, ...result };
        })
      );
      allResults.push(...batchResults);
      setResults([...allResults]);
      setProgress({ done: Math.min(i + 5, toCheck.length), total: toCheck.length });
    }

    // Detect products with fewer than 3 gallery images
    const imageCountByProduct: Record<string, number> = {};
    for (const img of productImages) {
      imageCountByProduct[img.product_id] = (imageCountByProduct[img.product_id] || 0) + 1;
    }
    const incomplete: IncompleteProduct[] = products
      .filter((p) => (imageCountByProduct[p.id] || 0) < 3)
      .map((p) => ({ productId: p.id, productName: p.name, imageCount: imageCountByProduct[p.id] || 0 }));
    setIncompleteProducts(incomplete);

    setChecking(false);
  };

  const handleRemoveAllBroken = async () => {
    if (!confirm(`Tens a certeza que queres remover ${broken.length} imagem(ns) quebrada(s)? Esta ação não pode ser revertida.`)) return;
    
    setRemoving(true);
    try {
      // Separate principal images and gallery images
      const principalBroken = broken.filter(r => r.source === "principal");
      const galleryBroken = broken.filter(r => r.source === "galeria");

      // Clear principal image_url (set to null)
      for (const item of principalBroken) {
        await supabase.from("products").update({ image_url: null }).eq("id", item.productId);
      }

      // Delete gallery images
      if (galleryBroken.length > 0) {
        const galleryUrls = galleryBroken.map(r => r.imageUrl);
        await supabase.from("product_images").delete().in("image_url", galleryUrls);
      }

      // Remove broken from results
      setResults(prev => prev.filter(r => r.status !== "broken"));
      toast.success(`${broken.length} imagem(ns) quebrada(s) removida(s) com sucesso`);
      onImagesRemoved?.();
    } catch (error) {
      toast.error("Erro ao remover imagens quebradas");
    } finally {
      setRemoving(false);
    }
  };

  const broken = results.filter((r) => r.status === "broken");
  const slow = results.filter((r) => r.status === "slow");
  const ok = results.filter((r) => r.status === "ok");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <ScanSearch className="h-4 w-4" />
          <span className="hidden sm:inline">Verificar Imagens</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanSearch className="h-5 w-5" />
            Verificação de Imagens
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!checking && results.length === 0 && (
            <div className="text-center py-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                Verifica se todas as imagens dos produtos estão acessíveis e funcionais.
              </p>
              <Button onClick={runCheck} className="gap-2">
                <ScanSearch className="h-4 w-4" />
                Iniciar Verificação
              </Button>
            </div>
          )}

          {checking && (
            <div className="text-center py-4 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">
                A verificar {progress.done} de {progress.total} imagens...
              </p>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {!checking && results.length > 0 && (
            <>
              {/* Summary */}
               <div className="flex gap-3 justify-center flex-wrap">
                <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  {ok.length} OK
                </Badge>
                <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  {slow.length} Lentas
                </Badge>
                <Badge variant={broken.length > 0 ? "destructive" : "outline"} className="gap-1.5 py-1.5 px-3">
                  <XCircle className="h-3.5 w-3.5" />
                  {broken.length} Quebradas
                </Badge>
                <Badge variant={incompleteProducts.length > 0 ? "secondary" : "outline"} className="gap-1.5 py-1.5 px-3">
                  <ImageOff className="h-3.5 w-3.5 text-blue-500" />
                  {incompleteProducts.length} Incompletas
                </Badge>
              </div>

              {/* Problem list */}
              {(broken.length > 0 || slow.length > 0) && (
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-2">
                    {[...broken, ...slow].map((r, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                        {r.status === "broken" ? (
                          <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0 space-y-1">
                          <button
                            className="text-sm font-medium truncate text-left hover:text-primary hover:underline transition-colors cursor-pointer"
                            onClick={() => {
                              if (onEditProduct) {
                                setOpen(false);
                                onEditProduct(r.productId);
                              }
                            }}
                          >
                            {r.productName}
                          </button>
                          <p className="text-xs text-muted-foreground">
                            {r.source === "principal" ? "Imagem principal" : "Galeria"} —{" "}
                            {r.status === "broken" ? "Inacessível" : `Lenta (${(r.timeMs! / 1000).toFixed(1)}s)`}
                          </p>
                          <a
                            href={r.imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline flex items-center gap-1 truncate"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            <span className="truncate">{r.imageUrl}</span>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              {/* Incomplete images list */}
              {incompleteProducts.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <ImageOff className="h-3.5 w-3.5 text-blue-500" />
                    Produtos com menos de 3 imagens na galeria
                  </p>
                  <ScrollArea className="max-h-[200px]">
                    <div className="space-y-1.5">
                      {incompleteProducts.map((p) => (
                        <div key={p.productId} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 border border-border">
                          <button
                            className="text-sm font-medium truncate text-left hover:text-primary hover:underline transition-colors cursor-pointer"
                            onClick={() => {
                              if (onEditProduct) {
                                setOpen(false);
                                onEditProduct(p.productId);
                              }
                            }}
                          >
                            {p.productName}
                          </button>
                          <Badge variant="outline" className="shrink-0 text-xs">
                            {p.imageCount}/3
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {broken.length === 0 && slow.length === 0 && incompleteProducts.length === 0 && (
                <div className="text-center py-4">
                  <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">Todas as imagens estão OK e completas!</p>
                </div>
              )}

              <div className="flex justify-center gap-2">
                {broken.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleRemoveAllBroken}
                    disabled={removing}
                    className="gap-1.5"
                  >
                    {removing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    Remover {broken.length} quebrada{broken.length !== 1 ? "s" : ""}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={runCheck} className="gap-1.5">
                  <ScanSearch className="h-3.5 w-3.5" />
                  Verificar novamente
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
