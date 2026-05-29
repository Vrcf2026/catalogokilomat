import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { GripVertical, Loader2, Plus, Trash2, Save } from "lucide-react";
import { getCategoryIcon } from "@/lib/categoryIcons";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Category {
  id: string;
  name: string;
  ordem: number;
  visivel: boolean;
  icone: string | null;
}

function SortableRow({
  cat,
  index,
  count,
  onToggle,
  onDelete,
}: {
  cat: Category;
  index: number;
  count: number;
  onToggle: (id: string, v: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });
  const Icon = getCategoryIcon(cat.name);
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : cat.visivel ? 1 : 0.5,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 ${
        !cat.visivel ? "grayscale" : ""
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        aria-label="Reordenar"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="w-6 text-xs text-muted-foreground tabular-nums">{index + 1}</span>
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="flex-1 text-sm font-medium text-foreground">{cat.name}</span>
      <span className="text-xs text-muted-foreground">
        {count} produto{count !== 1 ? "s" : ""}
      </span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{cat.visivel ? "Visível" : "Oculto"}</span>
        <Switch checked={cat.visivel} onCheckedChange={(v) => onToggle(cat.id, v)} />
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(cat.id)}>
        <Trash2 className="h-3.5 w-3.5 text-destructive" />
      </Button>
    </div>
  );
}

export function CategoriesManager() {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<Category[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const { data: cats = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data || []) as Category[];
    },
  });

  const { data: counts = {} } = useQuery({
    queryKey: ["categories", "product_counts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("products")
        .select("category");
      if (error) throw error;
      const acc: Record<string, number> = {};
      (data || []).forEach((p: any) => {
        if (p.category) acc[p.category] = (acc[p.category] || 0) + 1;
      });
      return acc;
    },
  });

  useEffect(() => {
    if (!dirty) {
      setItems([...cats].sort((a, b) => a.ordem - b.ordem));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cats]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    setItems(arrayMove(items, oldIndex, newIndex));
    setDirty(true);
  };

  const handleToggle = async (id: string, v: boolean) => {
    const prev = items;
    setItems(items.map((c) => (c.id === id ? { ...c, visivel: v } : c)));
    const { error } = await supabase.from("categories").update({ visivel: v }).eq("id", id);
    if (error) {
      toast.error("Erro ao actualizar visibilidade");
      setItems(prev);
    } else {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apagar esta categoria?")) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) {
      toast.error(error.message || "Erro ao apagar");
    } else {
      toast.success("Categoria apagada");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setAdding(true);
    const maxOrdem = items.reduce((m, c) => Math.max(m, c.ordem), 0);
    const { error } = await supabase
      .from("categories")
      .insert({ name: newName.trim(), ordem: maxOrdem + 1, visivel: true } as any);
    if (error) toast.error(error.message);
    else {
      toast.success("Categoria criada");
      setNewName("");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    }
    setAdding(false);
  };

  const handleSaveOrder = async () => {
    setSaving(true);
    try {
      const updates = items.map((c, i) =>
        supabase.from("categories").update({ ordem: i + 1 }).eq("id", c.id)
      );
      const results = await Promise.all(updates);
      const err = results.find((r) => r.error);
      if (err?.error) throw err.error;
      toast.success("Ordem guardada");
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    } catch (e: any) {
      toast.error(e.message || "Erro ao guardar ordem");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Nova categoria..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="max-w-sm"
        />
        <Button onClick={handleAdd} disabled={adding} size="sm" className="gap-1.5">
          {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Adicionar
        </Button>
        <div className="flex-1" />
        <Button
          onClick={handleSaveOrder}
          disabled={!dirty || saving}
          size="sm"
          className="gap-1.5"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Guardar ordem
        </Button>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((c, idx) => (
              <SortableRow
                key={c.id}
                cat={c}
                index={idx}
                count={counts[c.name] || 0}
                onToggle={handleToggle}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {items.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">Nenhuma categoria criada.</p>
      )}
    </div>
  );
}