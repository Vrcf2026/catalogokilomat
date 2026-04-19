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
import { KioskAccessButton } from "@/components/KioskAccessButton";
import { AdminDashboard } from "@/components/AdminDashboard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { Search, ShieldCheck, Package, Loader2, LogOut, Trash2, CheckSquare, Square, XSquare } from "lucide-react";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const Admin = () => {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [familyFilter, setFamilyFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
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

  const { data: productImages = [] } = useQuery({
    queryKey: ["product_images"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_images")
        .select("*")
        .order("position", { ascending: true });
      if (error) throw error;
      return data;
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

  const filtered = products?.filter((p) => {
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

  const categoryNames = dbCategories.map((c) => c.name);
  const visibleFamilies = families.filter((f) => (categoryFilter === "all" || f.category === categoryFilter) && (brandFilter === "all" || products?.some((p) => p.family_id === f.id && p.brand_id === brandFilter)));
  const visibleBrands = brands.filter((b) => products?.some((p) => p.brand_id === b.id && (categoryFilter === "all" || p.category === categoryFilter) && (familyFilter === "all" || p.family_id === familyFilter)));

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-primary" />
            <div>
              <h1 className="font-heading text-xl font-bold text-foreground leading-tight">VRCF</h1>
              <p className="text-[10px] font-medium text-muted-foreground tracking-wider uppercase">Informática & Segurança</p>
            </div>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Admin</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
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
            <AddProductDialog families={families} categories={categoryNames} brands={brands} />
            <KioskAccessButton />
            <DarkModeToggle />
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-6">
        <AdminDashboard
          products={products || []}
          productImages={productImages}
          families={families}
          brands={brands}
        />
      </section>

      <section className="container mx-auto px-4 py-8">
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
              {categoryNames.map((cat) => (
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
                {visibleFamilies.map((f) => (
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
                {visibleBrands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </section>

      <section className="container mx-auto px-4 pb-16">
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

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered && filtered.length > 0 ? (
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
                    onEdit={() => !selectionMode && setEditingProduct(product)}
                    isAdmin
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Package className="h-16 w-16 mx-auto text-muted-foreground/40" />
            <h3 className="mt-4 font-heading text-lg font-semibold text-foreground">Nenhum produto encontrado</h3>
            <p className="mt-1 text-muted-foreground">Adicione seu primeiro produto clicando em "Novo Produto"</p>
          </div>
        )}
      </section>

      {editingProduct && (
        <EditProductDialog
          open={!!editingProduct}
          onOpenChange={(open) => !open && setEditingProduct(null)}
          product={editingProduct}
          families={families}
          categories={categoryNames}
          brands={brands}
        />
      )}
    </div>
  );
};

export default Admin;
