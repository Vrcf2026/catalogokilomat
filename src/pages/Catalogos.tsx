import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BookOpen, Loader2 } from "lucide-react";
import { CatalogViewer } from "@/components/CatalogViewer";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import vrcfLogo from "@/assets/vrcf-logo.png";

const CATEGORY_THEMES: Record<string, { icon: string; bgImage: string }> = {
  Laptops: { icon: "💻", bgImage: "/images/bg-laptops.jpg" },
  Smartphones: { icon: "📱", bgImage: "/images/bg-smartphones.jpg" },
  Gaming: { icon: "🎮", bgImage: "/images/bg-gaming.jpg" },
  Informatica: { icon: "🖥️", bgImage: "/images/bg-informatica.jpg" },
  "Segurança": { icon: "🔒", bgImage: "/images/bg-seguranca.jpg" },
  Economato: { icon: "📋", bgImage: "/images/bg-economato.jpg" },
  Kilomat: { icon: "🔧", bgImage: "/kilomat-catalog/page-01.png" },
  Outros: { icon: "🔧", bgImage: "/images/bg-outros.jpg" },
};

const Catalogos = () => {
  const [searchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("categories");
  const isKiosk = searchParams.get("kiosk") === "1";
  const [cursorHidden, setCursorHidden] = useState(false);

  useEffect(() => {
    const cat = searchParams.get("category");
    const brand = searchParams.get("brand");
    if (cat) setSelectedCategory(cat);
    else if (brand) { setSelectedBrand(brand); setActiveTab("brands"); }
  }, [searchParams]);

  // Kiosk mode: hide cursor after inactivity, prevent context menu
  useEffect(() => {
    if (!isKiosk) return;
    let timer: number;
    const resetTimer = () => {
      setCursorHidden(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setCursorHidden(true), 5000);
    };
    const blockContext = (e: MouseEvent) => e.preventDefault();
    resetTimer();
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("touchstart", resetTimer);
    window.addEventListener("contextmenu", blockContext);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("touchstart", resetTimer);
      window.removeEventListener("contextmenu", blockContext);
    };
  }, [isKiosk]);

  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: productImages = [], isLoading: isLoadingProductImages } = useQuery({
    queryKey: ["product_images"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_images").select("*").order("position", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: families = [], isLoading: isLoadingFamilies } = useQuery({
    queryKey: ["families"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_families").select("*").order("category", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: brands = [], isLoading: isLoadingBrands } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("*").order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: customizations = [], isLoading: isLoadingCustomizations } = useQuery({
    queryKey: ["catalog_customizations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("catalog_customizations").select("*");
      if (error) throw error;
      return data;
    },
  });

  const getCustom = (type: string, name: string) =>
    customizations.find((c: any) => c.type === type && c.reference_name === name);

  const imagesByProduct = productImages.reduce((acc: Record<string, typeof productImages>, img) => {
    if (!acc[img.product_id]) acc[img.product_id] = [];
    acc[img.product_id].push(img);
    return acc;
  }, {});

  const familyMap = Object.fromEntries(families.map((f) => [f.id, f.name]));
  const brandMap = Object.fromEntries(brands.map((b) => [b.id, b.name]));

  const catalogProducts = products.filter((p) => p.include_in_catalog);
  const dynamicCategories = [...new Set(catalogProducts.map((p) => p.category).filter(Boolean))] as string[];
  const categories = dynamicCategories.filter((c) => c !== "Kilomat");
  const catalogBrands = brands.filter((b) => catalogProducts.some((p) => p.brand_id === b.id));
  const isCatalogDataLoading =
    isLoadingProducts ||
    isLoadingProductImages ||
    isLoadingFamilies ||
    isLoadingBrands ||
    isLoadingCustomizations;

  const handleBack = () => { setSelectedCategory(null); setSelectedBrand(null); };

  // Known brand color themes
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

  // Brand-based catalog view
  if (selectedBrand) {
    if (isCatalogDataLoading) {
      return (
        <div className="h-screen flex items-center justify-center bg-background text-foreground">
          <div className="flex items-center gap-3 text-sm font-medium">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            A carregar catálogo…
          </div>
        </div>
      );
    }

    const brandProducts = catalogProducts.filter((p) => {
      const brandName = p.brand_id ? brandMap[p.brand_id] : null;
      return brandName === selectedBrand;
    });
    const brandObj = brands.find((b) => b.name === selectedBrand);
    const brandTheme = BRAND_THEMES[selectedBrand] || null;
    const brandCustom = getCustom("brand", selectedBrand);
    return (
      <CatalogViewer category={selectedBrand} products={brandProducts} imagesByProduct={imagesByProduct} familyMap={familyMap} onBack={handleBack} brandLogo={brandObj?.logo_url} brandTheme={brandTheme} customLogoUrl={brandCustom?.logo_url} customCoverUrl={brandCustom?.cover_image_url} />
    );
  }

  

  if (selectedCategory) {
    if (isCatalogDataLoading) {
      return (
        <div className="h-screen flex items-center justify-center bg-background text-foreground">
          <div className="flex items-center gap-3 text-sm font-medium">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            A carregar catálogo…
          </div>
        </div>
      );
    }

    const categoryProducts = catalogProducts.filter((p) => p.category === selectedCategory);
    const catCustom = getCustom("category", selectedCategory);
    return (
      <CatalogViewer category={selectedCategory} products={categoryProducts} imagesByProduct={imagesByProduct} familyMap={familyMap} onBack={handleBack} customLogoUrl={catCustom?.logo_url} customCoverUrl={catCustom?.cover_image_url} />
    );
  }

  const getGridClass = (count: number) =>
    count <= 2 ? "grid-cols-2" : count <= 4 ? "grid-cols-2 grid-rows-2" : count <= 6 ? "grid-cols-3 grid-rows-2" : "grid-cols-3 grid-rows-3";

  return (
    <div
      className={`h-screen flex flex-col bg-background overflow-hidden ${cursorHidden ? "cursor-none" : ""} ${isKiosk ? "select-none" : ""}`}
    >
      <header className="flex-shrink-0 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <img src={vrcfLogo} alt="VRCF" className="h-20 w-auto object-contain drop-shadow-md" />
            <div>
              <h1 className="font-heading text-xl font-bold text-foreground leading-tight">VRCF</h1>
              <p className="text-[10px] font-medium text-muted-foreground tracking-wider uppercase">Informática & Segurança</p>
            </div>
          </div>
          <div className="text-center">
            <h2 className="font-heading text-sm font-bold text-foreground">
              {isKiosk ? "Showroom VRCF" : "Os Nossos Catálogos"}
            </h2>
          </div>
          {isKiosk ? (
            <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Modo Recepção</span>
          ) : (
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← Voltar
            </Link>
          )}
        </div>
      </header>

      <div className="flex-shrink-0 px-4 pt-3">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-md mx-auto">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="categories">Por Categoria</TabsTrigger>
            <TabsTrigger value="brands">Por Marca</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 p-3 min-h-0">
        {activeTab === "categories" && (
          <div className={`grid ${getGridClass(categories.length)} gap-3 h-full`}>
            {categories.map((category) => {
              const catProducts = category === "Kilomat" ? [] : catalogProducts.filter((p) => p.category === category);
              const isKilomat = category === "Kilomat";
              const productLabel = isKilomat ? "16 páginas" : `${catProducts.length} ${catProducts.length === 1 ? "produto" : "produtos"}`;
              const theme = CATEGORY_THEMES[category];
              const bgImage = theme?.bgImage || "/images/bg-outros.jpg";
              const icon = theme?.icon || "📦";

              return (
                <button
                  key={`cat-${category}`}
                  onClick={() => setSelectedCategory(category)}
                  className="group relative rounded-xl overflow-hidden border border-border hover:ring-2 hover:ring-primary/40 transition-all"
                >
                  <img src={bgImage} alt={category} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10 group-hover:from-black/80 transition-all" />
                  <div className="relative z-10 h-full flex flex-col items-center justify-center p-4">
                    <span className="text-3xl md:text-4xl mb-2 drop-shadow-lg">{icon}</span>
                    <h3 className="font-heading text-lg md:text-xl font-bold text-white drop-shadow-md">{category}</h3>
                    <p className="text-xs text-white/70 mt-1">{productLabel}</p>
                  </div>
                </button>
              );
            })}
            {categories.length === 0 && (
              <div className="col-span-full h-full flex flex-col items-center justify-center">
                <BookOpen className="h-16 w-16 text-muted-foreground/40" />
                <h3 className="mt-4 font-heading text-lg font-semibold text-foreground">Sem catálogos por categoria</h3>
              </div>
            )}
          </div>
        )}

        {activeTab === "brands" && (
          <div className={`grid ${getGridClass(catalogBrands.length)} gap-3 h-full`}>
            {catalogBrands.map((brand) => {
              const brandProducts = catalogProducts.filter((p) => p.brand_id === brand.id);
              return (
                <button
                  key={`brand-${brand.id}`}
                  onClick={() => setSelectedBrand(brand.name)}
                  className="group relative rounded-xl overflow-hidden border border-border hover:ring-2 hover:ring-primary/40 transition-all"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700" />
                  <div className="relative z-10 h-full flex flex-col items-center justify-center p-4">
                    {brand.logo_url ? (
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center p-2 mb-2 shadow-lg">
                        <img src={brand.logo_url} alt={brand.name} className="max-w-full max-h-full object-contain" />
                      </div>
                    ) : (
                      <span className="text-3xl md:text-4xl mb-2">🏷️</span>
                    )}
                    <h3 className="font-heading text-lg md:text-xl font-bold text-white drop-shadow-md">{brand.name}</h3>
                    <p className="text-xs text-white/70 mt-1">{brandProducts.length} {brandProducts.length === 1 ? "produto" : "produtos"}</p>
                  </div>
                </button>
              );
            })}
            {catalogBrands.length === 0 && (
              <div className="col-span-full h-full flex flex-col items-center justify-center">
                <BookOpen className="h-16 w-16 text-muted-foreground/40" />
                <h3 className="mt-4 font-heading text-lg font-semibold text-foreground">Sem catálogos por marca</h3>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Catalogos;
