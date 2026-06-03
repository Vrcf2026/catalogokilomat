import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScanLine, Loader2, X } from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/browser";

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
    let activeStream: MediaStream | null = null;
    setError(null);
    setStarting(true);

    const reader = new BrowserMultiFormatReader();

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Câmara não suportada neste browser.");
        }
        if (!window.isSecureContext) {
          throw new Error("É necessário HTTPS para aceder à câmara.");
        }

        // Request camera FIRST (with rear preference) to trigger the permission prompt.
        // This also ensures device labels are populated on subsequent enumeration.
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        activeStream = stream;

        if (!videoRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        // Attach the stream directly so we keep the rear-camera selection.
        const controls = await reader.decodeFromStream(
          stream,
          videoRef.current,
          (result, _err, ctrl) => {
            if (cancelled) return;
            if (result) {
              const text = result.getText();
              ctrl.stop();
              activeStream?.getTracks().forEach((t) => t.stop());
              activeStream = null;
              controlsRef.current = null;
              setOpen(false);
              onDetected(text);
            }
          },
        );

        if (cancelled) {
          controls.stop();
          stream.getTracks().forEach((t) => t.stop());
        } else {
          controlsRef.current = {
            stop: () => {
              controls.stop();
              stream.getTracks().forEach((t) => t.stop());
            },
          };
          setStarting(false);
        }
      } catch (e: any) {
        console.error("Scanner error:", e);
        if (!cancelled) {
          const name = e?.name;
          setError(
            name === "NotAllowedError" || name === "SecurityError"
              ? "Permissão da câmara negada. Autorize o acesso nas definições do browser e tente novamente."
              : name === "NotFoundError" || name === "OverconstrainedError"
                ? "Nenhuma câmara disponível neste dispositivo."
                : name === "NotReadableError"
                  ? "A câmara está a ser usada por outra aplicação."
                  : e?.message || "Não foi possível aceder à câmara.",
          );
          setStarting(false);
          activeStream?.getTracks().forEach((t) => t.stop());
          activeStream = null;
        }
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
      activeStream?.getTracks().forEach((t) => t.stop());
      activeStream = null;
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