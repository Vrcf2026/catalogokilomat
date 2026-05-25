import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { LayoutGrid, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface HomepageHighlightsDialogProps {
  brands: { id: string; name: string }[];
  categories: string[];
}

type Row = { active: boolean; position: number };

const MAX_BRANDS = 8;
const MAX_CATEGORIES = 9;

export default function HomepageHighlightsDialog({ brands, categories }: HomepageHighlightsDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [brandState, setBrandState] = useState<Record<string, Row>>({});
  const [categoryState, setCategoryState] = useState<Record<string, Row>>({});
  const queryClient = useQueryClient();

  const { data: existing = [], isLoading } = useQuery({
    queryKey: ["homepage_highlights", "all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("homepage_highlights")
        .select("*");
      if (error) throw error;
      return data as { id: string; type: string; ref_id: string; label: string; position: number; active: boolean }[];
    },
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    const b: Record<string, Row> = {};
    const c: Record<string, Row> = {};
    brands.forEach((br) => { b[br.id] = { active: false, position: 0 }; });
    categories.forEach((cat) => { c[cat] = { active: false, position: 0 }; });
    existing.forEach((e) => {
      if (e.type === "brand" && b[e.ref_id]) b[e.ref_id] = { active: e.active, position: e.position };
      if (e.type === "category" && c[e.ref_id] !== undefined) c[e.ref_id] = { active: e.active, position: e.position };
    });
    setBrandState(b);
    setCategoryState(c);
  }, [open, existing, brands, categories]);

  const activeBrandCount = useMemo(() => Object.values(brandState).filter((r) => r.active).length, [brandState]);
  const activeCategoryCount = useMemo(() => Object.values(categoryState).filter((r) => r.active).length, [categoryState]);

  const toggleBrand = (id: string, v: boolean) => {
    if (v && activeBrandCount >= MAX_BRANDS && !brandState[id]?.active) {
      toast.warning(`Máximo ${MAX_BRANDS} marcas activas`);
      return;
    }
    setBrandState((s) => ({ ...s, [id]: { ...s[id], active: v } }));
  };
  const toggleCategory = (name: string, v: boolean) => {
    if (v && activeCategoryCount >= MAX_CATEGORIES && !categoryState[name]?.active) {
      toast.warning(`Máximo ${MAX_CATEGORIES} categorias activas (grid 3×3)`);
      return;
    }
    setCategoryState((s) => ({ ...s, [name]: { ...s[name], active: v } }));
  };

  const handleSave = async (type: "brand" | "category") => {
    setSaving(true);
    try {
      const items = type === "brand"
        ? brands.map((b) => ({
            type: "brand" as const,
            ref_id: b.id,
            label: b.name,
            active: brandState[b.id]?.active ?? false,
            position: brandState[b.id]?.position ?? 0,
          }))
        : categories.map((c) => ({
            type: "category" as const,
            ref_id: c,
            label: c,
            active: categoryState[c]?.active ?? false,
            position: categoryState[c]?.position ?? 0,
          }));

      const { error } = await (supabase as any)
        .from("homepage_highlights")
        .upsert(items, { onConflict: "type,ref_id" });
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["homepage_highlights"] });
      toast.success("Destaques guardados");
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <LayoutGrid className="h-4 w-4" />
          Destaques Homepage
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Destaques na Homepage</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <Tabs defaultValue="brands" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="brands">Marcas ({activeBrandCount}/{MAX_BRANDS})</TabsTrigger>
              <TabsTrigger value="categories">Categorias ({activeCategoryCount}/{MAX_CATEGORIES})</TabsTrigger>
            </TabsList>

            <TabsContent value="brands" className="flex-1 overflow-y-auto mt-3">
              <div className="space-y-2">
                {[...brands].sort((a, b) => a.name.localeCompare(b.name, "pt", { sensitivity: "base" })).map((b) => {
                  const row = brandState[b.id] || { active: false, position: 0 };
                  return (
                    <div key={b.id} className="flex items-center gap-3 p-2 border border-border rounded-md">
                      <Switch checked={row.active} onCheckedChange={(v) => toggleBrand(b.id, v)} />
                      <span className="flex-1 text-sm font-medium">{b.name}</span>
                      <Input
                        type="number"
                        value={row.position}
                        onChange={(e) => setBrandState((s) => ({ ...s, [b.id]: { ...s[b.id], position: parseInt(e.target.value) || 0 } }))}
                        className="w-20 h-8"
                        disabled={!row.active}
                      />
                    </div>
                  );
                })}
              </div>
              <DialogFooter className="pt-4">
                <Button onClick={() => handleSave("brand")} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Guardar marcas
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="categories" className="flex-1 overflow-y-auto mt-3">
              <div className="space-y-2">
                {[...categories].sort((a, b) => a.localeCompare(b, "pt", { sensitivity: "base" })).map((cat) => {
                  const row = categoryState[cat] || { active: false, position: 0 };
                  return (
                    <div key={cat} className="flex items-center gap-3 p-2 border border-border rounded-md">
                      <Switch checked={row.active} onCheckedChange={(v) => toggleCategory(cat, v)} />
                      <span className="flex-1 text-sm font-medium">{cat}</span>
                      <Input
                        type="number"
                        value={row.position}
                        onChange={(e) => setCategoryState((s) => ({ ...s, [cat]: { ...s[cat], position: parseInt(e.target.value) || 0 } }))}
                        className="w-20 h-8"
                        disabled={!row.active}
                      />
                    </div>
                  );
                })}
              </div>
              <DialogFooter className="pt-4">
                <Button onClick={() => handleSave("category")} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Guardar categorias
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}