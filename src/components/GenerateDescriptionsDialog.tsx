import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Sparkles, Loader2, CheckCircle2, XCircle, StopCircle } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
}

interface GenerateDescriptionsDialogProps {
  products: Product[];
}

const CHUNK_SIZE = 10;
const PAUSE_MS = 1500;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function GenerateDescriptionsDialog({ products }: GenerateDescriptionsDialogProps) {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [stopRequested, setStopRequested] = useState(false);
  const [done, setDone] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [success, setSuccess] = useState(0);
  const [errors, setErrors] = useState(0);
  const [currentName, setCurrentName] = useState<string>("");

  const missing = useMemo(
    () =>
      products.filter(
        (p) => !p.description || p.description.trim().length === 0
      ),
    [products]
  );

  const queryClient = useQueryClient();

  const handleStart = async () => {
    setRunning(true);
    setStopRequested(false);
    setDone(false);
    setProcessed(0);
    setSuccess(0);
    setErrors(0);

    const queue = [...missing];
    let localStop = false;

    for (let i = 0; i < queue.length; i += CHUNK_SIZE) {
      if (localStop) break;
      const chunk = queue.slice(i, i + CHUNK_SIZE);

      await Promise.all(
        chunk.map(async (p) => {
          setCurrentName(p.name);
          try {
            const { data, error } = await supabase.functions.invoke(
              "generate-description",
              { body: { productName: p.name, category: p.category } }
            );
            if (error) throw error;
            if (data?.description) {
              const { error: upErr } = await supabase
                .from("products")
                .update({ description: data.description })
                .eq("id", p.id);
              if (upErr) throw upErr;
              setSuccess((s) => s + 1);
            } else {
              setErrors((e) => e + 1);
            }
          } catch (err) {
            console.error("Description gen failed:", p.name, err);
            setErrors((e) => e + 1);
          } finally {
            setProcessed((n) => n + 1);
          }
        })
      );

      // Check stop flag using state ref via closure-safe pattern
      if (stopRequested) localStop = true;
      if (i + CHUNK_SIZE < queue.length && !localStop) await sleep(PAUSE_MS);
    }

    setRunning(false);
    setDone(true);
    setCurrentName("");
    queryClient.invalidateQueries({ queryKey: ["products"] });
    toast.success("Geração de descrições concluída");
  };

  const handleClose = (isOpen: boolean) => {
    if (running) return;
    setOpen(isOpen);
    if (!isOpen) {
      setDone(false);
      setProcessed(0);
      setSuccess(0);
      setErrors(0);
      setCurrentName("");
    }
  };

  const total = missing.length;
  const progress = total > 0 ? (processed / total) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Gerar Descrições
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Gerar Descrições por IA
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!running && !done && (
            <>
              <div className="rounded-lg border bg-secondary/40 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total de produtos</span>
                  <span className="font-medium">{products.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sem descrição</span>
                  <span className="font-bold text-primary">{total}</span>
                </div>
              </div>

              {total === 0 ? (
                <p className="text-sm text-center text-muted-foreground py-4">
                  ✅ Todos os produtos já têm descrição.
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    Processa {CHUNK_SIZE} produtos em paralelo, com pausa de{" "}
                    {PAUSE_MS / 1000}s entre lotes. Pode parar a qualquer momento.
                  </p>
                  <Button onClick={handleStart} className="w-full gap-2">
                    <Sparkles className="h-4 w-4" />
                    Gerar {total} descrições
                  </Button>
                </>
              )}
            </>
          )}

          {(running || done) && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground truncate">
                    {running ? currentName || "A processar..." : "Concluído"}
                  </span>
                  <span className="font-medium whitespace-nowrap ml-2">
                    {processed}/{total}
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 rounded-md border p-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>{success} OK</span>
                </div>
                <div className="flex items-center gap-2 rounded-md border p-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span>{errors} erro(s)</span>
                </div>
              </div>

              {running && (
                <Button
                  variant="outline"
                  onClick={() => setStopRequested(true)}
                  disabled={stopRequested}
                  className="w-full gap-2"
                >
                  {stopRequested ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      A terminar lote atual...
                    </>
                  ) : (
                    <>
                      <StopCircle className="h-4 w-4" />
                      Parar
                    </>
                  )}
                </Button>
              )}

              {done && (
                <Button
                  variant="outline"
                  onClick={() => handleClose(false)}
                  className="w-full"
                >
                  Fechar
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
