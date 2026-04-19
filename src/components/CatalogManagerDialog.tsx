import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Download, Link2, Loader2, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { CatalogPdfRenderer } from "./CatalogPdfRenderer";
import { supabase } from "@/integrations/supabase/client";

interface CatalogProduct {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number | null;
  image_url: string | null;
  family_id: string | null;
  brand_id?: string | null;
  featured?: boolean;
  include_in_catalog?: boolean;
}

interface CatalogManagerDialogProps {
  products: CatalogProduct[];
  imagesByProduct: Record<string, { id: string; image_url: string; position: number }[]>;
  familyMap: Record<string, string>;
  categories: string[];
  brands: { id: string; name: string; logo_url?: string | null }[];
  brandMap: Record<string, string>;
}

interface CatalogCustomization {
  id: string;
  type: string;
  reference_name: string;
  logo_url: string | null;
  cover_image_url: string | null;
}

interface PdfRenderOptions {
  brandLogo?: string | null;
  customLogoUrl?: string | null;
  customCoverUrl?: string | null;
  brandTheme?: { gradient: string; accent: string; pattern: string } | null;
}

interface PdfRenderConfig extends PdfRenderOptions {
  requestId: number;
  label: string;
  products: CatalogProduct[];
}

interface GeneratedPdfFile {
  fileName: string;
  url: string;
}

interface CatalogListItem extends PdfRenderOptions {
  key: string;
  label: string;
  count: number;
  products: CatalogProduct[];
}

export function CatalogManagerDialog({ products, imagesByProduct, familyMap, categories, brands, brandMap }: CatalogManagerDialogProps) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [renderConfig, setRenderConfig] = useState<PdfRenderConfig | null>(null);
  const [generatedPdf, setGeneratedPdf] = useState<GeneratedPdfFile | null>(null);

  useEffect(() => {
    return () => {
      if (generatedPdf?.url) URL.revokeObjectURL(generatedPdf.url);
    };
  }, [generatedPdf]);

  const { data: customizations = [] } = useQuery({
    queryKey: ["catalog_customizations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("catalog_customizations").select("*");
      if (error) throw error;
      return data as CatalogCustomization[];
    },
  });

  const catalogProducts = products.filter((p) => p.include_in_catalog);
  const allCategories = [...new Set(catalogProducts.map((p) => p.category).filter(Boolean))] as string[];
  const allBrands = brands.filter((b) => catalogProducts.some((p) => p.brand_id === b.id));
  const featuredProducts = products.filter((p) => p.featured && p.include_in_catalog);

  const appBaseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const buildCatalogUrl = (key?: string, type: "category" | "brand" | "all" = "all") => {
    let url = `${appBaseUrl}/catalogos`;
    if (type === "category" && key) url += `?category=${encodeURIComponent(key)}`;
    if (type === "brand" && key) url += `?brand=${encodeURIComponent(key)}`;
    return url;
  };

  const handleCopyLink = (key?: string, type: "category" | "brand" | "all" = "all") => {
    const url = buildCatalogUrl(key, type);
    navigator.clipboard.writeText(url);
    setCopiedLink(key || "__all__");
    toast.success("Link copiado!");
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const BRAND_THEMES: Record<string, { gradient: string; accent: string; pattern: string }> = {
    Dahua: {
      gradient: "linear-gradient(135deg, #1a0505 0%, #3d0c0c 50%, #6b1515 100%)",
      accent: "#c41230",
      pattern: "radial-gradient(circle at 30% 70%, rgba(196,18,48,0.15) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(196,18,48,0.1) 0%, transparent 50%)",
    },
    Ajax: {
      gradient: "linear-gradient(135deg, #0a1a2e 0%, #122a46 50%, #1a3b5c 100%)",
      accent: "#00b894",
      pattern: "radial-gradient(circle at 30% 70%, rgba(0,184,148,0.15) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(0,184,148,0.1) 0%, transparent 50%)",
    },
  };

  const customizationsByKey = new Map(customizations.map((item) => [`${item.type}:${item.reference_name}`, item]));

  const handleDownloadPdf = (
    label: string,
    filteredProducts: CatalogProduct[],
    options?: {
      brandLogo?: string | null;
      customLogoUrl?: string | null;
      customCoverUrl?: string | null;
      brandTheme?: { gradient: string; accent: string; pattern: string } | null;
    }
  ) => {
    if (generatedPdf?.url) URL.revokeObjectURL(generatedPdf.url);
    setGeneratedPdf(null);
    setDownloading(label);
    setRenderConfig({ requestId: Date.now(), label, products: filteredProducts, ...options });
  };

  const handlePdfReady = useCallback((result?: { fileName: string; blob: Blob }) => {
    setDownloading(null);
    setRenderConfig(null);

    if (!result) {
      return;
    }

    void (async () => {
      try {
        const safeFileName = result.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const storagePath = `catalog-pdfs/${Date.now()}-${safeFileName}`;

        const { error: uploadError } = await supabase.storage
          .from("product-images")
          .upload(storagePath, result.blob, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("product-images").getPublicUrl(storagePath);
        setGeneratedPdf({ fileName: result.fileName, url: data.publicUrl });
        toast.success("PDF pronto. Usa Abrir ou Descarregar.");
      } catch (error) {
        console.error("PDF delivery error:", error);
        const fallbackUrl = URL.createObjectURL(result.blob);
        setGeneratedPdf({ fileName: result.fileName, url: fallbackUrl });
        toast.success("PDF pronto. Usa Abrir ou Descarregar.");
      }
    })();
  }, []);

  const CATEGORY_ICONS: Record<string, string> = {
    Laptops: "💻",
    Smartphones: "📱",
    Gaming: "🎮",
    Informatica: "🖥️",
    "Segurança": "🔒",
    Economato: "📋",
    Outros: "🔧",
  };

  const renderList = (items: CatalogListItem[], type: "category" | "brand") => (
    <div className="space-y-2">
      {items.map((item) => {
        const isDownloading = downloading === item.key;
        const isCopied = copiedLink === item.key;
        const icon = type === "category" ? (CATEGORY_ICONS[item.label] || "📦") : "🏷️";

        return (
          <div key={item.key} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-2">
              <span className="text-lg">{icon}</span>
              <div>
                <p className="font-medium text-sm text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.count} produtos</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <a href={buildCatalogUrl(item.label, type)} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Abrir</span>
                </a>
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleCopyLink(item.label, type)}>
                {isCopied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Link2 className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">{isCopied ? "Copiado" : "Link"}</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                className="gap-1.5"
                onClick={() =>
                  handleDownloadPdf(item.label, item.products, {
                    brandLogo: item.brandLogo,
                    customLogoUrl: item.customLogoUrl,
                    customCoverUrl: item.customCoverUrl,
                    brandTheme: item.brandTheme,
                  })
                }
                disabled={isDownloading}
              >
                {isDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">PDF</span>
              </Button>
            </div>
          </div>
        );
      })}
      {items.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">Nenhum produto marcado para catálogo.</p>
      )}
    </div>
  );

  const categoryItems: CatalogListItem[] = allCategories.map((cat) => {
    const prods = catalogProducts.filter((p) => p.category === cat);
    const custom = customizationsByKey.get(`category:${cat}`);
    return {
      key: cat,
      label: cat,
      count: prods.length,
      products: prods,
      customLogoUrl: custom?.logo_url ?? null,
      customCoverUrl: custom?.cover_image_url ?? null,
    };
  });

  const brandItems: CatalogListItem[] = allBrands.map((b) => {
    const prods = catalogProducts.filter((p) => p.brand_id === b.id);
    const custom = customizationsByKey.get(`brand:${b.name}`);
    return {
      key: b.id,
      label: b.name,
      count: prods.length,
      products: prods,
      brandLogo: b.logo_url,
      customLogoUrl: custom?.logo_url ?? null,
      customCoverUrl: custom?.cover_image_url ?? null,
      brandTheme: BRAND_THEMES[b.name] || null,
    };
  });

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Catálogos</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Gestão de Catálogos
            </DialogTitle>
          </DialogHeader>

          {generatedPdf && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/10 p-3 mb-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">PDF pronto</p>
                <p className="text-xs text-muted-foreground truncate">{generatedPdf.fileName}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" asChild>
                  <a href={generatedPdf.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Abrir</span>
                  </a>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="gap-1.5"
                  onClick={async () => {
                    try {
                      const res = await fetch(generatedPdf.url);
                      const blob = await res.blob();
                      const localUrl = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = localUrl;
                      a.download = generatedPdf.fileName;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      setTimeout(() => URL.revokeObjectURL(localUrl), 2000);
                    } catch (e) {
                      console.error("Download error:", e);
                      window.open(generatedPdf.url, "_blank", "noopener,noreferrer");
                    }
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Descarregar</span>
                </Button>
              </div>
            </div>
          )}

          {/* Share all */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">📚</span>
              <div>
                <p className="font-medium text-sm text-foreground">Todos os Catálogos</p>
                <p className="text-xs text-muted-foreground">{allCategories.length} categorias · {allBrands.length} marcas</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleCopyLink()}>
              {copiedLink === "__all__" ? <Check className="h-3.5 w-3.5 text-primary" /> : <Link2 className="h-3.5 w-3.5" />}
              {copiedLink === "__all__" ? "Copiado" : "Copiar Link"}
            </Button>
          </div>

          <Tabs defaultValue="categories" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="categories">Categorias</TabsTrigger>
              <TabsTrigger value="brands">Marcas</TabsTrigger>
              <TabsTrigger value="hidden">Privados</TabsTrigger>
            </TabsList>
            <TabsContent value="categories" className="mt-3">
              {renderList(categoryItems, "category")}
            </TabsContent>
            <TabsContent value="brands" className="mt-3">
              {renderList(brandItems, "brand")}
            </TabsContent>
            <TabsContent value="hidden" className="mt-3">
              <p className="text-xs text-muted-foreground mb-3">Catálogos acessíveis apenas por link direto — não aparecem no índice público.</p>
              <div className="space-y-2">
                {/* Destaques */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⭐</span>
                    <div>
                      <p className="font-medium text-sm text-foreground">Destaques</p>
                      <p className="text-xs text-muted-foreground">{featuredProducts.length} produtos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" className="gap-1.5" asChild>
                        <a href={`${appBaseUrl}/catalogos/destaques`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Abrir</span>
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
                       navigator.clipboard.writeText(`${appBaseUrl}/catalogos/destaques`);
                      setCopiedLink("__destaques__");
                      toast.success("Link copiado!");
                      setTimeout(() => setCopiedLink(null), 2000);
                    }}>
                      {copiedLink === "__destaques__" ? <Check className="h-3.5 w-3.5 text-primary" /> : <Link2 className="h-3.5 w-3.5" />}
                      <span className="hidden sm:inline">{copiedLink === "__destaques__" ? "Copiado" : "Link"}</span>
                    </Button>
                    <Button variant="default" size="sm" className="gap-1.5" onClick={() => handleDownloadPdf("Destaques", featuredProducts)} disabled={downloading === "Destaques"}>
                      {downloading === "Destaques" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      <span className="hidden sm:inline">PDF</span>
                    </Button>
                  </div>
                </div>
                {/* Kilomat */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/20 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🏷️</span>
                    <div>
                      <p className="font-medium text-sm text-foreground">Kilomat</p>
                      <p className="text-xs text-muted-foreground">Catálogo digitalizado</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" className="gap-1.5" asChild>
                        <a href={`${appBaseUrl}/catalogos/kilomat`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Abrir</span>
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => {
                       navigator.clipboard.writeText(`${appBaseUrl}/catalogos/kilomat`);
                      setCopiedLink("__kilomat__");
                      toast.success("Link copiado!");
                      setTimeout(() => setCopiedLink(null), 2000);
                    }}>
                      {copiedLink === "__kilomat__" ? <Check className="h-3.5 w-3.5 text-primary" /> : <Link2 className="h-3.5 w-3.5" />}
                      <span className="hidden sm:inline">{copiedLink === "__kilomat__" ? "Copiado" : "Link"}</span>
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {renderConfig && (
        <CatalogPdfRenderer
          requestId={renderConfig.requestId}
          category={renderConfig.label}
          products={renderConfig.products}
          imagesByProduct={imagesByProduct}
          familyMap={familyMap}
          onComplete={handlePdfReady}
          brandLogo={renderConfig.brandLogo}
          customLogoUrl={renderConfig.customLogoUrl}
          customCoverUrl={renderConfig.customCoverUrl}
          brandTheme={renderConfig.brandTheme}
        />
      )}
    </>
  );
}
