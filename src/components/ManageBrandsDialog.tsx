import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Tag, Plus, Trash2, Loader2, Link2, ChevronDown } from "lucide-react";

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
}

interface ManageBrandsDialogProps {
  brands: Brand[];
}

interface Family {
  id: string;
  name: string;
  category: string;
}

interface BrandFamilyLink {
  id: string;
  brand_id: string;
  family_id: string;
}

export function ManageBrandsDialog({ brands }: ManageBrandsDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: families = [] } = useQuery({
    queryKey: ["families"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_families")
        .select("id, name, category")
        .order("category", { ascending: true });
      if (error) throw error;
      return data as Family[];
    },
    enabled: open,
  });

  const { data: brandFamilies = [] } = useQuery({
    queryKey: ["brand_families"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brand_families").select("*");
      if (error) throw error;
      return data as BrandFamilyLink[];
    },
    enabled: open,
  });

  const familiesByBrand = brandFamilies.reduce<Record<string, Set<string>>>((acc, l) => {
    if (!acc[l.brand_id]) acc[l.brand_id] = new Set();
    acc[l.brand_id].add(l.family_id);
    return acc;
  }, {});

  const handleAdd = async () => {
    if (!name.trim()) {
      toast.error("Nome da marca é obrigatório");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("brands").insert({ name: name.trim() });
      if (error) throw error;
      toast.success("Marca criada!");
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      setName("");
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar marca");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("brands").delete().eq("id", id);
      if (error) throw error;
      toast.success("Marca excluída!");
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      queryClient.invalidateQueries({ queryKey: ["brand_families"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir");
    }
  };

  const toggleFamily = async (brandId: string, familyId: string, checked: boolean) => {
    try {
      if (checked) {
        const { error } = await supabase
          .from("brand_families")
          .insert({ brand_id: brandId, family_id: familyId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("brand_families")
          .delete()
          .eq("brand_id", brandId)
          .eq("family_id", familyId);
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["brand_families"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao atualizar associação");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Tag className="h-4 w-4" />
          Marcas
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Gerir Marcas</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 border-b border-border pb-4">
          <div className="space-y-1">
            <Label>Nome da Marca</Label>
            <Input placeholder="Ex: Samsung, Hikvision..." value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Button onClick={handleAdd} disabled={loading} size="sm" className="gap-2">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            Adicionar Marca
          </Button>
        </div>

        <div className="space-y-2 pt-2">
          {brands.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma marca criada ainda.</p>
          )}
          {brands.map((b) => {
            const linked = familiesByBrand[b.id] || new Set<string>();
            return (
              <div key={b.id} className="flex items-center justify-between gap-2 rounded-lg bg-secondary/50 px-3 py-2">
                <span className="text-sm font-medium text-foreground flex-1 truncate">{b.name}</span>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                      <Link2 className="h-3 w-3" />
                      {linked.size} família{linked.size === 1 ? "" : "s"}
                      <ChevronDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-0" align="end">
                    <div className="p-3 border-b border-border">
                      <p className="text-xs font-semibold text-foreground">Famílias associadas</p>
                      <p className="text-[11px] text-muted-foreground">Marca: {b.name}</p>
                    </div>
                    <ScrollArea className="max-h-64">
                      <div className="p-2 space-y-1">
                        {families.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-3">Sem famílias.</p>
                        )}
                        {families.map((f) => (
                          <label
                            key={f.id}
                            className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-secondary/60 cursor-pointer"
                          >
                            <Checkbox
                              checked={linked.has(f.id)}
                              onCheckedChange={(c) => toggleFamily(b.id, f.id, !!c)}
                            />
                            <span className="text-xs flex-1 truncate">{f.name}</span>
                            <span className="text-[10px] text-muted-foreground">{f.category}</span>
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>

                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(b.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
