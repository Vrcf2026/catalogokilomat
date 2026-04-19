import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Tags, Plus, Trash2, Loader2 } from "lucide-react";

interface Category {
  id: string;
  name: string;
}

interface ManageCategoriesDialogProps {
  categories: Category[];
}

export function ManageCategoriesDialog({ categories }: ManageCategoriesDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleAdd = async () => {
    if (!name.trim()) {
      toast.error("Nome da categoria é obrigatório");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("categories").insert({ name: name.trim() });
      if (error) throw error;
      toast.success("Categoria criada!");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setName("");
    } catch (e: any) {
      toast.error(e.message || "Erro ao criar categoria");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
      toast.success("Categoria excluída!");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Tags className="h-4 w-4" />
          Categorias
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Gerenciar Categorias</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 border-b border-border pb-4">
          <Input placeholder="Nova categoria..." value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
          <Button onClick={handleAdd} disabled={loading} size="sm" className="gap-2 shrink-0">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            Adicionar
          </Button>
        </div>

        <div className="space-y-1 pt-2">
          {categories.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma categoria criada.</p>
          )}
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
              <span className="text-sm font-medium text-foreground">{cat.name}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(cat.id)}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
