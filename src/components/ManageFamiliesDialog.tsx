import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { FolderTree, Plus, Trash2, Loader2 } from "lucide-react";

interface Family {
  id: string;
  name: string;
  category: string;
  description: string | null;
}

interface ManageFamiliesDialogProps {
  families: Family[];
  categories: string[];
}

export function ManageFamiliesDialog({ families, categories }: ManageFamiliesDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleAdd = async () => {
    if (!name.trim() || !category) {
      toast.error("Nome e categoria são obrigatórios");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("product_families").insert({
        name: name.trim(),
        category,
        description: description.trim() || null,
      });
      if (error) throw error;
      toast.success("Família criada!");
      queryClient.invalidateQueries({ queryKey: ["families"] });
      setName("");
      setDescription("");
      setCategory("");
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar família");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("product_families").delete().eq("id", id);
      if (error) throw error;
      toast.success("Família excluída!");
      queryClient.invalidateQueries({ queryKey: ["families"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir");
    }
  };

  const grouped = categories.map((cat) => ({
    category: cat,
    items: families.filter((f) => f.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FolderTree className="h-4 w-4" />
          Famílias
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Gerenciar Famílias</DialogTitle>
        </DialogHeader>

        {/* Add new */}
        <div className="space-y-3 border-b border-border pb-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input placeholder="Ex: Samsung Galaxy" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Input placeholder="Descrição (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Button onClick={handleAdd} disabled={loading} size="sm" className="gap-2">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            Adicionar Família
          </Button>
        </div>

        {/* List */}
        <div className="space-y-4 pt-2">
          {grouped.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma família criada ainda.</p>
          )}
          {grouped.map((group) => (
            <div key={group.category}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {group.category}
              </h4>
              <div className="space-y-1">
                {group.items.map((f) => (
                  <div key={f.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                    <div>
                      <span className="text-sm font-medium text-foreground">{f.name}</span>
                      {f.description && (
                        <span className="ml-2 text-xs text-muted-foreground">{f.description}</span>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(f.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
