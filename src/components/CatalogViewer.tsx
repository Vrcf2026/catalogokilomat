import { useState, useMemo, useRef, useCallback, forwardRef, useEffect } from "react";
import { trackEvent } from "@/lib/trackEvent";
import HTMLFlipBook from "react-pageflip";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  Grid3X3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductDetailDialog } from "@/components/ProductDetailDialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getCatalogBookLayout } from "@/lib/catalogBookLayout";
import { buildCatalogFamilyPages } from "@/lib/catalogPagination";
import vrcfLogo from "@/assets/vrcf-logo.png";
import {
  A4PageStage,
  A4_PAGE_H,
  A4_PAGE_W,
  CatalogContactsPage,
  CatalogCoverPage,
  CatalogProductPage,
  CATEGORY_THEMES,
  DEFAULT_THEME,
  type CatalogBrandTheme,
  type CatalogProduct,
} from "@/components/catalog/CatalogA4Pages";

interface CatalogViewerProps {
  category: string;
  products: CatalogProduct[];
  imagesByProduct: Record<string, { id: string; image_url: string; position: number }[]>;
  familyMap: Record<string, string>;
  onBack: () => void;
  productsPerPage?: number;
  brandLogo?: string | null;
  brandTheme?: CatalogBrandTheme | null;
  customLogoUrl?: string | null;
  customCoverUrl?: string | null;
}

// Flipbook page wrapper
const FlipPage = forwardRef<HTMLDivElement, { children: React.ReactNode }>(
  ({ children }, ref) => (
    <div ref={ref} className="bg-white dark:bg-gray-50 h-full w-full overflow-hidden shadow-lg">
      {children}
    </div>
  )
);
FlipPage.displayName = "FlipPage";

/* ─── Main Component ─── */
export function CatalogViewer({
  category,
  products,
  imagesByProduct,
  familyMap,
  onBack,
  brandLogo,
  brandTheme,
  customLogoUrl,
  customCoverUrl,
}: CatalogViewerProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
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

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.family_id && familyMap[p.family_id]?.toLowerCase().includes(q))
    );
  }, [products, searchQuery, familyMap]);

  const pages = useMemo(() => buildCatalogFamilyPages(filteredProducts, familyMap), [filteredProducts, familyMap]);

  // +2 for cover + contacts page
  const totalPages = pages.length + 2;
  const flipbookKey = `${category}-${bookDimensions.width}-${bookDimensions.height}-${bookDimensions.singlePage ? "single" : "spread"}-${totalPages}-${filteredProducts.length}`;

  const getProductImage = (product: CatalogProduct) => {
    const imgs = imagesByProduct[product.id];
    if (imgs && imgs.length > 0) return imgs.sort((a, b) => a.position - b.position)[0].image_url;
    return product.image_url;
  };

  const pageTheme = brandTheme ? { ...DEFAULT_THEME, ...brandTheme, bgImage: DEFAULT_THEME.bgImage } : (CATEGORY_THEMES[category] || DEFAULT_THEME);
  const coverTheme = brandTheme ? { ...DEFAULT_THEME, ...brandTheme } : (CATEGORY_THEMES[category] || DEFAULT_THEME);
  const pageRenderScale = useMemo(
    () => Math.min(bookDimensions.width / A4_PAGE_W, bookDimensions.height / A4_PAGE_H),
    [bookDimensions.height, bookDimensions.width]
  );

  // For brands, use the first product image as cover background (custom override takes priority)
  const coverBgImage = useMemo(() => {
    if (customCoverUrl) return customCoverUrl;
    if (CATEGORY_THEMES[category]) return pageTheme.bgImage;
    // Find a featured product image, or first product image
    const featured = products.find(p => p.featured);
    const firstProduct = featured || products[0];
    if (firstProduct) {
      const imgs = imagesByProduct[firstProduct.id];
      if (imgs && imgs.length > 0) return imgs.sort((a, b) => a.position - b.position)[0].image_url;
      if (firstProduct.image_url) return firstProduct.image_url;
    }
    return pageTheme.bgImage;
  }, [category, products, imagesByProduct, pageTheme.bgImage, customCoverUrl]);

  // Use custom logo if available
  const effectiveBrandLogo = customLogoUrl || brandLogo;

  const onFlip = useCallback((e: any) => {
    setCurrentPage(e.data);
  }, []);

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

  return (
    <div
      ref={containerRef}
      className="h-screen flex flex-col relative overflow-hidden"
      style={{ backgroundColor: "#2a2a2a" }}
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
          <span className="font-heading font-bold text-white/90 text-sm">{category}</span>
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
            <button
              onClick={() => { flipTo(0); setShowThumbnails(false); }}
              className={`w-full rounded-md overflow-hidden border-2 transition-all ${currentPage === 0 ? "border-primary" : "border-transparent hover:border-white/30"}`}
            >
              <div className="aspect-[210/297] bg-white flex items-center justify-center p-2">
                <span className="font-heading text-[8px] font-bold text-gray-800 text-center">{category}</span>
              </div>
              <div className="bg-black/60 text-white text-[10px] text-center py-0.5">Capa</div>
            </button>
            {pages.map((_, i) => (
              <button
                key={i}
                onClick={() => { flipTo(i + 1); setShowThumbnails(false); }}
                className={`w-full rounded-md overflow-hidden border-2 transition-all ${currentPage === i + 1 ? "border-primary" : "border-transparent hover:border-white/30"}`}
              >
                  <div className="aspect-[210/297] bg-white flex items-center justify-center p-1">
                  <span className="text-[8px] text-gray-500">Pág. {i + 1}</span>
                </div>
                <div className="bg-black/60 text-white text-[10px] text-center py-0.5">{i + 1}</div>
              </button>
            ))}
            <button
              onClick={() => { flipTo(pages.length + 1); setShowThumbnails(false); }}
              className={`w-full rounded-md overflow-hidden border-2 transition-all ${currentPage === pages.length + 1 ? "border-primary" : "border-transparent hover:border-white/30"}`}
            >
              <div className="aspect-[210/297] bg-white flex items-center justify-center p-2">
                <span className="font-heading text-[8px] font-bold text-gray-800 text-center">Contactos</span>
              </div>
              <div className="bg-black/60 text-white text-[10px] text-center py-0.5">Contactos</div>
            </button>
          </div>
        )}

        {/* @ts-ignore */}
        <HTMLFlipBook
          ref={bookRef}
          key={flipbookKey}
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
          flippingTime={800}
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
          {/* Cover page */}
          <FlipPage>
            <A4PageStage scale={pageRenderScale}>
              <CatalogCoverPage
                category={category}
                productCount={filteredProducts.length}
                bgImage={coverBgImage}
                brandLogo={effectiveBrandLogo}
                theme={coverTheme}
              />
            </A4PageStage>
          </FlipPage>

          {/* Product pages grouped by family */}
          {pages.map((page, pageIndex) => {
            return (
            <FlipPage key={pageIndex}>
              <A4PageStage scale={pageRenderScale}>
                <CatalogProductPage
                  category={category}
                  page={page}
                  pageIndex={pageIndex}
                  totalPages={pages.length}
                  theme={pageTheme}
                  brandLogo={effectiveBrandLogo}
                  getProductImage={getProductImage}
                  onImageZoom={(imgUrl) => setZoomedImage(imgUrl)}
                  onProductOpen={(product) => {
                    trackEvent(product.id, "catalog_view");
                    setSelectedProduct({
                      name: product.name,
                      description: product.description,
                      category: product.category,
                      price: product.price,
                      imageUrl: product.image_url,
                      images: imagesByProduct[product.id] || [],
                      familyName: page.familyName,
                    });
                  }}
                />
              </A4PageStage>
            </FlipPage>
            );
          })}

          {/* Contacts last page */}
          <FlipPage>
            <A4PageStage scale={pageRenderScale}>
              <CatalogContactsPage
                theme={coverTheme}
                onWhatsAppClick={() => window.open("https://wa.me/351911564243?text=Ol%C3%A1!%20Gostaria%20de%20mais%20informa%C3%A7%C3%B5es.", "_blank")}
              />
            </A4PageStage>
          </FlipPage>
        </HTMLFlipBook>

        {/* Navigation arrows */}
        <button
          onClick={() => bookRef.current?.pageFlip().flipPrev()}
          className={`absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center z-30 transition-opacity duration-500 ${barsVisible ? "opacity-100" : "opacity-0"}`}
          style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
          disabled={currentPage === 0}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => bookRef.current?.pageFlip().flipNext()}
          className={`absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center z-30 transition-opacity duration-500 ${barsVisible ? "opacity-100" : "opacity-0"}`}
          style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
          disabled={currentPage === totalPages - 1}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Bottom hover zone */}
      <div className="absolute bottom-0 left-0 right-0 h-12 z-40" onMouseEnter={showBars} />

      {/* Bottom toolbar */}
      <div
        className={`absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2 z-50 transition-all duration-500 ${
          barsVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        }`}
        style={{ backgroundColor: "rgba(26,26,26,0.9)", backdropFilter: "blur(8px)" }}
        onMouseEnter={() => { setBarsVisible(true); if (hideTimerRef.current) clearTimeout(hideTimerRef.current); }}
        onMouseLeave={() => { hideTimerRef.current = setTimeout(() => setBarsVisible(false), 1500); }}
      >
        <div className="flex items-center gap-3">
          <span className="text-white/70 text-xs font-medium">{currentPage + 1} / {totalPages}</span>
          <div className="hidden sm:block w-32 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${((currentPage + 1) / totalPages) * 100}%`, backgroundColor: "hsl(27 90% 50%)" }}
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10" onClick={() => setZoom(Math.max(50, zoom - 10))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-white/50 text-[10px] w-8 text-center">{zoom}%</span>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10" onClick={() => setZoom(Math.min(150, zoom + 10))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="w-px h-5 mx-1" style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10" onClick={() => setShowThumbnails(!showThumbnails)}>
            <Grid3X3 className="h-4 w-4" />
          </Button>
          {showSearch ? (
            <div className="flex items-center gap-1 ml-1">
              <Input
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(0); if (bookRef.current) bookRef.current.pageFlip().flip(0); }}
                placeholder="Pesquisar..."
                className="h-7 w-28 sm:w-36 text-xs bg-white/10 border-white/20 text-white placeholder:text-white/40"
                autoFocus
              />
              <Button variant="ghost" size="icon" className="h-7 w-7 text-white/60 hover:text-white" onClick={() => { setShowSearch(false); setSearchQuery(""); }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10" onClick={() => setShowSearch(true)}>
              <Search className="h-4 w-4" />
            </Button>
          )}
          <div className="w-px h-5 mx-1" style={{ backgroundColor: "rgba(255,255,255,0.15)" }} />
          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
        </div>

        <div className="w-16" />
      </div>

      {/* Product detail */}
      {selectedProduct && (
        <ProductDetailDialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)} product={selectedProduct} />
      )}

      {/* Zoom dialog */}
      <Dialog open={!!zoomedImage} onOpenChange={(open) => !open && setZoomedImage(null)}>
        <DialogContent className="max-w-4xl w-full p-2 bg-background/95 backdrop-blur-lg">
          <DialogTitle className="sr-only">Zoom da imagem</DialogTitle>
          {zoomedImage && <img src={zoomedImage} alt="Zoom" className="w-full h-auto max-h-[85vh] object-contain rounded-lg" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
