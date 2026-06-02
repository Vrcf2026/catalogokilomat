import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Package, ImageOff, Star, MousePointerClick, ShoppingCart, Eye, Trash2, CalendarDays, Link as LinkIcon, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface AdminDashboardProps {
  products: any[];
  productImages: any[];
  families: { id: string; name: string; category: string }[];
  brands: { id: string; name: string }[];
  onFilterNoImage?: () => void;
}

export function AdminDashboard({ products, productImages, families, brands, onFilterNoImage }: AdminDashboardProps) {
  const [dateRange, setDateRange] = useState("all");
  const [clearing, setClearing] = useState(false);
  const [generatingSlugs, setGeneratingSlugs] = useState(false);
  const queryClient = useQueryClient();

  const dateFilter = (() => {
    const now = new Date();
    if (dateRange === "7d") return new Date(now.getTime() - 7 * 86400000).toISOString();
    if (dateRange === "30d") return new Date(now.getTime() - 30 * 86400000).toISOString();
    if (dateRange === "90d") return new Date(now.getTime() - 90 * 86400000).toISOString();
    return null;
  })();

  const { data: statsData } = useQuery({
    queryKey: ["admin_dashboard_stats"],
    queryFn: async () => {
      const [total, catalog, featured, semImagem] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("include_in_catalog", true),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("featured", true),
        supabase.from("products").select("id", { count: "exact", head: true }).is("image_url", null),
      ]);
      return {
        totalProducts: total.count ?? 0,
        catalogProducts: catalog.count ?? 0,
        featuredProducts: featured.count ?? 0,
        productsWithoutImage: semImagem.count ?? 0,
      };
    },
    staleTime: 60000,
  });

  const { data: familyStats } = useQuery({
    queryKey: ["admin_family_stats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("family_id, product_families(name)")
        .not("family_id", "is", null);
      const counts: Record<string, number> = {};
      (data || []).forEach((p: any) => {
        const name = p.product_families?.name || "Sem família";
        counts[name] = (counts[name] || 0) + 1;
      });
      return counts;
    },
    staleTime: 60000,
  });

  const { data: brandStats } = useQuery({
    queryKey: ["admin_brand_stats"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("brand_id, brands(name)")
        .not("brand_id", "is", null);
      const counts: Record<string, number> = {};
      (data || []).forEach((p: any) => {
        const name = p.brands?.name || "Sem marca";
        counts[name] = (counts[name] || 0) + 1;
      });
      return counts;
    },
    staleTime: 60000,
  });

  const { data: analytics = [] } = useQuery({
    queryKey: ["product_analytics", dateRange],
    queryFn: async () => {
      let query = (supabase as any)
        .from("product_analytics")
        .select("product_id, event_type, created_at")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (dateFilter) {
        query = query.gte("created_at", dateFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as { product_id: string; event_type: string; created_at: string }[];
    },
  });

  const handleClearAnalytics = async () => {
    if (!confirm("Tem a certeza que deseja limpar todos os dados de analytics? Esta ação é irreversível.")) return;
    setClearing(true);
    try {
      const { error } = await (supabase as any)
        .from("product_analytics")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["product_analytics"] });
      toast.success("Analytics limpos com sucesso");
    } catch (e: any) {
      toast.error("Erro ao limpar analytics: " + e.message);
    } finally {
      setClearing(false);
    }
  };

  const generateSlug = (text: string): string =>
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 200);

  const generateMissingSlugs = async () => {
    setGeneratingSlugs(true);
    try {
      let totalUpdated = 0;
      // Loop until no more rows without slug
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data: rows, error } = await (supabase as any)
          .from("products")
          .select("id, name, sku")
          .is("slug", null)
          .limit(500);
        if (error) throw error;
        if (!rows || rows.length === 0) break;

        const updates = rows.map((p: any) => {
          const base = generateSlug(p.name || "");
          const suffix = p.sku ? `-${p.sku.toLowerCase().replace(/[^a-z0-9]/g, "")}` : "";
          return { id: p.id, slug: `${base}${suffix}` || p.id };
        });

        for (let i = 0; i < updates.length; i += 50) {
          const batch = updates.slice(i, i + 50);
          await Promise.all(
            batch.map((u: any) =>
              (supabase as any).from("products").update({ slug: u.slug }).eq("id", u.id)
            )
          );
        }
        totalUpdated += updates.length;
        if (rows.length < 500) break;
      }
      if (totalUpdated === 0) toast.info("Todos os produtos já têm slug.");
      else toast.success(`${totalUpdated} slugs gerados.`);
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setGeneratingSlugs(false);
    }
  };

  // Stats from DB
  const totalProducts = statsData?.totalProducts ?? 0;
  const catalogProducts = statsData?.catalogProducts ?? 0;
  const featuredProducts = statsData?.featuredProducts ?? 0;
  const productsWithoutImage = statsData?.productsWithoutImage ?? 0;

  const byFamily = familyStats ?? {};
  const byBrand = brandStats ?? {};

  // Analytics aggregation
  const clickCounts: Record<string, number> = {};
  const quoteCounts: Record<string, number> = {};
  const viewCounts: Record<string, number> = {};

  analytics.forEach((e) => {
    if (e.event_type === "click") clickCounts[e.product_id] = (clickCounts[e.product_id] || 0) + 1;
    if (e.event_type === "quote") quoteCounts[e.product_id] = (quoteCounts[e.product_id] || 0) + 1;
    if (e.event_type === "catalog_view") viewCounts[e.product_id] = (viewCounts[e.product_id] || 0) + 1;
  });

  const productName = (id: string) => products.find((p) => p.id === id)?.name || "Produto removido";

  const topClicked = Object.entries(clickCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const topQuoted = Object.entries(quoteCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const topViewed = Object.entries(viewCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const totalClicks = analytics.filter((e) => e.event_type === "click").length;
  const totalQuotes = analytics.filter((e) => e.event_type === "quote").length;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={Package} label="Total Produtos" value={totalProducts} />
        <StatCard icon={Star} label="Destaques" value={featuredProducts} />
        <StatCard icon={BarChart3} label="No Catálogo" value={catalogProducts} />
        <StatCard icon={ImageOff} label="Sem Imagem" value={productsWithoutImage} color="text-orange-500" onClick={onFilterNoImage} />
        <StatCard icon={MousePointerClick} label="Total Cliques" value={totalClicks} color="text-blue-500" />
        <StatCard icon={ShoppingCart} label="Total Orçamentos" value={totalQuotes} color="text-green-500" />
      </div>

      {/* Date filter + Clear */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o período</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleClearAnalytics}
          disabled={clearing}
          className="gap-1.5"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {clearing ? "A limpar..." : "Limpar Analytics"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={generateMissingSlugs}
          disabled={generatingSlugs}
          className="gap-1.5"
        >
          {generatingSlugs ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LinkIcon className="h-3.5 w-3.5" />}
          Gerar slugs em falta
        </Button>
      </div>

      {/* Analytics tabs */}
      <Tabs defaultValue="clicks" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="clicks" className="gap-1.5">
            <MousePointerClick className="h-3.5 w-3.5" /> Cliques
          </TabsTrigger>
          <TabsTrigger value="quotes" className="gap-1.5">
            <ShoppingCart className="h-3.5 w-3.5" /> Orçamentos
          </TabsTrigger>
          <TabsTrigger value="views" className="gap-1.5">
            <Eye className="h-3.5 w-3.5" /> Catálogo
          </TabsTrigger>
        </TabsList>
        <TabsContent value="clicks">
          <RankingList items={topClicked} productName={productName} emptyText="Sem dados de cliques ainda" />
        </TabsContent>
        <TabsContent value="quotes">
          <RankingList items={topQuoted} productName={productName} emptyText="Sem dados de orçamentos ainda" />
        </TabsContent>
        <TabsContent value="views">
          <RankingList items={topViewed} productName={productName} emptyText="Sem dados de visualizações ainda" />
        </TabsContent>
      </Tabs>

      {/* Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Por Família</CardTitle>
          </CardHeader>
          <CardContent>
            <DistributionList items={byFamily} total={Object.values(byFamily).reduce((a, b) => a + b, 0) || 1} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Por Marca</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(byBrand).length > 0 ? (
              <DistributionList items={byBrand} total={Object.values(byBrand).reduce((a, b) => a + b, 0)} />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum produto com marca atribuída</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, onClick }: { icon: any; label: string; value: number; color?: string; onClick?: () => void }) {
  return (
    <Card
      onClick={onClick}
      className={onClick ? "cursor-pointer hover:bg-accent/40 transition-colors" : ""}
    >
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className={`h-5 w-5 ${color || "text-primary"}`} />
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function RankingList({ items, productName, emptyText }: { items: [string, number][]; productName: (id: string) => string; emptyText: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">{emptyText}</p>;
  }
  const max = items[0]?.[1] || 1;
  return (
    <div className="space-y-2 mt-3">
      {items.map(([id, count], i) => (
        <div key={id} className="flex items-center gap-3">
          <span className="text-xs font-bold text-muted-foreground w-5 text-right">{i + 1}.</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{productName(id)}</p>
            <div className="h-1.5 rounded-full bg-muted mt-1">
              <div
                className="h-1.5 rounded-full bg-primary transition-all"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
          </div>
          <span className="text-sm font-semibold text-foreground tabular-nums">{count}</span>
        </div>
      ))}
    </div>
  );
}

function DistributionList({ items, total }: { items: Record<string, number>; total: number }) {
  const sorted = Object.entries(items).sort((a, b) => b[1] - a[1]);
  return (
    <div className="space-y-2">
      {sorted.map(([name, count]) => (
        <div key={name} className="flex items-center justify-between gap-2">
          <span className="text-sm text-foreground truncate">{name}</span>
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 rounded-full bg-muted">
              <div className="h-1.5 rounded-full bg-primary/60" style={{ width: `${(count / total) * 100}%` }} />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums w-6 text-right">{count}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
