import { useState, useMemo, useRef, useCallback, forwardRef, useEffect } from "react";
import HTMLFlipBook from "react-pageflip";
import {
  ChevronLeft,
  Maximize,
  Minimize,
  ZoomIn,
  ZoomOut,
  Grid3X3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCatalogBookLayout } from "@/lib/catalogBookLayout";
import vrcfLogo from "@/assets/vrcf-logo.png";

const TOTAL_PAGES = 16;
const PAGE_URLS = Array.from({ length: TOTAL_PAGES }, (_, i) =>
  `/kilomat-catalog/page-${String(i + 1).padStart(2, "0")}.png`
);

const FlipPage = forwardRef<HTMLDivElement, { children: React.ReactNode }>(
  ({ children }, ref) => (
    <div ref={ref} className="h-full w-full overflow-hidden shadow-lg" style={{ backgroundColor: "#1a1a1a" }}>
      {children}
    </div>
  )
);
FlipPage.displayName = "FlipPage";

interface KilomatCatalogViewerProps {
  onBack: () => void;
}

export function KilomatCatalogViewer({ onBack }: KilomatCatalogViewerProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [barsVisible, setBarsVisible] = useState(true);
  const [viewportSize, setViewportSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bookRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => {
      setViewportSize({ w: window.innerWidth, h: window.innerHeight });
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const bookDimensions = useMemo(() => getCatalogBookLayout(viewportSize), [viewportSize]);

  const showBars = useCallback(() => {
    setBarsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setBarsVisible(false), 3000);
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    showBars();
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, [showBars]);

  const onFlip = useCallback((e: any) => setCurrentPage(e.data), []);

  const flipTo = (page: number) => {
    if (bookRef.current) bookRef.current.pageFlip().flip(page);
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement && containerRef.current) {
      await containerRef.current.requestFullscreen();
    } else if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  };

  const accent = "#2d6a2e";

  return (
    <div
      ref={containerRef}
      className="h-screen flex flex-col relative overflow-hidden"
      style={{ backgroundColor: "#1a2e1a" }}
      onTouchStart={showBars}
    >
      {/* Top bar */}
      <div
        className={`absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-2 bg-black/50 backdrop-blur-md z-50 transition-all duration-500 ${
          barsVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        }`}
        onMouseEnter={() => { setBarsVisible(true); if (hideTimerRef.current) clearTimeout(hideTimerRef.current); }}
        onMouseLeave={() => { hideTimerRef.current = setTimeout(() => setBarsVisible(false), 1500); }}
      >
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors">
          <ChevronLeft className="h-4 w-4" /> Voltar
        </button>
        <div className="flex items-center gap-2">
          <img src={vrcfLogo} alt="VRCF" className="h-10 w-10 object-contain" />
          <span className="font-heading font-bold text-white/90 text-sm">Kilomat</span>
        </div>
        <Button variant="ghost" size="sm" className="text-white/60 hover:text-white hover:bg-white/10 gap-1.5" onClick={toggleFullscreen}>
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          <span className="hidden sm:inline text-xs">{isFullscreen ? "Sair" : "Ecrã inteiro"}</span>
        </Button>
      </div>

      {/* Top hover zone */}
      <div className="absolute top-0 left-0 right-0 h-12 z-40" onMouseEnter={showBars} />

      {/* Flipbook area */}
      <div
        className="absolute inset-0 flex items-center justify-center overflow-hidden p-4"
        style={{ transform: `scale(${zoom / 100})`, transformOrigin: "center center" }}
      >
        {/* Thumbnails panel */}
        {showThumbnails && (
          <div className="absolute left-0 top-0 bottom-0 w-48 bg-black/80 backdrop-blur-md z-40 overflow-y-auto p-3 space-y-2">
            {PAGE_URLS.map((url, i) => (
              <button
                key={i}
                onClick={() => { flipTo(i); setShowThumbnails(false); }}
                className={`w-full rounded-md overflow-hidden border-2 transition-all ${currentPage === i ? "border-green-500" : "border-transparent hover:border-white/30"}`}
              >
                <img src={url} alt={`Página ${i + 1}`} className="w-full aspect-[210/297] object-cover" loading="lazy" />
                <div className="bg-black/60 text-white text-[10px] text-center py-0.5">
                  {i === 0 ? "Capa" : i === TOTAL_PAGES - 1 ? "Contracapa" : `Pág. ${i}`}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* @ts-ignore */}
        <HTMLFlipBook
          ref={bookRef}
          key={`${bookDimensions.width}-${bookDimensions.height}-${bookDimensions.singlePage ? "single" : "spread"}`}
          width={bookDimensions.width}
          height={bookDimensions.height}
          size="fixed"
          minWidth={bookDimensions.minWidth}
          maxWidth={bookDimensions.maxWidth}
          minHeight={bookDimensions.minHeight}
          maxHeight={bookDimensions.maxHeight}
          showCover={true}
          mobileScrollSupport={true}
          onFlip={onFlip}
          className=""
          style={{ margin: "0 auto" }}
          startPage={0}
          drawShadow={true}
          flippingTime={650}
          usePortrait={bookDimensions.singlePage}
          startZIndex={0}
          autoSize={false}
          maxShadowOpacity={0.4}
          showPageCorners={true}
          disableFlipByClick={false}
          useMouseEvents={true}
          swipeDistance={30}
          clickEventForward={true}
          renderOnlyPageLengthChange={false}
        >
          {PAGE_URLS.map((url, i) => (
            <FlipPage key={i}>
              <img
                src={url}
                alt={`Kilomat - Página ${i + 1}`}
                className="w-full h-full object-contain"
                loading={i < 4 ? "eager" : "lazy"}
              />
            </FlipPage>
          ))}
        </HTMLFlipBook>
      </div>

      {/* Bottom bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-2 bg-black/50 backdrop-blur-md z-50 transition-all duration-500 ${
          barsVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        }`}
        onMouseEnter={() => { setBarsVisible(true); if (hideTimerRef.current) clearTimeout(hideTimerRef.current); }}
        onMouseLeave={() => { hideTimerRef.current = setTimeout(() => setBarsVisible(false), 1500); }}
      >
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10" onClick={() => setShowThumbnails(!showThumbnails)}>
            <Grid3X3 className="h-4 w-4" />
          </Button>
        </div>

        {/* Page navigation */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10" onClick={() => bookRef.current?.pageFlip().flipPrev()}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-white/70 text-xs font-medium min-w-[60px] text-center">
            {currentPage + 1} / {TOTAL_PAGES}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10" onClick={() => bookRef.current?.pageFlip().flipNext()}>
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </Button>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10" onClick={() => setZoom((z) => Math.max(50, z - 10))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-white/50 text-[10px] min-w-[32px] text-center">{zoom}%</span>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10" onClick={() => setZoom((z) => Math.min(200, z + 10))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Bottom hover zone */}
      <div className="absolute bottom-0 left-0 right-0 h-12 z-40" onMouseEnter={showBars} />

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 z-[60]">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${((currentPage + 1) / TOTAL_PAGES) * 100}%`,
            backgroundColor: accent,
          }}
        />
      </div>
    </div>
  );
}
