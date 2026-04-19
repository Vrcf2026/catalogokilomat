import { useEffect, useMemo, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { buildCatalogFamilyPages } from "@/lib/catalogPagination";
import {
  A4_PAGE_H as PAGE_H,
  A4_PAGE_W as PAGE_W,
  CatalogContactsPage,
  CatalogCoverPage,
  CatalogProductPage,
  CATEGORY_THEMES,
  DEFAULT_THEME,
  type CatalogBrandTheme,
  type CatalogProduct,
} from "@/components/catalog/CatalogA4Pages";

interface Props {
  requestId: number;
  category: string;
  products: CatalogProduct[];
  imagesByProduct: Record<string, { id: string; image_url: string; position: number }[]>;
  familyMap: Record<string, string>;
  onComplete: (result?: { fileName: string; blob: Blob }) => void;
  brandLogo?: string | null;
  customLogoUrl?: string | null;
  customCoverUrl?: string | null;
  brandTheme?: CatalogBrandTheme | null;
}

const IMAGE_PROXY_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proxy-image`;
const PDF_RENDER_SCALE = 2;

function getPdfSafeImageUrl(url: string | null | undefined) {
  if (!url) return null;
  const u = url.trim();
  if (!u) return null;
  if (u.startsWith("data:") || u.startsWith("blob:") || u.startsWith("/") || u.includes("/storage/v1/object/public/product-images/")) return u;
  return `${IMAGE_PROXY_BASE}?url=${encodeURIComponent(u)}`;
}

function getProductImage(product: CatalogProduct, imagesByProduct: Record<string, any[]>) {
  const imgs = imagesByProduct[product.id];
  if (imgs && imgs.length > 0) return imgs.sort((a: any, b: any) => a.position - b.position)[0].image_url;
  return product.image_url;
}

async function waitForImage(img: HTMLImageElement) {
  const src = img.currentSrc || img.src;
  if (!src) return;

  if (img.complete && img.naturalWidth > 0) {
    try { await img.decode(); } catch { /* ok */ }
    return;
  }

  await new Promise<void>((resolve) => {
    const timeoutId = window.setTimeout(() => resolve(), 5000);
    const done = () => resolve();
    const finish = () => {
      window.clearTimeout(timeoutId);
      done();
    };
    img.addEventListener("load", finish, { once: true });
    img.addEventListener("error", finish, { once: true });
  });
  try { await img.decode(); } catch { /* ok */ }
}

async function waitForRenderableAssets(container: HTMLDivElement) {
  try { await document.fonts?.ready; } catch { /* ok */ }
  const images = Array.from(container.querySelectorAll("img"));
  await Promise.all(images.map((img) => waitForImage(img as HTMLImageElement)));
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

async function renderPageToCanvas(element: HTMLElement) {
  return Promise.race([
    html2canvas(element, {
      scale: PDF_RENDER_SCALE,
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      windowWidth: element.scrollWidth || PAGE_W,
      windowHeight: element.scrollHeight || PAGE_H,
      width: element.scrollWidth || PAGE_W,
      height: element.scrollHeight || PAGE_H,
      scrollX: 0,
      scrollY: 0,
      imageTimeout: 5000,
      removeContainer: false,
      logging: false,
      onclone: (doc) => {
        doc.querySelectorAll("img").forEach((img) => {
          img.setAttribute("loading", "eager");
          img.setAttribute("decoding", "sync");
        });
        doc.querySelectorAll("*").forEach((node) => {
          const el = node as HTMLElement;
          el.style.animation = "none";
          el.style.transition = "none";
        });
      },
    }),
    new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error("PDF page render timeout")), 20000);
    }),
  ]);
}

export function CatalogPdfRenderer({
  requestId, category, products, imagesByProduct, familyMap, onComplete,
  brandLogo, customLogoUrl, customCoverUrl, brandTheme,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef<number | null>(null);
  const pages = useMemo(() => buildCatalogFamilyPages(products, familyMap), [products, familyMap]);
  const isBrand = !CATEGORY_THEMES[category];
  const pageTheme = brandTheme
    ? { ...DEFAULT_THEME, ...brandTheme, icon: DEFAULT_THEME.icon, bgImage: DEFAULT_THEME.bgImage }
    : (CATEGORY_THEMES[category] || DEFAULT_THEME);
  const coverTheme = brandTheme ? { ...DEFAULT_THEME, ...brandTheme } : (CATEGORY_THEMES[category] || DEFAULT_THEME);

  const coverBg = useMemo(() => {
    if (customCoverUrl) return getPdfSafeImageUrl(customCoverUrl);
    if (CATEGORY_THEMES[category]) return pageTheme.bgImage;
    const feat = products.find((p) => p.featured) || products[0];
    return feat ? getPdfSafeImageUrl(getProductImage(feat, imagesByProduct)) || pageTheme.bgImage : pageTheme.bgImage;
  }, [category, customCoverUrl, imagesByProduct, products, pageTheme.bgImage]);

  const brandLogoUrl = useMemo(() => getPdfSafeImageUrl(customLogoUrl || brandLogo), [brandLogo, customLogoUrl]);

  useEffect(() => {
    if (hasStartedRef.current === requestId) return;
    hasStartedRef.current = requestId;

    const generate = async () => {
      let completionResult: { fileName: string; blob: Blob } | undefined;

      try {
        toast.info(`A gerar PDF "${category}"...`);
        const container = containerRef.current;
        if (!container) return;

        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        await waitForRenderableAssets(container);

        const pageEls = Array.from(container.querySelectorAll("[data-pdf-page]")) as HTMLElement[];
        if (pageEls.length === 0) {
          toast.error("Sem páginas.");
          onComplete();
          return;
        }

        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

        for (let i = 0; i < pageEls.length; i++) {
          const el = pageEls[i];
          const canvas = await renderPageToCanvas(el);
          const imgData = canvas.toDataURL("image/jpeg", 0.92);

          if (i > 0) pdf.addPage("a4", "portrait");
          pdf.addImage(imgData, "JPEG", 0, 0, 210, 297, undefined, "FAST");
          canvas.width = 1;
          canvas.height = 1;
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        }

        const fileName = `Catalogo_${category.replace(/\s+/g, "_")}_VRCF.pdf`;
        const blob = pdf.output("blob");
        toast.success(`PDF "${category}" pronto para descarregar.`);
        completionResult = { fileName, blob };
      } catch (err) {
        console.error("PDF generation error:", err);
        toast.error("Erro ao gerar o PDF.");
      } finally {
        onComplete(completionResult);
      }
    };

    generate();
  }, [requestId, category, onComplete]);

  const pageBase: React.CSSProperties = {
    width: PAGE_W,
    height: PAGE_H,
    minHeight: PAGE_H,
    position: "relative",
    overflow: "hidden",
    background: "#ffffff",
    display: "block",
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        top: -PAGE_H - 40,
        left: -PAGE_W - 40,
        width: PAGE_W,
        height: PAGE_H,
        opacity: 1,
        pointerEvents: "none",
        zIndex: -1,
        overflow: "hidden",
      }}
    >
      {/* ═══ COVER ═══ */}
      <div data-pdf-page style={pageBase}>
        <CatalogCoverPage
          category={category}
          productCount={products.length}
          bgImage={coverBg || coverTheme.bgImage}
          brandLogo={isBrand ? brandLogoUrl : null}
          theme={coverTheme}
        />
      </div>

      {/* ═══ CONTENT PAGES ═══ */}
      {pages.map((page, pageIndex) => {
        return (
          <div key={pageIndex} data-pdf-page style={pageBase}>
            <CatalogProductPage
              category={category}
              page={page}
              pageIndex={pageIndex}
              totalPages={pages.length}
              theme={pageTheme}
              brandLogo={brandLogoUrl}
              getProductImage={(product) => getPdfSafeImageUrl(getProductImage(product, imagesByProduct))}
            />
          </div>
        );
      })}

      {/* ═══ CONTACTS PAGE ═══ */}
      <div data-pdf-page style={pageBase}>
        <CatalogContactsPage theme={coverTheme} />
      </div>
    </div>
  );
}
