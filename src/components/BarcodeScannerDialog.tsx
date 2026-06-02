import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScanLine, Loader2, X } from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { toast } from "sonner";

interface BarcodeScannerDialogProps {
  onDetected: (code: string) => void;
}

export function BarcodeScannerDialog({ onDetected }: BarcodeScannerDialogProps) {
  const [open, setOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    if (!open) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      return;
    }

    let cancelled = false;
    setError(null);
    setStarting(true);

    const reader = new BrowserMultiFormatReader();

    (async () => {
      try {
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        // Prefer back camera
        const back = devices.find((d) => /back|rear|environment|traseira/i.test(d.label));
        const deviceId = back?.deviceId ?? devices[0]?.deviceId;

        if (!videoRef.current) return;

        const controls = await reader.decodeFromVideoDevice(
          deviceId ?? undefined,
          videoRef.current,
          (result, _err, ctrl) => {
            if (cancelled) return;
            if (result) {
              const text = result.getText();
              ctrl.stop();
              controlsRef.current = null;
              setOpen(false);
              onDetected(text);
            }
          },
        );
        if (cancelled) {
          controls.stop();
        } else {
          controlsRef.current = controls;
          setStarting(false);
        }
      } catch (e: any) {
        console.error("Scanner error:", e);
        if (!cancelled) {
          setError(
            e?.name === "NotAllowedError"
              ? "Permissão da câmara negada. Autorize o acesso e tente novamente."
              : "Não foi possível aceder à câmara.",
          );
          setStarting(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [open, onDetected]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5" title="Procurar produto por código de barras">
          <ScanLine className="h-4 w-4" />
          Scanner
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            Ler código de barras
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-3/4 h-1/3 border-2 border-primary/70 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
            {starting && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
          </div>
          {error ? (
            <p className="text-sm text-destructive text-center">{error}</p>
          ) : (
            <p className="text-xs text-muted-foreground text-center">
              Aponte a câmara para o código de barras do produto. A leitura é automática.
            </p>
          )}
          <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={() => setOpen(false)}>
            <X className="h-4 w-4" />
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}