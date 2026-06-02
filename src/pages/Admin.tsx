import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard } from "@/components/ProductCard";
import { AddProductDialog } from "@/components/AddProductDialog";
import { EditProductDialog } from "@/components/EditProductDialog";
import { ManageFamiliesDialog } from "@/components/ManageFamiliesDialog";
import { ManageCategoriesDialog } from "@/components/ManageCategoriesDialog";
import { ManageBrandsDialog } from "@/components/ManageBrandsDialog";
import { ImportProductsDialog } from "@/components/ImportProductsDialog";
import { CatalogManagerDialog } from "@/components/CatalogManagerDialog";
import { CatalogCustomizationDialog } from "@/components/CatalogCustomizationDialog";
import { ImageHealthCheckDialog } from "@/components/ImageHealthCheckDialog";
import { BulkImageSearchDialog } from "@/components/BulkImageSearchDialog";
import { ReprocessAllImagesButton } from "@/components/ReprocessAllImagesButton";
import { MigrateImagesDialog } from "@/components/MigrateImagesDialog";
import { GenerateDescriptionsDialog } from "@/components/GenerateDescriptionsDialog";
import HomepageHighlightsDialog from "@/components/HomepageHighlightsDialog";
import { KioskAccessButton } from "@/components/KioskAccessButton";
import { AdminDashboard } from "@/components/AdminDashboard";
import { CategoriesManager } from "@/components/CategoriesManager";
import { BarcodeScannerDialog } from "@/components/BarcodeScannerDialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useEffect } from "react";
import { Search, ShieldCheck, Package, Loader2, LogOut, Trash2, CheckSquare, Square, XSquare, Settings2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Image as ImageIcon, ImageOff, Tag, Layers, Bookmark } from "lucide-react";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { PRODUCT_COLUMNS } from "@/lib/fetchAllRows";
import { SEO } from "@/components/SEO";

const Admin = () => {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [familyFilter, setFamilyFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [noImageFilter, setNoImageFilter] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkBrand, setBulkBrand] = useState("");
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkFamily, setBulkFamily] = useState("");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryFilter, familyFilter, brandFilter, noImageFilter, pageSize]);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const productsQueryKey = ["products", "paginated", { debouncedSearch, categoryFilter, familyFilter, brandFilter, noImageFilter, page, pageSize }];
  const { data: productsResult, isLoading } = useQuery({
    queryKey: productsQueryKey,
    queryFn: async () => {
      const client = supabase as any;
      const buildFilters = (q: any) => {
        if (debouncedSearch.trim()) q = q.ilike("name", `%${debouncedSearch.trim()}%`);
        if (categoryFilter !== "all") q = q.eq("category", categoryFilter);
        if (familyFilter !== "all") q = q.eq("family_id", familyFilter);
        if (brandFilter === "none") q = q.is("brand_id", null);
        else if (brandFilter !== "all") q = q.eq("brand_id", brandFilter);
        if (noImageFilter) q = q.is("image_url", null);
        return q;
      };
      const countQuery = buildFilters(client.from("products").select("id", { count: "exact", head: true }));
      const { count, error: countError } = await countQuery;
      if (countError) throw countError;
      const total = count ?? 0;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      let dataQuery = buildFilters(client.from("products").select(PRODUCT_COLUMNS))
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to);
      const { data, error } = await dataQuery;
      if (error) throw error;
      return { items: (data || []) as any[], total };
    },
  });
  const products = productsResult?.items;
  const total = productsResult?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

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

  const { data: dbCategories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true });
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

  const visibleIds = useMemo(() => (products || []).map((p) => p.id), [products]);
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

  const imagesByProduct = productImages.reduce((acc: Record<string, typeof productImages>, img) => {
    if (!acc[img.product_id]) acc[img.product_id] = [];
    acc[img.product_id].push(img);
    return acc;
  }, {});

  const familyMap = Object.fromEntries(families.map((f) => [f.id, f.name]));
  const brandMap = Object.fromEntries(brands.map((b) => [b.id, b.name]));

  const filtered = products;
  const filteredIds = useMemo(() => new Set(filtered?.map(p => p.id) || []), [filtered]);
  
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!filtered) return;
    const allSelected = filtered.every(p => selectedIds.has(p.id));
    if (allSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filtered.forEach(p => next.delete(p.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filtered.forEach(p => next.add(p.id));
        return next;
      });
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    if (!count) return;
    if (!confirm(`Tens a certeza que queres apagar ${count} produto(s)? Esta ação não pode ser revertida.`)) return;
    
    setDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      // Delete gallery images first
      await supabase.from("product_images").delete().in("product_id", ids);
      // Delete products
      const { error } = await supabase.from("products").delete().in("id", ids);
      if (error) throw error;
      
      toast.success(`${count} produto(s) apagado(s) com sucesso`);
      setSelectedIds(new Set());
      setSelectionMode(false);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product_images"] });
    } catch (error) {
      toast.error("Erro ao apagar produtos");
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkClearImages = async () => {
    const count = selectedIds.size;
    if (!count) return;
    if (!confirm(`Apagar TODAS as imagens de ${count} produto(s)? Esta ação não pode ser revertida.`)) return;
    setBulkBusy(true);
    try {
      const ids = Array.from(selectedIds);
      await supabase.from("product_images").delete().in("product_id", ids);
      const { error } = await supabase.from("products").update({ image_url: null }).in("id", ids);
      if (error) throw error;
      toast.success(`Imagens removidas de ${count} produto(s)`);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product_images"] });
    } catch {
      toast.error("Erro ao remover imagens");
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkSetBrand = async () => {
    if (!bulkBrand || !selectedIds.size) return;
    setBulkBusy(true);
    try {
      const ids = Array.from(selectedIds);
      const value = bulkBrand === "none" ? null : bulkBrand;
      const { error } = await supabase.from("products").update({ brand_id: value }).in("id", ids);
      if (error) throw error;
      toast.success(`Marca aplicada a ${ids.length} produto(s)`);
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch {
      toast.error("Erro ao aplicar marca");
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkSetCategory = async () => {
    if (!bulkCategory || !selectedIds.size) return;
    setBulkBusy(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase.from("products").update({ category: bulkCategory, family_id: null }).in("id", ids);
      if (error) throw error;
      toast.success(`Categoria aplicada a ${ids.length} produto(s)`);
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch {
      toast.error("Erro ao aplicar categoria");
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkSetFamily = async () => {
    if (!bulkFamily || !selectedIds.size) return;
    setBulkBusy(true);
    try {
      const ids = Array.from(selectedIds);
      const value = bulkFamily === "none" ? null : bulkFamily;
      const { error } = await supabase.from("products").update({ family_id: value }).in("id", ids);
      if (error) throw error;
      toast.success(`Família aplicada a ${ids.length} produto(s)`);
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch {
      toast.error("Erro ao aplicar família");
    } finally {
      setBulkBusy(false);
    }
  };

  const navigateProduct = (dir: -1 | 1) => {
    if (!editingProduct || !filtered) return;
    const idx = filtered.findIndex((p) => p.id === editingProduct.id);
    if (idx === -1) return;
    const next = filtered[idx + dir];
    if (next) setEditingProduct(next);
  };

  const editingIdx = editingProduct && filtered ? filtered.findIndex((p) => p.id === editingProduct.id) : -1;
  const hasPrev = editingIdx > 0;
  const hasNext = editingIdx >= 0 && filtered ? editingIdx < filtered.length - 1 : false;

  const categoryNames = dbCategories.map((c) => c.name);
  const visibleFamilies = categoryFilter === "all" ? families : families.filter((f) => f.category === categoryFilter);
  const visibleBrands = brands;

  const handleBarcodeDetected = async (code: string) => {
    const cleaned = code.trim();
    if (!cleaned) return;
    toast.info(`Código lido: ${cleaned}`);
    try {
      // Try exact SKU first, then fuzzy
      let { data } = await (supabase as any)
        .from("products")
        .select(PRODUCT_COLUMNS)
        .eq("sku", cleaned)
        .limit(1);
      if (!data || data.length === 0) {
        const res = await (supabase as any)
          .from("products")
          .select(PRODUCT_COLUMNS)
          .ilike("sku", `%${cleaned}%`)
          .limit(2);
        data = res.data;
      }
      if (!data || data.length === 0) {
        toast.error(`Nenhum produto com código "${cleaned}"`);
        return;
      }
      setEditingProduct(data[0]);
    } catch (e: any) {
      toast.error("Erro ao procurar produto: " + e.message);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Painel de Administração — Kilomat"
        description="Gestão interna de produtos, catálogos e marcas Kilomat. Acesso restrito a administradores."
        path="/admin"
      />
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-primary" />
            <div>
              <h1 className="font-heading text-xl font-bold text-foreground leading-tight">Kilomat</h1>
              <p className="text-[10px] font-medium text-muted-foreground tracking-wider uppercase">Materiais de Construção</p>
            </div>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Admin</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <AddProductDialog families={families} categories={categoryNames} brands={brands} />
            <BarcodeScannerDialog onDetected={handleBarcodeDetected} />
            <Button
              variant={toolsOpen ? "default" : "outline"}
              size="sm"
              className="gap-1.5"
              onClick={() => setToolsOpen((v) => !v)}
            >
              <Settings2 className="h-4 w-4" />
              Ferramentas
              {toolsOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
            <KioskAccessButton />
            <DarkModeToggle />
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {toolsOpen && (
          <div className="border-t border-border bg-muted/30">
            <div className="container mx-auto px-4 py-3 flex items-center gap-2 flex-wrap">
              <ManageCategoriesDialog categories={dbCategories} />
              <ManageFamiliesDialog families={families} categories={categoryNames} />
              <ManageBrandsDialog brands={brands} />
              <ImportProductsDialog families={families} categories={categoryNames} brands={brands} />
              <CatalogManagerDialog
                products={products || []}
                imagesByProduct={imagesByProduct}
                familyMap={familyMap}
                categories={categoryNames}
                brands={brands}
                brandMap={brandMap}
              />
              <CatalogCustomizationDialog categories={categoryNames} brands={brands} />
              <ImageHealthCheckDialog
                products={products || []}
                productImages={productImages}
                onEditProduct={(productId) => {
                  const product = products?.find(p => p.id === productId);
                  if (product) setEditingProduct(product);
                }}
                onImagesRemoved={() => {
                  queryClient.invalidateQueries({ queryKey: ["products"] });
                  queryClient.invalidateQueries({ queryKey: ["product_images"] });
                }}
              />
              <BulkImageSearchDialog products={products || []} productImages={productImages} />
              <ReprocessAllImagesButton />
              <MigrateImagesDialog />
              <GenerateDescriptionsDialog products={products || []} />
              <HomepageHighlightsDialog brands={brands} categories={categoryNames} />
            </div>
          </div>
        )}
      </header>

      <section className="container mx-auto px-4 py-6">
        <div className="flex justify-end mb-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setDashboardOpen((v) => !v)}
          >
            {dashboardOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {dashboardOpen ? "Ocultar Dashboard" : "Mostrar Dashboard"}
          </Button>
        </div>
        {dashboardOpen && (
          <AdminDashboard
            products={products || []}
            productImages={productImages}
            families={families}
            brands={brands}
            onFilterNoImage={() => {
              setNoImageFilter(true);
              setDashboardOpen(false);
              toast.info("A mostrar apenas produtos sem imagem");
            }}
          />
        )}
      </section>

      <Tabs defaultValue="produtos" className="container mx-auto px-4">
        <TabsList>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
        </TabsList>
        <TabsContent value="produtos">
      <section className="py-8">
        <div className="flex flex-col sm:flex-row gap-3 max-w-3xl mx-auto flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar produtos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setFamilyFilter("all"); setBrandFilter("all"); }}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Categorias</SelectItem>
              {[...categoryNames].sort((a, b) => a.localeCompare(b, "pt", { sensitivity: "base" })).map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {visibleFamilies.length > 0 && (
            <Select value={familyFilter} onValueChange={setFamilyFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Famílias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Famílias</SelectItem>
                {[...visibleFamilies].sort((a, b) => a.name.localeCompare(b.name, "pt", { sensitivity: "base" })).map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {visibleBrands.length > 0 && (
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Marcas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Marcas</SelectItem>
                <SelectItem value="none">Sem marca</SelectItem>
                {[...visibleBrands].sort((a, b) => a.name.localeCompare(b.name, "pt", { sensitivity: "base" })).map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            type="button"
            variant={noImageFilter ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => setNoImageFilter((v) => !v)}
            title="Mostrar apenas produtos sem imagem"
          >
            <ImageOff className="h-4 w-4" />
            Sem imagem
            {noImageFilter && <X className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </section>

      <section className="pb-16">
        {/* Selection toolbar */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Button
            variant={selectionMode ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setSelectionMode(!selectionMode);
              if (selectionMode) setSelectedIds(new Set());
            }}
          >
            {selectionMode ? <XSquare className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
            {selectionMode ? "Cancelar" : "Selecionar"}
          </Button>
          {selectionMode && (
            <>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={toggleSelectAll}>
                {filtered && filtered.length > 0 && filtered.every(p => selectedIds.has(p.id))
                  ? <><Square className="h-4 w-4" /> Desselecionar todos</>
                  : <><CheckSquare className="h-4 w-4" /> Selecionar todos ({filtered?.length || 0})</>
                }
              </Button>
              {selectedIds.size > 0 && (
                <Button variant="destructive" size="sm" className="gap-1.5" onClick={handleBulkDelete} disabled={deleting}>
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Apagar {selectedIds.size} selecionado{selectedIds.size !== 1 ? "s" : ""}
                </Button>
              )}
            </>
          )}
        </div>

        {selectionMode && selectedIds.size > 0 && (
          <div className="flex items-center gap-2 mb-4 flex-wrap p-3 rounded-lg border border-border bg-muted/30">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">
              Ações em massa ({selectedIds.size}):
            </span>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleBulkClearImages} disabled={bulkBusy}>
              <ImageIcon className="h-4 w-4" /> Apagar imagens
            </Button>
            <div className="flex items-center gap-1">
              <Select value={bulkBrand} onValueChange={setBulkBrand}>
                <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Marca..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem marca</SelectItem>
                  {[...brands].sort((a, b) => a.name.localeCompare(b.name, "pt", { sensitivity: "base" })).map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleBulkSetBrand} disabled={!bulkBrand || bulkBusy}>
                <Bookmark className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Select value={bulkCategory} onValueChange={setBulkCategory}>
                <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Categoria..." /></SelectTrigger>
                <SelectContent>
                  {[...categoryNames].sort((a, b) => a.localeCompare(b, "pt", { sensitivity: "base" })).map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleBulkSetCategory} disabled={!bulkCategory || bulkBusy}>
                <Tag className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Select value={bulkFamily} onValueChange={setBulkFamily}>
                <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Família..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem família</SelectItem>
                  {[...families].sort((a, b) => a.name.localeCompare(b.name, "pt", { sensitivity: "base" })).map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleBulkSetFamily} disabled={!bulkFamily || bulkBusy}>
                <Layers className="h-4 w-4" />
              </Button>
            </div>
            {bulkBusy && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered && filtered.length > 0 ? (
          <>
          <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
            <span>{total} produto{total !== 1 ? "s" : ""}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map((product) => (
              <div key={product.id} className="relative">
                {selectionMode && (
                  <div
                    className="absolute top-2 left-2 z-20 cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); toggleSelect(product.id); }}
                  >
                    <Checkbox
                      checked={selectedIds.has(product.id)}
                      className="h-5 w-5 bg-background/80 backdrop-blur-sm border-2"
                    />
                  </div>
                )}
                {product.show_on_homepage && (
                  <div
                    className="absolute top-2 right-2 z-20 bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-md"
                    title="A aparecer na homepage"
                  >
                    🏠 Homepage
                  </div>
                )}
                <div className={selectionMode && selectedIds.has(product.id) ? "ring-2 ring-primary rounded-lg" : ""}>
                  <ProductCard
                    id={product.id}
                    name={product.name}
                    description={product.description}
                    category={product.category}
                    price={product.price}
                    imageUrl={product.image_url}
                    images={imagesByProduct[product.id] || []}
                    familyName={product.family_id ? familyMap[product.family_id] || null : null}
                    featured={product.featured}
                    includeInCatalog={product.include_in_catalog}
                    showOnHomepage={product.show_on_homepage}
                    onEdit={() => !selectionMode && setEditingProduct(product)}
                    isAdmin
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 mt-8 flex-wrap">
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="12">12 / pág.</SelectItem>
                <SelectItem value="24">24 / pág.</SelectItem>
                <SelectItem value="48">48 / pág.</SelectItem>
                <SelectItem value="50">50 / pág.</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4" /> Anterior
            </Button>
            <div className="flex items-center gap-1.5 text-sm px-2">
              <span>Página</span>
              <Input
                type="number"
                min={1}
                max={totalPages}
                value={page}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isNaN(v)) setPage(Math.min(totalPages, Math.max(1, v)));
                }}
                className="h-8 w-16 text-center"
              />
              <span>de {totalPages}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              Próximo <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          </>
        ) : (
          <div className="text-center py-20">
            <Package className="h-16 w-16 mx-auto text-muted-foreground/40" />
            <h3 className="mt-4 font-heading text-lg font-semibold text-foreground">Nenhum produto encontrado</h3>
            <p className="mt-1 text-muted-foreground">Adicione seu primeiro produto clicando em "Novo Produto"</p>
          </div>
        )}
      </section>
        </TabsContent>
        <TabsContent value="categorias" className="py-8">
          <CategoriesManager />
        </TabsContent>
      </Tabs>

      {editingProduct && (
        <EditProductDialog
          key={editingProduct.id}
          open={!!editingProduct}
          onOpenChange={(open) => !open && setEditingProduct(null)}
          product={editingProduct}
          families={families}
          categories={categoryNames}
          brands={brands}
          onPrev={() => navigateProduct(-1)}
          onNext={() => navigateProduct(1)}
          hasPrev={hasPrev}
          hasNext={hasNext}
        />
      )}
    </div>
  );
};

export default Admin;
