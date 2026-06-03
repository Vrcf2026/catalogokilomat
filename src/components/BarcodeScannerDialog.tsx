import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScanLine, Loader2, X, Keyboard, Zap, ZapOff, ZoomIn, ZoomOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";

interface BarcodeScannerDialogProps {
  onDetected: (code: string) => void;
}

export function BarcodeScannerDialog({ onDetected }: BarcodeScannerDialogProps) {
  const [open, setOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [zoomCaps, setZoomCaps] = useState<{ min: number; max: number; step: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);

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
    setTorchOn(false);
    setTorchAvailable(false);
    setZoom(1);
    setZoomCaps(null);

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.ITF,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.DATA_MATRIX,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 });

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
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 2560 },
            height: { ideal: 1440 },
            // @ts-ignore - non-standard but widely supported
            focusMode: "continuous",
          },
          audio: false,
        });

        // Try to enable continuous autofocus and detect torch/zoom capabilities
        try {
          const track = stream.getVideoTracks()[0];
          trackRef.current = track;
          const caps: any = track.getCapabilities?.() ?? {};
          const advanced: any[] = [];
          if (caps.focusMode?.includes?.("continuous")) advanced.push({ focusMode: "continuous" });
          if (advanced.length) await track.applyConstraints({ advanced } as any);
          if (caps.torch) setTorchAvailable(true);
          if (typeof caps.zoom === "object" && caps.zoom) {
            setZoomCaps({ min: caps.zoom.min ?? 1, max: caps.zoom.max ?? 1, step: caps.zoom.step ?? 0.1 });
            const settings: any = track.getSettings?.() ?? {};
            if (settings.zoom) setZoom(settings.zoom);
          }
        } catch {
          /* ignore */
        }

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
      trackRef.current = null;
    };
  }, [open, onDetected]);

  const toggleTorch = async () => {
    const track = trackRef.current;
    if (!track) return;
    try {
      const next = !torchOn;
      await track.applyConstraints({ advanced: [{ torch: next } as any] });
      setTorchOn(next);
    } catch (e) {
      console.warn("Torch toggle failed", e);
    }
  };

  const applyZoom = async (next: number) => {
    const track = trackRef.current;
    if (!track || !zoomCaps) return;
    const clamped = Math.min(zoomCaps.max, Math.max(zoomCaps.min, next));
    try {
      await track.applyConstraints({ advanced: [{ zoom: clamped } as any] });
      setZoom(clamped);
    } catch (e) {
      console.warn("Zoom apply failed", e);
    }
  };

  const submitManual = () => {
    const v = manual.trim();
    if (!v) return;
    setOpen(false);
    setManual("");
    onDetected(v);
  };

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
              <div className="w-3/5 aspect-square border-2 border-primary/70 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
            {(torchAvailable || zoomCaps) && (
              <div className="absolute bottom-2 right-2 flex items-center gap-1">
                {zoomCaps && zoomCaps.max > zoomCaps.min && (
                  <>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={() => applyZoom(zoom - (zoomCaps.step || 0.5))}
                      title="Diminuir zoom"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={() => applyZoom(zoom + (zoomCaps.step || 0.5))}
                      title="Aumentar zoom"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </>
                )}
                {torchAvailable && (
                  <Button
                    type="button"
                    size="icon"
                    variant={torchOn ? "default" : "secondary"}
                    className="h-8 w-8"
                    onClick={toggleTorch}
                    title={torchOn ? "Desligar lanterna" : "Ligar lanterna"}
                  >
                    {torchOn ? <ZapOff className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            )}
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
              Para códigos quadrados (QR/DataMatrix) use o zoom e a lanterna se necessário. Mantenha o código bem enquadrado e parado por 1–2 segundos.
            </p>
          )}
          <div className="flex items-center gap-2 pt-1">
            <Keyboard className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitManual();
              }}
              placeholder="Ou introduza o código manualmente"
              inputMode="numeric"
              className="h-9"
            />
            <Button size="sm" onClick={submitManual} disabled={!manual.trim()}>
              OK
            </Button>
          </div>
          <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={() => setOpen(false)}>
            <X className="h-4 w-4" />
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}