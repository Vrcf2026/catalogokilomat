import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/ProductCard";
import { ProductDetailDialog } from "@/components/ProductDetailDialog";
import { useState, useMemo, useEffect, useRef } from "react";
import { Package, Loader2, ShoppingCart, ChevronLeft, ChevronRight, Phone, Mail, MapPin, Search, Send, Star } from "lucide-react";
import { getCategoryIcon, getCategoryMeta, allCategoryMeta, LayoutGrid as LayoutGridIcon } from "@/lib/categoryIcons";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { ProductFilters } from "@/components/ProductFilters";
import { Input } from "@/components/ui/input";
import { PRODUCT_COLUMNS, fetchAllRows } from "@/lib/fetchAllRows";
import kilomatLogo from "@/assets/kilomat-wordmark.png";
import kilomatShield from "@/assets/kilomat-logo.png";
import kilomatKIcon from "@/assets/kilomat-k-icon.png";
import { Link, useSearchParams } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { CartDrawer } from "@/components/CartDrawer";
import { Button } from "@/components/ui/button";
import SuggestionButton from "@/components/SuggestionButton";
import ContactButton from "@/components/ContactButton";
import { openCookiePreferences } from "@/components/CookieConsentBanner";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";
import ContactFloatingBubble from "@/components/ContactFloatingBubble";
import BrandsStrip from "@/components/BrandsStrip";
import WelcomeBanner from "@/components/WelcomeBanner";
import { SEO } from "@/components/SEO";

const PAGE_SIZE_OPTIONS = [24, 48, 96];

type HomeView = "home" | "catalog";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const categoriesScrollRef = useRef<HTMLDivElement>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [familyFilter, setFamilyFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState(searchParams.get("brand") || "all");
  const [sortBy, setSortBy] = useState("featured");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [activeView, setActiveView] = useState<HomeView>(
    (searchParams.get("brand") || searchParams.get("categoria")) ? "catalog" : "home"
  );
  const [catalogTitle, setCatalogTitle] = useState("Catálogo");
  const { totalItems, setIsOpen } = useCart();

  // Sync brand filter with URL ?brand=<id>
  useEffect(() => {
    const urlBrand = searchParams.get("brand") || "all";
    if (urlBrand !== brandFilter) {
      setBrandFilter(urlBrand);
      setCurrentPage(1);
      // Scroll to results
      setTimeout(() => {
        document.querySelector("[data-results-anchor]")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
    if (urlBrand !== "all") {
      setCategoryFilter("all");
      setFamilyFilter("all");
      setActiveView("catalog");
      setCatalogTitle("Marca");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when filters or debounced search change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, categoryFilter, familyFilter, brandFilter, pageSize]);

  const updateBrandFilter = (v: string) => {
    setBrandFilter(v);
    setCurrentPage(1);
    const next = new URLSearchParams(searchParams);
    if (v === "all") next.delete("brand"); else next.set("brand", v);
    setSearchParams(next, { replace: true });
  };

  const openCatalog = (type: "brand" | "category" | "all", value: string, title: string) => {
    setCatalogTitle(title);
    if (type === "brand") {
      updateBrandFilter(value);
      setCategoryFilter("all");
      setFamilyFilter("all");
    } else if (type === "category") {
      setCategoryFilter(value);
      updateBrandFilter("all");
      setFamilyFilter("all");
    } else {
      updateBrandFilter("all");
      setCategoryFilter("all");
      setFamilyFilter("all");
    }
    setCurrentPage(1);
    setActiveView("catalog");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goHome = () => {
    setActiveView("home");
    setSearch("");
    updateBrandFilter("all");
    setCategoryFilter("all");
    setFamilyFilter("all");
    setCurrentPage(1);
  };

  const { data: productsResult, isLoading } = useQuery({
    queryKey: ["products", "public-paginated", { debouncedSearch, categoryFilter, familyFilter, brandFilter, currentPage, pageSize, sortBy }],
    queryFn: async () => {
      const client = supabase as any;
      const buildFilters = (q: any) => {
        const term = debouncedSearch.trim();
        if (term) q = q.or(`name.ilike.%${term}%,sku.ilike.%${term}%`);
        if (categoryFilter !== "all") q = q.eq("category", categoryFilter);
        if (familyFilter !== "all") q = q.eq("family_id", familyFilter);
        if (brandFilter !== "all") q = q.eq("brand_id", brandFilter);
        return q;
      };
      const { count, error: countError } = await buildFilters(
        client.from("products").select("id", { count: "exact", head: true })
      );
      if (countError) throw countError;
      const total = count ?? 0;
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;
      const baseQuery = buildFilters(client.from("products").select(PRODUCT_COLUMNS));
      const sortedQuery = (() => {
        switch (sortBy) {
          case "name_asc":
            return baseQuery.order("name", { ascending: true }).order("id", { ascending: true });
          case "name_desc":
            return baseQuery.order("name", { ascending: false }).order("id", { ascending: true });
          case "price_asc":
            return baseQuery.order("price", { ascending: true, nullsFirst: false });
          case "price_desc":
            return baseQuery.order("price", { ascending: false, nullsFirst: false });
          case "newest":
            return baseQuery.order("created_at", { ascending: false });
          case "featured":
          default:
            return baseQuery
              .order("featured", { ascending: false })
              .order("created_at", { ascending: false });
        }
      })();
      const { data, error } = await sortedQuery.range(from, to);
      if (error) throw error;
      return { items: (data || []) as any[], total };
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
    enabled: activeView === "catalog",
  });
  const products = productsResult?.items ?? [];
  const total = productsResult?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Homepage highlights
  const { data: highlightedBrands = [] } = useQuery({
    queryKey: ["homepage_highlights", "brand"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("homepage_highlights")
        .select("ref_id, label, position")
        .eq("type", "brand")
        .eq("active", true)
        .order("position", { ascending: true });
      if (error) throw error;
      return data as { ref_id: string; label: string; position: number }[];
    },
  });

  const { data: highlightedCategories = [] } = useQuery({
    queryKey: ["homepage_highlights", "category"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("homepage_highlights")
        .select("ref_id, label, position")
        .eq("type", "category")
        .eq("active", true)
        .order("position", { ascending: true });
      if (error) throw error;
      return data as { ref_id: string; label: string; position: number }[];
    },
  });

  const { data: featuredProducts = [] } = useQuery({
    queryKey: ["homepage_products"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("products")
        .select(PRODUCT_COLUMNS)
        .eq("show_on_homepage", true)
        .order("name", { ascending: true })
        .limit(12);
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: brandStats } = useQuery({
    queryKey: ["public_brand_stats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("brand_id, brands(name)")
        .not("brand_id", "is", null);
      const counts: Record<string, number> = {};
      (data || []).forEach((p: any) => {
        const n = p.brands?.name;
        if (n) counts[n] = (counts[n] || 0) + 1;
      });
      return counts;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: families = [] } = useQuery({
    queryKey: ["families"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_families")
        .select("*")
        .order("category", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["brands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: visibleCategories = [] } = useQuery({
    queryKey: ["categories", "visible"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("categories")
        .select("id, name, ordem, visivel")
        .eq("visivel", true)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data || []) as { id: string; name: string; ordem: number }[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: brandFamilyLinks = [] } = useQuery({
    queryKey: ["brand_families"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brand_families").select("brand_id, family_id");
      if (error) throw error;
      return data;
    },
  });

  // Full association index derived from real products — used to keep
  // Category / Family / Brand filters fully interdependent.
  const { data: productAssoc = [] } = useQuery({
    queryKey: ["products", "filter_assoc_index"],
    queryFn: async () =>
      fetchAllRows<{ category: string | null; family_id: string | null; brand_id: string | null }>({
        table: "products",
        select: "category,family_id,brand_id",
        orderBy: "id",
        ascending: true,
      }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: hasPricesGlobal = false } = useQuery({
    queryKey: ["products", "has_prices"],
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from("products")
        .select("id", { count: "exact", head: true })
        .gt("price", 0);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
    staleTime: 5 * 60 * 1000,
  });

  const visibleIds = useMemo(() => products.map((p) => p.id), [products]);
  const { data: productImages = [] } = useQuery({
    queryKey: ["product_images", "page", visibleIds],
    enabled: visibleIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_images")
        .select("*")
        .in("product_id", visibleIds)
        .order("position", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const featuredIds = useMemo(() => featuredProducts.map((p: any) => p.id), [featuredProducts]);
  const { data: featuredImages = [] } = useQuery({
    queryKey: ["product_images", "featured_home", featuredIds],
    enabled: featuredIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_images")
        .select("*")
        .in("product_id", featuredIds)
        .order("position", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const imagesByProduct = productImages.reduce((acc: Record<string, typeof productImages>, img) => {
    if (!acc[img.product_id]) acc[img.product_id] = [];
    acc[img.product_id].push(img);
    return acc;
  }, {});
  const featuredImagesByProduct = featuredImages.reduce((acc: Record<string, any[]>, img: any) => {
    if (!acc[img.product_id]) acc[img.product_id] = [];
    acc[img.product_id].push(img);
    return acc;
  }, {});

  const familyMap = Object.fromEntries(families.map((f) => [f.id, f.name]));
  const brandMap = Object.fromEntries(brands.map((b) => [b.id, b.name]));

  const paginatedProducts = products;
  const hasAnyPrice = products.some((p) => p.price != null);

  // Reset page when filters/sort change
  const handleFilterChange = (setter: (v: string) => void, value: string, resetDependents?: () => void) => {
    setter(value);
    setCurrentPage(1);
    resetDependents?.();
  };

  // Fully interdependent filters derived from real product associations.
  // A value is "visible" in a filter if at least one product matches the
  // currently selected values of the OTHER filters.
  const matchesAssoc = (row: any, opts: { skipCategory?: boolean; skipFamily?: boolean; skipBrand?: boolean }) => {
    if (!opts.skipCategory && categoryFilter !== "all" && row.category !== categoryFilter) return false;
    if (!opts.skipFamily && familyFilter !== "all" && row.family_id !== familyFilter) return false;
    if (!opts.skipBrand && brandFilter !== "all" && row.brand_id !== brandFilter) return false;
    return true;
  };

  const allCategoriesFromFamilies = [...new Set(families.map((f) => f.category).filter(Boolean))];
  const visibleCategorySet = new Set(
    productAssoc.filter((r) => matchesAssoc(r, { skipCategory: true })).map((r) => r.category).filter(Boolean) as string[]
  );
  const categories = allCategoriesFromFamilies.filter((c) =>
    categoryFilter !== "all" && c === categoryFilter ? true : visibleCategorySet.has(c as string)
  );

  const visibleFamilyIdSet = new Set(
    productAssoc.filter((r) => matchesAssoc(r, { skipFamily: true })).map((r) => r.family_id).filter(Boolean) as string[]
  );
  const visibleFamilies = families.filter((f) =>
    familyFilter !== "all" && f.id === familyFilter ? true : visibleFamilyIdSet.has(f.id)
  );

  const visibleBrandIdSet = new Set(
    productAssoc.filter((r) => matchesAssoc(r, { skipBrand: true })).map((r) => r.brand_id).filter(Boolean) as string[]
  );
  const visibleBrands = brands.filter((b) =>
    brandFilter !== "all" && b.id === brandFilter ? true : visibleBrandIdSet.has(b.id)
  );

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Kilomat — Catálogo de Materiais de Construção | Montijo"
        description="Catálogo Kilomat: materiais de construção, ferramentas, canalização, tintas e EPI no Montijo. Peça orçamento online."
        path="/"
      />
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex items-center gap-3 px-3 py-2 sm:px-4 sm:py-3">
          <button onClick={goHome} aria-label="Ir para o início — Kilomat" className="shrink-0">
            <img src={kilomatLogo} alt="Kilomat Logo" width={510} height={126} className="h-8 sm:h-10 w-auto drop-shadow-md" loading="eager" fetchPriority="high" decoding="async" />
          </button>
          <div className="relative flex-1 max-w-2xl mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar em todo o catálogo..."
              aria-label="Pesquisar em todo o catálogo"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && search.trim().length > 0) {
                  // Pesquisa global: limpa filtros activos
                  setCategoryFilter("all");
                  setFamilyFilter("all");
                  updateBrandFilter("all");
                  setCurrentPage(1);
                  setCatalogTitle(`Resultados para "${search.trim()}"`);
                  setActiveView("catalog");
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              className="pl-9 h-9 text-sm bg-card border-border"
            />
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <DarkModeToggle />
            <Button aria-label={`Abrir pedido de orçamento${totalItems > 0 ? ` (${totalItems} ${totalItems === 1 ? "item" : "itens"})` : ""}`} variant="outline" size="sm" className="relative gap-1 sm:gap-1.5 text-xs sm:text-sm h-9 px-2.5 sm:px-3" onClick={() => setIsOpen(true)}>
              <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Orçamento</span>
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      {activeView === "home" ? (
      <>
      {/* Título da loja */}
      <div className="container mx-auto px-4 pt-4 pb-1 text-center">
        <h1 className="text-lg sm:text-xl font-bold text-foreground">
          Materiais de Construção, Ferramentas e Agrícola
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Mais de 18 anos a servir profissionais e particulares em Montijo
        </p>
      </div>

      {/* Barra de categorias */}
      {visibleCategories.length > 0 && (
        <section className="border-b border-border bg-card/40">
          <div className="container mx-auto px-2 sm:px-4">
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Explorar por categoria
              </h2>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Scroll esquerda"
                  onClick={() => categoriesScrollRef.current?.scrollBy({ left: -200, behavior: "smooth" })}
                  className="p-1 rounded-full hover:bg-muted transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                </button>
                <button
                  type="button"
                  aria-label="Scroll direita"
                  onClick={() => categoriesScrollRef.current?.scrollBy({ left: 200, behavior: "smooth" })}
                  className="p-1 rounded-full hover:bg-muted transition-colors"
                >
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>
            <div className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
              <div
                ref={categoriesScrollRef}
                className="flex overflow-x-auto gap-2 px-4 pb-3 pt-1 [&::-webkit-scrollbar]:hidden"
                style={{ scrollbarWidth: "none" }}
              >
                {(() => {
                  const AllIcon = allCategoryMeta.icon;
                  const allActive = categoryFilter === "all";
                  return (
                    <button
                      type="button"
                      aria-label="Ver todos os produtos"
                      onClick={() => openCatalog("all", "all", "Todos os produtos")}
                      className={`shrink-0 flex flex-col items-center justify-center gap-1.5 p-2 min-w-[80px] w-[80px] h-[80px] sm:min-w-[96px] sm:w-[96px] sm:h-[96px] rounded-xl border transition-all ${allCategoryMeta.bg} ${allActive ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"}`}
                    >
                      <AllIcon className={`h-6 w-6 sm:h-7 sm:w-7 ${allCategoryMeta.color}`} />
                      <span className="text-[10px] sm:text-[11px] font-medium text-center leading-tight line-clamp-2 text-foreground">Todos</span>
                    </button>
                  );
                })()}
                {visibleCategories.map((c) => {
                  const meta = getCategoryMeta(c.name);
                  const Icon = meta.icon;
                  const active = categoryFilter === c.name;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-label={`Ver categoria ${c.name}`}
                      onClick={() => openCatalog("category", c.name, c.name)}
                      title={c.name}
                      className={`shrink-0 flex flex-col items-center justify-center gap-1.5 p-2 min-w-[80px] w-[80px] h-[80px] sm:min-w-[96px] sm:w-[96px] sm:h-[96px] rounded-xl border transition-all ${meta.bg} ${active ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"}`}
                    >
                      <Icon className={`h-6 w-6 sm:h-7 sm:w-7 ${meta.color}`} />
                      <span className="text-[10px] sm:text-[11px] font-medium text-center leading-tight line-clamp-2 text-foreground">{c.name}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  aria-label="Ver todas as categorias"
                  onClick={() => openCatalog("all", "all", "Todos os produtos")}
                  className="flex flex-col items-center justify-center gap-1.5 p-2 min-w-[80px] w-[80px] h-[80px] sm:min-w-[96px] sm:w-[96px] sm:h-[96px] rounded-xl border border-dashed border-border hover:border-primary/50 transition-all shrink-0 text-muted-foreground hover:text-primary"
                >
                  <LayoutGridIcon className="h-6 w-6" />
                  <span className="text-[10px] sm:text-[11px] font-medium text-center">Ver todas</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      <BrandsStrip />

      {/* Categorias em destaque */}
      {highlightedCategories.length > 0 && (
        <section className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 bg-border" />
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Navegue por categoria</h2>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {highlightedCategories.map((c) => {
              const Icon = getCategoryIcon(c.ref_id);
              return (
                <button
                  key={c.ref_id}
                  type="button"
                  aria-label={`Ver produtos da categoria ${c.label}`}
                  onClick={() => openCatalog("category", c.ref_id, c.label)}
                  className="flex flex-col items-center justify-center gap-2 p-3 bg-card border border-border rounded-xl hover:border-primary hover:shadow-sm transition-all text-center min-h-[80px]"
                >
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-[11px] font-semibold text-foreground leading-tight">{c.label}</span>
                </button>
              );
            })}
            <button
              type="button"
              aria-label="Ver todos os produtos"
              onClick={() => openCatalog("all", "all", "Todos os produtos")}
              className="flex flex-col items-center justify-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl hover:border-primary hover:bg-primary/10 transition-all text-center min-h-[80px]"
            >
              <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                <LayoutGridIcon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-[11px] font-semibold text-primary leading-tight">Ver tudo</span>
            </button>
          </div>
        </section>
      )}

      {/* Produtos em destaque */}
      {featuredProducts.length > 0 && (
        <section className="container mx-auto px-4 py-4 pb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-px flex-1 bg-border" />
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-medium">Produtos em Destaque</h2>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {featuredProducts.map((product: any) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                sku={product.sku}
                slug={product.slug}
                description={product.description}
                category={product.category}
                price={product.price}
                imageUrl={product.image_url}
                images={featuredImagesByProduct[product.id] || []}
                familyName={product.family_id ? familyMap[product.family_id] || null : null}
                brandName={product.brand_id ? brandMap[product.brand_id] || null : null}
                featured={product.featured}
                onClick={() => setSelectedProduct({
                  id: product.id,
                  name: product.name,
                  sku: product.sku,
                  description: product.description,
                  category: product.category,
                  price: product.price,
                  imageUrl: product.image_url,
                  images: featuredImagesByProduct[product.id] || [],
                  familyName: product.family_id ? familyMap[product.family_id] || null : null,
                  brandName: product.brand_id ? brandMap[product.brand_id] || null : null,
                })}
              />
            ))}
          </div>
        </section>
      )}
      </>
      ) : (
      <>
      {/* Catalog header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center gap-3 sticky top-[53px] sm:top-[61px] z-40">
        <Button variant="outline" size="sm" onClick={goHome} className="gap-1.5 shrink-0">
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Início</span>
        </Button>
        <h2 className="font-heading font-semibold text-sm text-foreground truncate hidden md:inline">{catalogTitle}</h2>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar nesta selecção..."
            aria-label="Pesquisar nesta selecção"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="pl-9 h-9 text-sm bg-background border-border"
          />
        </div>
        {total > 0 && (
          <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">{total} produtos</span>
        )}
      </div>

      <ProductFilters
        search={search}
        onSearchChange={(v) => { setSearch(v); setCurrentPage(1); }}
        categoryFilter={categoryFilter}
        onCategoryChange={(v) => handleFilterChange(setCategoryFilter, v, () => { setFamilyFilter("all"); setBrandFilter("all"); })}
        familyFilter={familyFilter}
        onFamilyChange={(v) => handleFilterChange(setFamilyFilter, v)}
        brandFilter={brandFilter}
        onBrandChange={updateBrandFilter}
        sortBy={sortBy}
        onSortChange={(v) => { setSortBy(v); setCurrentPage(1); }}
        categories={categories}
        visibleFamilies={visibleFamilies}
        visibleBrands={visibleBrands}
        hasPrices={hasPricesGlobal}
      />

      <section className="container mx-auto px-4 pb-2" data-results-anchor>
        <h2 className="sr-only">Resultados da pesquisa</h2>
        {!isLoading && total > 0 && (
          <p className="text-sm text-muted-foreground text-center">
            {total} produto{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
            {totalPages > 1 && totalPages <= 50 && ` — Página ${currentPage} de ${totalPages}`}
            {totalPages > 50 && ` — Página ${currentPage}`}
          </p>
        )}
      </section>

      <section className="container mx-auto px-4 pb-8">
        <h2 className="sr-only">Lista de produtos</h2>
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : paginatedProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {paginatedProducts.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                sku={product.sku}
                slug={product.slug}
                description={product.description}
                category={product.category}
                price={product.price}
                imageUrl={product.image_url}
                images={imagesByProduct[product.id] || []}
                familyName={product.family_id ? familyMap[product.family_id] || null : null}
                featured={product.featured}
                onClick={() => setSelectedProduct({
                  id: product.id,
                  name: product.name,
                  sku: product.sku,
                  description: product.description,
                  category: product.category,
                  price: product.price,
                  imageUrl: product.image_url,
                  images: imagesByProduct[product.id] || [],
                  familyName: product.family_id ? familyMap[product.family_id] || null : null,
                  brandName: product.brand_id ? brandMap[product.brand_id] || null : null,
                })}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Package className="h-16 w-16 mx-auto text-muted-foreground/40" />
            <h3 className="mt-4 font-heading text-lg font-semibold text-foreground">Nenhum produto encontrado</h3>
            <p className="mt-1 text-muted-foreground">Tente ajustar os filtros.</p>
          </div>
        )}
      </section>

      {(totalPages > 1 || total > 24) && (
        <section className="container mx-auto px-4 pb-16">
          <h2 className="sr-only">Paginação e número de produtos por página</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Página anterior"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    if (totalPages <= 7) return true;
                    if (page === 1 || page === totalPages) return true;
                    if (Math.abs(page - currentPage) <= 1) return true;
                    return false;
                  })
                  .map((page, idx, arr) => {
                    const prev = arr[idx - 1];
                    const showEllipsis = prev && page - prev > 1;
                    return (
                      <span key={page} className="flex items-center gap-1">
                        {showEllipsis && <span className="px-1 text-muted-foreground">…</span>}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          aria-label={`Ir para a página ${page}`}
                          aria-current={currentPage === page ? "page" : undefined}
                          className="min-w-[36px]"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      </span>
                    );
                  })}
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Página seguinte"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Mostrar:</span>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <Button
                  key={size}
                  variant={pageSize === size ? "default" : "outline"}
                  size="sm"
                  aria-label={`Mostrar ${size} produtos por página`}
                  className="min-w-[36px]"
                  onClick={() => { setPageSize(size); setCurrentPage(1); }}
                >
                  {size}
                </Button>
              ))}
            </div>
          </div>
        </section>
      )}
      </>
      )}

      <footer className="border-t border-border bg-accent text-accent-foreground py-8">
        <div className="container mx-auto px-4 space-y-8">
          {/* Hero info movido do topo */}
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <p className="font-heading text-lg sm:text-xl font-semibold">
              Mais de 18 anos a equipar profissionais e particulares
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-accent-foreground">
              <a href="tel:+351938283386" className="inline-flex items-center gap-2 hover:text-primary transition-colors">
                <Phone className="h-4 w-4" /> +351 938 283 386
              </a>
              <a href="mailto:info@kilomat.pt" className="inline-flex items-center gap-2 hover:text-primary transition-colors">
                <Mail className="h-4 w-4" /> info@kilomat.pt
              </a>
              <a
                href="https://www.google.com/maps/search/?api=1&query=Kilomat+Lda+Montijo"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 hover:text-primary transition-colors"
              >
                <MapPin className="h-4 w-4" /> Estrada do Pau Queimado, Montijo
              </a>
            </div>
          </div>

          {/* Como funciona */}
          <div className="bg-transparent border-t border-border py-4 px-2 sm:px-4">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-4xl mx-auto">
              <div className="text-center sm:text-left shrink-0">
                <h2 className="text-sm font-semibold text-accent-foreground leading-tight">Como funciona?</h2>
                <p className="text-xs text-accent-foreground/85 leading-tight">Catálogo · Selecção · Orçamento</p>
              </div>
              <div className="flex flex-row items-center justify-center gap-2 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background/20 whitespace-nowrap">
                  <div className="h-7 w-7 rounded-full bg-red-600/20 flex items-center justify-center shrink-0">
                    <Search className="h-3.5 w-3.5 text-red-500" />
                  </div>
                  <span className="text-sm text-accent-foreground font-medium">Pesquise</span>
                  <span className="text-xs text-accent-foreground/85 hidden sm:inline">— por produto, marca ou categoria</span>
                </div>

                <ChevronRight className="h-4 w-4 text-accent-foreground/70 shrink-0 hidden sm:block" />

                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background/20 whitespace-nowrap">
                  <div className="h-7 w-7 rounded-full bg-red-600/20 flex items-center justify-center shrink-0">
                    <ShoppingCart className="h-3.5 w-3.5 text-red-500" />
                  </div>
                  <span className="text-sm text-accent-foreground font-medium">Seleccione</span>
                  <span className="text-xs text-accent-foreground/85 hidden sm:inline">— adicione ao orçamento</span>
                </div>

                <ChevronRight className="h-4 w-4 text-accent-foreground/70 shrink-0 hidden sm:block" />

                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background/20 whitespace-nowrap">
                  <div className="h-7 w-7 rounded-full bg-red-600/20 flex items-center justify-center shrink-0">
                    <Send className="h-3.5 w-3.5 text-red-500" />
                  </div>
                  <span className="text-sm text-accent-foreground font-medium">Receba</span>
                  <span className="text-xs text-accent-foreground/85 hidden sm:inline">— resposta em 24 horas</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src={kilomatKIcon} alt="Ícone Kilomat" width={90} height={86} className="h-12 w-auto" loading="lazy" decoding="async" />
              <div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="font-heading font-bold text-sm">Kilomat — Materiais de Construção</p>
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-red-400/40 bg-red-500/10 text-[11px] font-medium text-red-300">
                    <Star className="h-3 w-3 fill-current" />
                    Desde 2007 · Montijo
                  </span>
                </div>
                <p className="text-xs text-accent-foreground/85 mt-1">Materiais de construção, ferramentas, canalização e tintas</p>
                <p className="text-xs text-accent-foreground/85 mt-1">
                  <a href="tel:+351938283386" className="hover:text-primary transition-colors">+351 938 283 386</a>
                  {" · "}
                  <a href="mailto:info@kilomat.pt" className="hover:text-primary transition-colors">info@kilomat.pt</a>
                </p>
              </div>
            </div>
            <div className="text-center md:text-right space-y-1">
              <p className="text-xs text-accent-foreground/85">
                <a href="https://kilomat.pt" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                  kilomat.pt
                </a>
              </p>
              {hasAnyPrice && (
                <>
                  <p className="text-xs text-accent-foreground/85">
                    Todos os preços apresentados incluem IVA à taxa legal em vigor.
                  </p>
                  <p className="text-xs text-accent-foreground/85">
                    Os preços são meramente indicativos e podem sofrer alterações sem aviso prévio.
                  </p>
                </>
              )}
              <p className="text-xs text-accent-foreground/85">
                As imagens apresentadas são meramente ilustrativas.
              </p>
              <p className="text-xs mt-2 space-x-3">
                <Link to="/termos-e-condicoes" className="text-primary hover:underline transition-colors">
                  Termos e Condições
                </Link>
                <Link to="/politica-de-privacidade" className="text-primary hover:underline transition-colors">
                  Privacidade
                </Link>
                <Link to="/politica-de-cookies" className="text-primary hover:underline transition-colors">
                  Cookies
                </Link>
                <button
                  type="button"
                  onClick={openCookiePreferences}
                  className="text-primary hover:underline transition-colors"
                >
                  Gerir Cookies
                </button>
                <a
                  href="https://www.livroreclamacoes.pt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline transition-colors"
                >
                  Livro de Reclamações
                </a>
                <SuggestionButton />
                <ContactButton />
              </p>
            </div>
          </div>
        </div>
      </footer>

      {selectedProduct && (
        <ProductDetailDialog
          open={!!selectedProduct}
          onOpenChange={(open) => !open && setSelectedProduct(null)}
          product={selectedProduct}
        />
      )}

      <CartDrawer />
      <ScrollToTopButton />
      <ContactFloatingBubble />
      <WelcomeBanner />
    </div>
  );
};

export default Index;
