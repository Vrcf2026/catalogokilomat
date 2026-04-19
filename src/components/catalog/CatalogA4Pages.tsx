import { forwardRef, type ReactNode } from "react";
import { Globe, ImageOff, Mail, MapPin, Phone, Search, ZoomIn } from "lucide-react";
import vrcfLogo from "@/assets/vrcf-logo.png";
import vrcfShield from "@/assets/vrcf-shield.png";

export interface CatalogProduct {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number | null;
  image_url: string | null;
  family_id: string | null;
  featured?: boolean;
}

export interface CatalogBrandTheme {
  gradient: string;
  accent: string;
  pattern: string;
}

export interface CatalogFamilyPage {
  familyName: string;
  pageNumberInFamily: number;
  totalPagesInFamily: number;
  products: CatalogProduct[];
}

export interface CatalogTheme {
  gradient: string;
  icon: string;
  pattern: string;
  accent: string;
  bgImage: string;
}

export const A4_PAGE_W = 794;
export const A4_PAGE_H = 1123;

export const CATEGORY_THEMES: Record<string, CatalogTheme> = {
  Laptops: {
    gradient: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0c4a6e 100%)",
    icon: "💻",
    pattern: "radial-gradient(circle at 20% 80%, rgba(59,130,246,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(14,165,233,0.1) 0%, transparent 50%)",
    accent: "#3b82f6",
    bgImage: "/images/bg-laptops.jpg",
  },
  Smartphones: {
    gradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
    icon: "📱",
    pattern: "radial-gradient(circle at 30% 70%, rgba(139,92,246,0.15) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(99,102,241,0.1) 0%, transparent 50%)",
    accent: "#8b5cf6",
    bgImage: "/images/bg-smartphones.jpg",
  },
  Gaming: {
    gradient: "linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 50%, #2d1b69 100%)",
    icon: "🎮",
    pattern: "radial-gradient(circle at 50% 50%, rgba(236,72,153,0.1) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(168,85,247,0.12) 0%, transparent 50%)",
    accent: "#ec4899",
    bgImage: "/images/bg-gaming.jpg",
  },
  Informatica: {
    gradient: "linear-gradient(135deg, #0a1628 0%, #132744 50%, #1a3a5c 100%)",
    icon: "🖥️",
    pattern: "radial-gradient(circle at 20% 80%, rgba(56,189,248,0.12) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(59,130,246,0.1) 0%, transparent 50%)",
    accent: "#38bdf8",
    bgImage: "/images/bg-informatica.jpg",
  },
  "Segurança": {
    gradient: "linear-gradient(135deg, #1a0a0a 0%, #2d1210 50%, #451a15 100%)",
    icon: "🔒",
    pattern: "radial-gradient(circle at 30% 70%, rgba(239,68,68,0.12) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(251,146,60,0.1) 0%, transparent 50%)",
    accent: "#f97316",
    bgImage: "/images/bg-seguranca.jpg",
  },
  Economato: {
    gradient: "linear-gradient(135deg, #1c1917 0%, #2c2520 50%, #3d342a 100%)",
    icon: "📋",
    pattern: "radial-gradient(circle at 25% 75%, rgba(34,197,94,0.1) 0%, transparent 50%), radial-gradient(circle at 75% 25%, rgba(132,204,22,0.08) 0%, transparent 50%)",
    accent: "#22c55e",
    bgImage: "/images/bg-economato.jpg",
  },
  Outros: {
    gradient: "linear-gradient(135deg, #1c1917 0%, #292524 50%, #44403c 100%)",
    icon: "🔧",
    pattern: "radial-gradient(circle at 25% 75%, rgba(245,158,11,0.12) 0%, transparent 50%), radial-gradient(circle at 75% 25%, rgba(251,146,60,0.08) 0%, transparent 50%)",
    accent: "#f59e0b",
    bgImage: "/images/bg-outros.jpg",
  },
};

export const DEFAULT_THEME: CatalogTheme = {
  gradient: "linear-gradient(135deg, hsl(27 90% 20%) 0%, hsl(27 90% 35%) 50%, hsl(27 90% 50%) 100%)",
  icon: "📦",
  pattern: "radial-gradient(circle at 30% 70%, rgba(251,146,60,0.15) 0%, transparent 50%)",
  accent: "hsl(27 90% 50%)",
  bgImage: "/images/bg-outros.jpg",
};

export function A4PageStage({ scale, children }: { scale: number; children: ReactNode }) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        style={{
          width: A4_PAGE_W,
          height: A4_PAGE_H,
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export const CatalogCoverPage = forwardRef<HTMLDivElement, {
  category: string;
  productCount: number;
  bgImage: string;
  brandLogo?: string | null;
  theme: CatalogTheme;
}>(function CatalogCoverPage({
  category,
  productCount,
  bgImage,
  brandLogo,
  theme,
}, ref) {
  const isBrand = !CATEGORY_THEMES[category];

  return (
    <div ref={ref} className="h-full w-full relative overflow-hidden">
      {bgImage ? (
        <>
          <img src={bgImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.7) 100%)" }} />
        </>
      ) : (
        <div className="absolute inset-0" style={{ background: theme.gradient }} />
      )}

      <div className="absolute inset-0" style={{ background: theme.pattern }} />
      <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: theme.accent }} />

      <div className="h-full flex flex-col items-center justify-center relative z-10 px-8">
        <div className="absolute top-6 left-0 right-0 flex flex-col items-center">
          <img src={vrcfLogo} alt="VRCF" className="h-28 w-28 object-contain drop-shadow-lg" />
          <p className="text-white/60 text-[8px] tracking-[0.4em] uppercase mt-1 font-medium">Informática & Segurança</p>
        </div>

        {isBrand && brandLogo ? (
          <div className="mb-5 w-32 h-32 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center p-4 shadow-2xl">
            <img src={brandLogo} alt={category} className="max-w-full max-h-full object-contain drop-shadow-lg" />
          </div>
        ) : (
          <div className="text-6xl mb-5 drop-shadow-2xl">{theme.icon}</div>
        )}

        <div className="text-center space-y-3">
          <div className="flex items-center gap-3 justify-center">
            <div className="w-10 h-px" style={{ backgroundColor: `${theme.accent}80` }} />
            <p className="text-white/60 text-[10px] font-semibold tracking-[0.5em] uppercase">
              {isBrand ? "Catálogo de Marca" : "Catálogo"}
            </p>
            <div className="w-10 h-px" style={{ backgroundColor: `${theme.accent}80` }} />
          </div>

          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-white leading-none tracking-tight drop-shadow-lg">
            {category}
          </h1>

          <div className="w-20 h-1 rounded-full mx-auto" style={{ backgroundColor: theme.accent }} />

          <p className="text-white/50 text-sm font-medium">
            {productCount} {productCount === 1 ? "produto" : "produtos"}
          </p>
        </div>

        <div className="absolute bottom-8 flex flex-col items-center gap-1">
          <div className="w-5 h-8 rounded-full border border-white/25 flex items-start justify-center p-1">
            <div className="w-1 h-2 rounded-full bg-white/50 animate-bounce" />
          </div>
          <p className="text-white/30 text-[9px] tracking-wider">Arraste para folhear</p>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: `${theme.accent}60` }} />
    </div>
  );
});

export const CatalogContactsPage = forwardRef<HTMLDivElement, {
  theme: CatalogTheme;
  onWhatsAppClick?: () => void;
}>(function CatalogContactsPage({
  theme,
  onWhatsAppClick,
}, ref) {
  return (
    <div ref={ref} className="h-full w-full relative overflow-hidden" style={{ background: theme.gradient }}>
      <div className="absolute inset-0" style={{ background: theme.pattern }} />
      <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: theme.accent }} />

      <div className="h-full flex flex-col items-center justify-center relative z-10 px-8">
        <img src={vrcfShield} alt="VRCF" className="h-40 w-40 object-contain drop-shadow-lg mb-6" />

        <h2 className="font-heading text-2xl font-bold text-white mb-1">VRCF</h2>
        <p className="text-white/50 text-xs tracking-[0.3em] uppercase mb-8">Informática & Segurança</p>

        <div className="w-16 h-px mb-8" style={{ backgroundColor: `${theme.accent}80` }} />

        <div className="space-y-4 text-center">
          <div className="flex items-center gap-3 justify-center">
            <Phone className="h-4 w-4" style={{ color: theme.accent }} />
            <span className="text-white/80 text-sm">+351 911 564 243</span>
          </div>
          <div className="flex items-center gap-3 justify-center">
            <Mail className="h-4 w-4" style={{ color: theme.accent }} />
            <span className="text-white/80 text-sm">geral@vrcf.pt</span>
          </div>
          <div className="flex items-center gap-3 justify-center">
            <MapPin className="h-4 w-4" style={{ color: theme.accent }} />
            <span className="text-white/80 text-sm">Rua Luis Calado Nunes 15 LJB — 2870-350 Montijo</span>
          </div>
          <div className="flex items-center gap-3 justify-center">
            <Globe className="h-4 w-4" style={{ color: theme.accent }} />
            <a href="https://www.vrcf.pt" target="_blank" rel="noopener noreferrer" className="text-white/80 text-sm hover:text-white underline">www.vrcf.pt</a>
          </div>
        </div>

        <button
          type="button"
          onClick={onWhatsAppClick}
          className="mt-8 flex items-center gap-2 px-6 py-3 rounded-full text-white font-semibold text-sm transition-transform hover:scale-105 shadow-lg"
          style={{ backgroundColor: "#25D366" }}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Fale connosco no WhatsApp
        </button>

        <div className="absolute bottom-6 left-0 right-0 px-8 flex flex-col items-center gap-1 text-center">
          <p className="text-white/60 text-[10px] font-semibold tracking-wider">vrcf.pt</p>
          <p className="text-white/40 text-[9px] leading-snug max-w-md">Todos os preços apresentados incluem IVA à taxa legal em vigor.</p>
          <p className="text-white/40 text-[9px] leading-snug max-w-md">Os preços são meramente indicativos e podem sofrer alterações sem aviso prévio.</p>
          <p className="text-white/40 text-[9px] leading-snug max-w-md">As imagens apresentadas são meramente ilustrativas.</p>
          <p className="text-white/20 text-[9px] tracking-wider mt-1">© {new Date().getFullYear()} VRCF — Todos os direitos reservados</p>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1" style={{ backgroundColor: `${theme.accent}60` }} />
    </div>
  );
});

export const CatalogFamilyHeader = forwardRef<HTMLDivElement, { familyName: string; accent: string; bgImage: string }>(function CatalogFamilyHeader({ familyName, accent, bgImage }, ref) {
  return (
    <div ref={ref} className="rounded-lg overflow-hidden relative" style={{ height: 40, marginBottom: 4 }}>
      {bgImage ? (
        <>
          <img src={bgImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50" />
        </>
      ) : (
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${accent}20, ${accent}40)` }} />
      )}
      <div className="relative z-10 h-full flex items-center gap-2 px-2">
        <div className="rounded-full" style={{ width: 3, height: 16, backgroundColor: accent }} />
        <h3 className="font-heading font-bold text-white drop-shadow-md" style={{ fontSize: 11 }}>{familyName}</h3>
      </div>
    </div>
  );
});

export const CatalogProductPage = forwardRef<HTMLDivElement, {
  category: string;
  page: CatalogFamilyPage;
  pageIndex: number;
  totalPages: number;
  theme: CatalogTheme;
  brandLogo?: string | null;
  getProductImage: (product: CatalogProduct) => string | null | undefined;
  onProductOpen?: (product: CatalogProduct) => void;
  onImageZoom?: (imageUrl: string) => void;
}>(function CatalogProductPage({
  category,
  page,
  pageIndex,
  totalPages,
  theme,
  brandLogo,
  getProductImage,
  onProductOpen,
  onImageZoom,
}, ref) {
  const pagePad = 14;
  const headerH = 34;
  const footerH = 22;
  const gapSize = 6;
  const cardPad = 6;
  const fontTitle = 11;
  const fontDesc = 10;
  const fontPrice = 13;
  const fontHeader = 13;
  const logoH = 24;
  const metaFont = 10;

  return (
    <div ref={ref} className="h-full w-full flex flex-col relative overflow-hidden">
      {theme.bgImage && (
        <div className="absolute inset-0 z-0">
          <img src={theme.bgImage} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: "rgba(255,255,255,0.90)" }} />
        </div>
      )}

      <div className="relative z-10 h-full flex flex-col" style={{ padding: pagePad }}>
        <div className="flex items-center justify-between shrink-0" style={{ height: headerH, marginBottom: gapSize, paddingBottom: gapSize, borderBottom: "1px solid #e5e5e5" }}>
          <div className="flex items-center" style={{ gap: 8 }}>
            {brandLogo ? (
              <img src={brandLogo} alt={category} style={{ height: logoH }} className="object-contain" />
            ) : (
              <img src={vrcfLogo} alt="VRCF" style={{ height: logoH, width: logoH }} className="object-contain" />
            )}
            <span className="font-heading font-bold" style={{ fontSize: fontHeader, color: "#1a1a1a" }}>{category}</span>
          </div>
          <span className="font-medium" style={{ fontSize: 11, color: theme.accent }}>VRCF</span>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden" style={{ gap: gapSize }}>
          {page.products.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center" style={{ color: "#999" }}>
              <Search className="h-8 w-8 mb-2 opacity-40" />
              <p style={{ fontSize: fontDesc }}>Nenhum produto encontrado</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              <CatalogFamilyHeader familyName={page.familyName} accent={theme.accent} bgImage={theme.bgImage} />

              <div className="shrink-0" style={{ marginBottom: gapSize }}>
                {page.totalPagesInFamily > 1 && (
                  <p style={{ fontSize: metaFont, color: "#666" }}>
                    {page.pageNumberInFamily} / {page.totalPagesInFamily} da família {page.familyName}
                  </p>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gridTemplateRows: "repeat(3, auto)", gap: gapSize, alignContent: "start" }}>
                {page.products.map((product) => {
                  const imgUrl = getProductImage(product);

                  return (
                    <div key={product.id} className="group flex flex-col rounded overflow-hidden relative" style={{ border: product.featured ? `2px solid ${theme.accent}` : "1px solid #eee", backgroundColor: product.featured ? "#fffbf0" : "#fff" }}>
                      {product.featured && (
                        <div className="absolute top-0 left-0 z-20 rounded-br text-white font-bold uppercase" style={{ backgroundColor: theme.accent, fontSize: 8, padding: "2px 6px", letterSpacing: "0.05em" }}>
                          ★ Destaque
                        </div>
                      )}

                      <div className="overflow-hidden relative shrink-0" style={{ backgroundColor: "#f5f5f5", aspectRatio: "16/10" }}>
                        {imgUrl ? (
                          <>
                            <img src={imgUrl} alt={product.name} className="w-full h-full object-cover" loading={onProductOpen ? "lazy" : "eager"} decoding={onProductOpen ? "async" : "sync"} />
                            {onImageZoom && (
                              <button
                                type="button"
                                onClick={() => onImageZoom(imgUrl)}
                                className="absolute top-1 right-1 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{ backgroundColor: "rgba(255,255,255,0.8)" }}
                              >
                                <ZoomIn className="h-3 w-3" style={{ color: "#333" }} />
                              </button>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <ImageOff className="h-5 w-5" style={{ color: "#ccc" }} />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col flex-1" style={{ padding: cardPad, minHeight: 60 }}>
                        {onProductOpen ? (
                          <button type="button" onClick={() => onProductOpen(product)} className="text-left">
                            <h4 className="font-heading font-bold leading-tight line-clamp-2" style={{ fontSize: fontTitle, color: "#1a1a1a", minHeight: fontTitle * 2.4 }}>
                              {product.name}
                            </h4>
                          </button>
                        ) : (
                          <div>
                            <h4 className="font-heading font-bold leading-tight line-clamp-2" style={{ fontSize: fontTitle, color: "#1a1a1a", minHeight: fontTitle * 2.4 }}>
                              {product.name}
                            </h4>
                          </div>
                        )}

                        <div className="mt-auto" style={{ paddingTop: 3 }}>
                          {product.price != null ? (
                            <span className="font-heading font-bold" style={{ fontSize: fontPrice, color: "#1a1a1a" }}>
                              {product.price.toFixed(2).replace(".", ",")} €
                            </span>
                          ) : (
                            <span style={{ fontSize: fontDesc, color: "#aaa" }}>Consultar</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 flex items-center justify-between" style={{ height: footerH, marginTop: gapSize, paddingTop: gapSize, borderTop: "1px solid #eee", fontSize: metaFont, color: "#bbb" }}>
          <span>Catálogo {category}</span>
          <span>{pageIndex + 1} / {totalPages}</span>
        </div>
      </div>
    </div>
  );
});