import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScanLine, Loader2, X, Keyboard, Zap, ZapOff, Camera, Focus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";

interface BarcodeScannerDialogProps {
  onDetected: (code: string) => void;
}

type BarcodeDetectorFormat = "ean_13" | "ean_8" | "upc_a" | "upc_e" | "code_128" | "code_39" | "itf" | "qr_code" | "data_matrix";
type DetectedBarcode = { rawValue?: string };
type BarcodeDetectorConstructor = {
  new (options: { formats: BarcodeDetectorFormat[] }): { detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]> };
  getSupportedFormats?: () => Promise<BarcodeDetectorFormat[]>;
};
type CameraCapabilities = MediaTrackCapabilities & {
  focusMode?: string[];
  torch?: boolean;
  zoom?: { min?: number; max?: number; step?: number };
  pointsOfInterest?: unknown;
};
type CameraSettings = MediaTrackSettings & { zoom?: number };
type AdvancedCameraConstraint = MediaTrackConstraintSet & {
  focusMode?: string;
  torch?: boolean;
  zoom?: number;
  pointsOfInterest?: { x: number; y: number }[];
};
type ImageCaptureCtor = new (track: MediaStreamTrack) => {
  takePhoto: (opts?: { imageHeight?: number; imageWidth?: number }) => Promise<Blob>;
  grabFrame: () => Promise<ImageBitmap>;
  getPhotoCapabilities?: () => Promise<{ imageHeight?: { max?: number }; imageWidth?: { max?: number } }>;
};

export function BarcodeScannerDialog({ onDetected }: BarcodeScannerDialogProps) {
  const [open, setOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [zoomCaps, setZoomCaps] = useState<{ min: number; max: number; step: number } | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [photoMaxDim, setPhotoMaxDim] = useState<{ w?: number; h?: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const nativeScanTimerRef = useRef<number | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  const stopNativeScan = () => {
    if (nativeScanTimerRef.current !== null) {
      window.clearTimeout(nativeScanTimerRef.current);
      nativeScanTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!open) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      return;
    }

    let cancelled = false;
    let detected = false;
    let activeStream: MediaStream | null = null;
    setError(null);
    setStarting(true);
    setTorchOn(false);
    setTorchAvailable(false);
    setZoom(1);
    setZoomCaps(null);
    setPhotoMaxDim(null);

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
    readerRef.current = reader;

    const finishWithCode = (text: string, ctrl?: { stop: () => void }) => {
      if (cancelled || detected) return;
      detected = true;
      stopNativeScan();
      ctrl?.stop();
      controlsRef.current?.stop();
      activeStream?.getTracks().forEach((t) => t.stop());
      activeStream = null;
      controlsRef.current = null;
      setOpen(false);
      onDetected(text);
    };

    const startNativeScanner = async () => {
      const BarcodeDetector = (window as Window & typeof globalThis & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
      if (!BarcodeDetector || !videoRef.current) return;
      try {
        const wantedFormats: BarcodeDetectorFormat[] = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "qr_code", "data_matrix"];
        const supported = typeof BarcodeDetector.getSupportedFormats === "function" ? await BarcodeDetector.getSupportedFormats() : wantedFormats;
        const formats = wantedFormats.filter((f) => supported.includes(f));
        if (!formats.length) return;
        const detector = new BarcodeDetector({ formats });
        const scan = async () => {
          if (cancelled || detected) return;
          try {
            const video = videoRef.current;
            if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
              const codes = await detector.detect(video);
              const value = codes?.find((c) => c?.rawValue)?.rawValue?.trim();
              if (value) {
                finishWithCode(value);
                return;
              }
            }
          } catch {
            // Keep ZXing fallback running if native detection fails on a frame.
          }
          nativeScanTimerRef.current = window.setTimeout(scan, 160);
        };
        scan();
      } catch {
        // Native BarcodeDetector is optional; ZXing continues as fallback.
      }
    };

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
            // @ts-expect-error - non-standard but widely supported
            focusMode: "continuous",
          },
          audio: false,
        });

        // Try to enable continuous autofocus and detect torch/zoom capabilities
        try {
          const track = stream.getVideoTracks()[0];
          trackRef.current = track;
          const caps = (track.getCapabilities?.() ?? {}) as CameraCapabilities;
          const advanced: AdvancedCameraConstraint[] = [];
          if (caps.focusMode?.includes?.("continuous")) advanced.push({ focusMode: "continuous" });
          if (advanced.length) await track.applyConstraints({ advanced } as MediaTrackConstraints);
          if (caps.torch) setTorchAvailable(true);
          if (typeof caps.zoom === "object" && caps.zoom) {
            setZoomCaps({ min: caps.zoom.min ?? 1, max: caps.zoom.max ?? 1, step: caps.zoom.step ?? 0.1 });
            const settings = (track.getSettings?.() ?? {}) as CameraSettings;
            if (settings.zoom) setZoom(settings.zoom);
          }
          try {
            const ICCtor = (window as unknown as { ImageCapture?: ImageCaptureCtor }).ImageCapture;
            if (ICCtor) {
              const ic = new ICCtor(track);
              const pc = await ic.getPhotoCapabilities?.();
              setPhotoMaxDim({ w: pc?.imageWidth?.max, h: pc?.imageHeight?.max });
            }
          } catch { /* ignore */ }
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
            if (cancelled || detected) return;
            if (result) {
              finishWithCode(result.getText(), ctrl);
            }
          },
        );

        if (cancelled) {
          controls.stop();
          stream.getTracks().forEach((t) => t.stop());
        } else {
          controlsRef.current = {
            stop: () => {
              stopNativeScan();
              controls.stop();
              stream.getTracks().forEach((t) => t.stop());
            },
          };
          startNativeScanner();
          setStarting(false);
        }
      } catch (e: unknown) {
        console.error("Scanner error:", e);
        if (!cancelled) {
          const name = e instanceof DOMException || e instanceof Error ? e.name : undefined;
          const message = e instanceof Error ? e.message : undefined;
          setError(
            name === "NotAllowedError" || name === "SecurityError"
              ? "Permissão da câmara negada. Autorize o acesso nas definições do browser e tente novamente."
              : name === "NotFoundError" || name === "OverconstrainedError"
                ? "Nenhuma câmara disponível neste dispositivo."
                : name === "NotReadableError"
                  ? "A câmara está a ser usada por outra aplicação."
                  : message || "Não foi possível aceder à câmara.",
          );
          setStarting(false);
          activeStream?.getTracks().forEach((t) => t.stop());
          activeStream = null;
        }
      }
    })();

    return () => {
      cancelled = true;
      stopNativeScan();
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
      await track.applyConstraints({ advanced: [{ torch: next } as AdvancedCameraConstraint] } as MediaTrackConstraints);
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
      await track.applyConstraints({ advanced: [{ zoom: clamped } as AdvancedCameraConstraint] } as MediaTrackConstraints);
      setZoom(clamped);
    } catch (e) {
      console.warn("Zoom apply failed", e);
    }
  };

  const triggerAutofocus = async (x?: number, y?: number) => {
    const track = trackRef.current;
    if (!track) return;
    const caps = (track.getCapabilities?.() ?? {}) as CameraCapabilities;
    const advanced: AdvancedCameraConstraint[] = [];
    try {
      if (caps.focusMode?.includes?.("single-shot")) {
        advanced.push({ focusMode: "single-shot" });
      } else if (caps.focusMode?.includes?.("manual")) {
        advanced.push({ focusMode: "manual" });
      }
      if (x !== undefined && y !== undefined && caps.pointsOfInterest) {
        advanced.push({ pointsOfInterest: [{ x, y }] });
      }
      if (advanced.length) await track.applyConstraints({ advanced } as MediaTrackConstraints);
      // Re-enable continuous after a beat so subsequent scans still focus
      window.setTimeout(() => {
        if (caps.focusMode?.includes?.("continuous")) {
          track.applyConstraints({ advanced: [{ focusMode: "continuous" } as AdvancedCameraConstraint] } as MediaTrackConstraints).catch(() => {});
        }
      }, 1200);
    } catch (e) {
      console.warn("Autofocus failed", e);
    }
  };

  const onVideoTap = (e: React.MouseEvent<HTMLVideoElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const rect = video.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    triggerAutofocus(x, y);
  };

  const captureAndDecode = async () => {
    const track = trackRef.current;
    const reader = readerRef.current;
    if (!track || capturing) return;
    setCapturing(true);
    setError(null);
    try {
      // Force a fresh autofocus, then wait briefly for it to settle.
      await triggerAutofocus();
      await new Promise((r) => setTimeout(r, 700));

      let bitmap: ImageBitmap | null = null;
      let blob: Blob | null = null;
      const ICCtor = (window as unknown as { ImageCapture?: ImageCaptureCtor }).ImageCapture;
      if (ICCtor) {
        try {
          const ic = new ICCtor(track);
          // Use takePhoto for max sensor resolution; fallback to grabFrame.
          try {
            blob = await ic.takePhoto(
              photoMaxDim?.w && photoMaxDim?.h ? { imageWidth: photoMaxDim.w, imageHeight: photoMaxDim.h } : undefined,
            );
          } catch {
            bitmap = await ic.grabFrame();
          }
        } catch {
          /* fallthrough */
        }
      }

      // Fallback: draw the current video frame.
      if (!bitmap && !blob && videoRef.current) {
        const v = videoRef.current;
        const c = document.createElement("canvas");
        c.width = v.videoWidth;
        c.height = v.videoHeight;
        c.getContext("2d")?.drawImage(v, 0, 0);
        blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/png"));
      }

      // 1) Try native BarcodeDetector on the captured image.
      const BD = (window as Window & typeof globalThis & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
      const wantedFormats: BarcodeDetectorFormat[] = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "qr_code", "data_matrix"];
      let source: CanvasImageSource | null = null;
      if (bitmap) source = bitmap;
      else if (blob) source = await createImageBitmap(blob);

      if (BD && source) {
        try {
          const supported = typeof BD.getSupportedFormats === "function" ? await BD.getSupportedFormats() : wantedFormats;
          const formats = wantedFormats.filter((f) => supported.includes(f));
          if (formats.length) {
            const det = new BD({ formats });
            const codes = await det.detect(source);
            const value = codes?.find((c) => c?.rawValue)?.rawValue?.trim();
            if (value) {
              setCapturing(false);
              setOpen(false);
              onDetected(value);
              return;
            }
          }
        } catch { /* fallthrough to ZXing */ }
      }

      // 2) ZXing on the captured image (high-res = much better than video frames).
      if (reader && (blob || bitmap)) {
        const url = blob ? URL.createObjectURL(blob) : null;
        try {
          const img = new Image();
          img.decoding = "async";
          if (url) {
            img.src = url;
          } else if (bitmap) {
            const c = document.createElement("canvas");
            c.width = bitmap.width;
            c.height = bitmap.height;
            c.getContext("2d")?.drawImage(bitmap, 0, 0);
            img.src = c.toDataURL("image/png");
          }
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("image load failed"));
          });
          const result = await reader.decodeFromImageElement(img);
          const text = result?.getText?.();
          if (text) {
            setCapturing(false);
            setOpen(false);
            onDetected(text);
            return;
          }
        } catch {
          // No code found in the still frame.
        } finally {
          if (url) URL.revokeObjectURL(url);
        }
      }

      setError("Não foi possível ler o código nesta foto. Ajuste o enquadramento, use zoom/lanterna e tente novamente.");
    } catch (e) {
      console.warn("Capture failed", e);
      setError("Falha ao capturar foto da câmara.");
    } finally {
      setCapturing(false);
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
            <video
              ref={videoRef}
              className="w-full h-full object-cover cursor-crosshair"
              autoPlay
              playsInline
              muted
              onClick={onVideoTap}
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="w-3/5 aspect-square border-2 border-primary/70 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="h-8 w-8"
                onClick={() => triggerAutofocus()}
                title="Focar"
              >
                <Focus className="h-4 w-4" />
              </Button>
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
            {starting && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
          </div>
          {zoomCaps && zoomCaps.max > zoomCaps.min && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-10">Zoom</span>
              <Slider
                value={[zoom]}
                min={zoomCaps.min}
                max={zoomCaps.max}
                step={zoomCaps.step || 0.1}
                onValueChange={(v) => applyZoom(v[0])}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-10 text-right">{zoom.toFixed(1)}x</span>
            </div>
          )}
          <Button
            type="button"
            size="sm"
            className="w-full gap-1.5"
            onClick={captureAndDecode}
            disabled={capturing || starting || !!error}
          >
            {capturing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            Capturar foto e ler
          </Button>
          {error ? (
            <p className="text-sm text-destructive text-center">{error}</p>
          ) : (
            <p className="text-xs text-muted-foreground text-center">
              Toque no vídeo para focar nesse ponto. Se a leitura automática falhar, use “Capturar foto e ler” para tirar uma fotografia em alta resolução e descodificar.
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