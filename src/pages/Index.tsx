import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/ProductCard";
import { ProductDetailDialog } from "@/components/ProductDetailDialog";
import { useState, useMemo, useEffect } from "react";
import { Package, Loader2, ShoppingCart, ChevronLeft, ChevronRight, Phone, Mail, MapPin } from "lucide-react";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { ProductFilters } from "@/components/ProductFilters";
import kilomatLogo from "@/assets/kilomat-wordmark.png";
import kilomatShield from "@/assets/kilomat-logo.png";
import kilomatKIcon from "@/assets/kilomat-k-icon.png";
import { Link, useSearchParams } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { CartDrawer } from "@/components/CartDrawer";
import { Button } from "@/components/ui/button";
import SuggestionButton from "@/components/SuggestionButton";
import ContactButton from "@/components/ContactButton";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";
import ContactFloatingBubble from "@/components/ContactFloatingBubble";
import BrandsStrip from "@/components/BrandsStrip";

const PAGE_SIZE_OPTIONS = [12, 24, 48];

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [familyFilter, setFamilyFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState(searchParams.get("brand") || "all");
  const [sortBy, setSortBy] = useState("featured");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const updateBrandFilter = (v: string) => {
    setBrandFilter(v);
    setCurrentPage(1);
    const next = new URLSearchParams(searchParams);
    if (v === "all") next.delete("brand"); else next.set("brand", v);
    setSearchParams(next, { replace: true });
  };

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      // Paginate to bypass Supabase's default 1000-row cap.
      // Use exact count + parallel chunked range fetches with per-chunk retry,
      // so a single transient failure does not truncate the catalog.
      const COLUMNS = "id,name,sku,description,category,price,image_url,family_id,brand_id,featured,created_at";
      const PAGE = 1000;

      const { count, error: countError } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true });
      if (countError) throw countError;
      const total = count ?? 0;
      if (total === 0) return [];

      const fetchChunk = async (from: number): Promise<any[]> => {
        const to = Math.min(from + PAGE - 1, total - 1);
        let lastErr: any;
        for (let attempt = 0; attempt < 3; attempt++) {
          const { data, error } = await supabase
            .from("products")
            .select(COLUMNS)
            .order("created_at", { ascending: false })
            .range(from, to);
          if (!error && data) return data;
          lastErr = error;
          await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
        }
        throw lastErr ?? new Error("Failed to fetch products chunk");
      };

      const offsets: number[] = [];
      for (let i = 0; i < total; i += PAGE) offsets.push(i);
      // Limit concurrency to 3 to avoid overwhelming the API
      const results: any[][] = new Array(offsets.length);
      let idx = 0;
      const workers = Array.from({ length: Math.min(3, offsets.length) }, async () => {
        while (true) {
          const my = idx++;
          if (my >= offsets.length) return;
          results[my] = await fetchChunk(offsets[my]);
        }
      });
      await Promise.all(workers);
      return results.flat();
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
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

  const { data: brandFamilyLinks = [] } = useQuery({
    queryKey: ["brand_families"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brand_families").select("brand_id, family_id");
      if (error) throw error;
      return data;
    },
  });

  const { data: productImages = [] } = useQuery({
    queryKey: ["product_images"],
    queryFn: async () => {
      const pageSize = 1000;
      let from = 0;
      const all: any[] = [];
      while (true) {
        const { data, error } = await supabase
          .from("product_images")
          .select("*")
          .order("position", { ascending: true })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return all;
    },
  });

  const imagesByProduct = productImages.reduce((acc: Record<string, typeof productImages>, img) => {
    if (!acc[img.product_id]) acc[img.product_id] = [];
    acc[img.product_id].push(img);
    return acc;
  }, {});

  const familyMap = Object.fromEntries(families.map((f) => [f.id, f.name]));
  const brandMap = Object.fromEntries(brands.map((b) => [b.id, b.name]));

  const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const filtered = useMemo(() => {
    const result = products?.filter((p) => {
      const searchTerms = normalize(search).split(/\s+/).filter(Boolean);
      const nameNorm = normalize(p.name);
      const descNorm = normalize(p.description || "");
      const matchesSearch = searchTerms.length === 0 || searchTerms.every((term) =>
        nameNorm.includes(term) || descNorm.includes(term)
      );
      const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
      const matchesFamily = familyFilter === "all" || p.family_id === familyFilter;
      const matchesBrand = brandFilter === "all" || p.brand_id === brandFilter;
      return matchesSearch && matchesCategory && matchesFamily && matchesBrand;
    });

    if (!result) return [];

    return result.sort((a, b) => {
      // Featured always first
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;

      switch (sortBy) {
        case "price-asc":
          return (a.price ?? 0) - (b.price ?? 0);
        case "price-desc":
          return (b.price ?? 0) - (a.price ?? 0);
        case "name-asc":
          return a.name.localeCompare(b.name, "pt");
        case "name-desc":
          return b.name.localeCompare(a.name, "pt");
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });
  }, [products, search, categoryFilter, familyFilter, brandFilter, sortBy]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedProducts = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset page when filters/sort change
  const handleFilterChange = (setter: (v: string) => void, value: string, resetDependents?: () => void) => {
    setter(value);
    setCurrentPage(1);
    resetDependents?.();
  };

  const categories = [...new Set(products?.map((p) => p.category).filter(Boolean) || [])];
  // Family ↔ Brand explicit associations (union with derived-from-products for backwards compat)
  const explicitFamiliesByBrand = brandFamilyLinks.reduce<Record<string, Set<string>>>((acc, l: any) => {
    if (!acc[l.brand_id]) acc[l.brand_id] = new Set();
    acc[l.brand_id].add(l.family_id);
    return acc;
  }, {});
  const explicitBrandsByFamily = brandFamilyLinks.reduce<Record<string, Set<string>>>((acc, l: any) => {
    if (!acc[l.family_id]) acc[l.family_id] = new Set();
    acc[l.family_id].add(l.brand_id);
    return acc;
  }, {});

  const visibleFamilies = families.filter((f) => {
    if (categoryFilter !== "all" && f.category !== categoryFilter) return false;
    if (brandFilter === "all") return true;
    const explicit = explicitFamiliesByBrand[brandFilter]?.has(f.id);
    const derived = products?.some((p) => p.family_id === f.id && p.brand_id === brandFilter);
    return explicit || derived;
  });
  const visibleBrands = brands.filter((b) => {
    const matchesProducts = products?.some((p) => p.brand_id === b.id && (categoryFilter === "all" || p.category === categoryFilter) && (familyFilter === "all" || p.family_id === familyFilter));
    if (familyFilter !== "all") {
      const explicit = explicitBrandsByFamily[familyFilter]?.has(b.id);
      return matchesProducts || explicit;
    }
    return matchesProducts;
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex items-center justify-between px-3 py-2 sm:px-4 sm:py-4">
          <img src={kilomatLogo} alt="Kilomat Logo" className="h-10 sm:h-20 w-auto drop-shadow-md" />
          <div className="flex items-center gap-2 sm:gap-3">
            <DarkModeToggle />
            <Button variant="outline" size="sm" className="relative gap-1 sm:gap-1.5 text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-3" onClick={() => setIsOpen(true)}>
              <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Orçamento
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Button>
            <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Admin
            </Link>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-12 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-4">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Desde 2007 · Montijo
        </span>
        <h2 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Tudo para a sua obra
        </h2>
        <p className="mt-3 text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
          Mais de 18 anos a equipar profissionais e particulares — Construção, Ferramentas e Agrícola
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          <a
            href="tel:+351938283386"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            aria-label="Telefonar para Kilomat"
          >
            <Phone className="h-4 w-4" />
            <span>+351 938 283 386</span>
          </a>
          <a
            href="mailto:info@kilomat.pt"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            aria-label="Enviar email para Kilomat"
          >
            <Mail className="h-4 w-4" />
            <span>info@kilomat.pt</span>
          </a>
          <a
            href="https://www.google.com/maps/search/?api=1&query=Kilomat+Lda+Montijo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            aria-label="Ver Kilomat Lda no Google Maps"
          >
            <MapPin className="h-4 w-4" />
            <span>Estrada do Pau Queimado, Montijo</span>
          </a>
        </div>
      </section>

      <BrandsStrip />

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
      />

      <section className="container mx-auto px-4 pb-4" data-results-anchor>
        {!isLoading && filtered.length > 0 && (
          <p className="text-sm text-muted-foreground text-center">
            {filtered.length} produto{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
            {totalPages > 1 && ` — Página ${currentPage} de ${totalPages}`}
          </p>
        )}
      </section>

      <section className="container mx-auto px-4 pb-8">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : paginatedProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {paginatedProducts.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                sku={product.sku}
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
            <p className="mt-1 text-muted-foreground">Nenhum produto disponível no momento.</p>
          </div>
        )}
      </section>

      {(totalPages > 1 || filtered.length > 12) && (
        <section className="container mx-auto px-4 pb-16">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
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

      <footer className="border-t border-border bg-accent text-accent-foreground py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src={kilomatKIcon} alt="Kilomat" className="h-12 w-auto" />
              <div>
                <p className="font-heading font-bold text-sm">Kilomat — Materiais de Construção</p>
                <p className="text-xs text-accent-foreground/70">Materiais de construção, ferramentas, canalização e tintas</p>
                <p className="text-xs text-accent-foreground/70 mt-1">
                  <a href="tel:+351938283386" className="hover:text-primary transition-colors">+351 938 283 386</a>
                  {" · "}
                  <a href="mailto:info@kilomat.pt" className="hover:text-primary transition-colors">info@kilomat.pt</a>
                </p>
              </div>
            </div>
            <div className="text-center md:text-right space-y-1">
              <p className="text-xs text-accent-foreground/70">
                <a href="https://kilomat.pt" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                  kilomat.pt
                </a>
              </p>
              <p className="text-xs text-accent-foreground/70">
                Todos os preços apresentados incluem IVA à taxa legal em vigor.
              </p>
              <p className="text-xs text-accent-foreground/70">
                Os preços são meramente indicativos e podem sofrer alterações sem aviso prévio.
              </p>
              <p className="text-xs text-accent-foreground/70">
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
    </div>
  );
};

export default Index;
