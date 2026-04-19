import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Lock, Unlock, X, Search, Sparkles, Upload, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ImageSlot {
  url: string;
  locked: boolean;
  source: "search" | "ai" | "upload";
  file?: File;
}

interface ImageSlotPickerProps {
  slots: ImageSlot[];
  onSlotsChange: (slots: ImageSlot[]) => void;
  productName: string;
  disabled?: boolean;
}

export function ImageSlotPicker({ slots, onSlotsChange, productName, disabled }: ImageSlotPickerProps) {
  const [searching, setSearching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lockedCount = slots.filter((s) => s.locked).length;
  const unlockedSlotCount = slots.filter((s) => !s.locked).length + (3 - slots.length);

  const handleSearch = async () => {
    if (!productName.trim()) {
      toast.error("Preencha o nome do produto primeiro");
      return;
    }

    setSearching(true);
    setSearchResults([]);
    setShowResults(true);

    try {
      const { data, error } = await supabase.functions.invoke("search-product-images", {
        body: { query: productName.trim(), count: 18 },
      });

      if (error) throw error;

      if (data?.images?.length > 0) {
        setSearchResults(data.images);
        toast.success(`${data.images.length} imagens encontradas!`);
      } else {
        toast.warning("Nenhuma imagem encontrada na web para este nome.");
      }
    } catch (e: any) {
      console.error("Search error:", e);
      toast.error("Erro ao pesquisar imagens");
    } finally {
      setSearching(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!productName.trim()) {
      toast.error("Preencha o nome do produto primeiro");
      return;
    }

    const toGenerate = 3 - lockedCount;
    if (toGenerate <= 0) {
      toast.error("Todos os slots estão bloqueados");
      return;
    }

    setGenerating(true);
    toast.info(`A gerar ${toGenerate} imagem(ns) com IA...`);

    try {
      const { data, error } = await supabase.functions.invoke("generate-product-image", {
        body: { productName: productName.trim(), count: toGenerate },
      });
      if (error) throw error;

      const aiUrls: string[] = data?.imageUrls || [];
      const newSlots = [...slots.filter((s) => s.locked)];
      for (const url of aiUrls) {
        if (newSlots.length < 3) {
          newSlots.push({ url, locked: false, source: "ai" });
        }
      }

      onSlotsChange(newSlots);
      toast.success(`${aiUrls.length} imagem(ns) gerada(s) com IA!`);
    } catch (e: any) {
      console.error("AI generation error:", e);
      toast.error("Erro ao gerar imagens com IA");
    } finally {
      setGenerating(false);
    }
  };

  const addImageFromSearch = (url: string) => {
    if (slots.length >= 3) {
      const idx = slots.findIndex((s) => !s.locked);
      if (idx === -1) {
        toast.error("Todas as imagens estão bloqueadas");
        return;
      }

      const newSlots = [...slots];
      newSlots[idx] = { url, locked: false, source: "search" };
      onSlotsChange(newSlots);
    } else {
      onSlotsChange([...slots, { url, locked: false, source: "search" }]);
    }
  };

  const toggleLock = (index: number) => {
    const newSlots = [...slots];
    newSlots[index] = { ...newSlots[index], locked: !newSlots[index].locked };
    onSlotsChange(newSlots);
  };

  const removeSlot = (index: number) => {
    if (slots[index].locked) return;
    onSlotsChange(slots.filter((_, i) => i !== index));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const availableSlots = 3 - slots.filter((s) => s.locked).length;
    const toAdd = files.slice(0, availableSlots);

    const newSlots = [...slots];
    for (const file of toAdd) {
      const url = URL.createObjectURL(file);
      if (newSlots.length >= 3) {
        const idx = newSlots.findIndex((s) => !s.locked);
        if (idx !== -1) {
          newSlots[idx] = { url, locked: false, source: "upload", file };
        }
      } else {
        newSlots.push({ url, locked: false, source: "upload", file });
      }
    }

    onSlotsChange(newSlots);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const sourceLabel = (source: string) => {
    switch (source) {
      case "search":
        return "Web";
      case "ai":
        return "IA";
      case "upload":
        return "PC";
      default:
        return "";
    }
  };

  const sourceColor = (source: string) => {
    switch (source) {
      case "search":
        return "bg-blue-500";
      case "ai":
        return "bg-purple-500";
      case "upload":
        return "bg-green-500";
      default:
        return "bg-muted";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium leading-none">Imagens do Produto</label>
        <span className="text-xs text-muted-foreground">{slots.length}/3 slots</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => {
          const slot = slots[i];
          if (!slot) {
            return (
              <div
                key={i}
                className="aspect-square rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/30"
              >
                <span className="text-xs text-muted-foreground">Vazio</span>
              </div>
            );
          }

          return (
            <div key={i} className="relative aspect-square rounded-lg border-2 border-border overflow-hidden group">
              <img
                src={slot.url}
                alt={`Imagem ${i + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder.svg";
                }}
              />
              <span className={cn("absolute top-1 left-1 text-[10px] text-white px-1.5 py-0.5 rounded-full font-medium", sourceColor(slot.source))}>
                {sourceLabel(slot.source)}
              </span>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => toggleLock(i)}
                  className={cn(
                    "p-1.5 rounded-full text-white transition-colors",
                    slot.locked ? "bg-amber-500 hover:bg-amber-600" : "bg-white/30 hover:bg-white/50",
                  )}
                  title={slot.locked ? "Desbloquear" : "Bloquear"}
                >
                  {slot.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                </button>
                {!slot.locked && (
                  <button
                    type="button"
                    onClick={() => removeSlot(i)}
                    className="p-1.5 rounded-full bg-destructive/80 hover:bg-destructive text-white transition-colors"
                    title="Remover"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {slot.locked && (
                <div className="absolute bottom-1 right-1">
                  <Lock className="h-4 w-4 text-amber-400 drop-shadow-md" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSearch}
            disabled={disabled || searching || generating || !productName.trim()}
            className="gap-1 text-xs"
          >
            {searching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Search className="h-3 w-3" />}
            Web
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || generating || unlockedSlotCount === 0}
            className="gap-1 text-xs"
          >
            <Upload className="h-3 w-3" />
            PC
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGenerateAI}
            disabled={disabled || generating || searching || !productName.trim() || lockedCount >= 3}
            className="gap-1 text-xs"
          >
            {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            IA
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground text-center">
          {generating
            ? "A gerar imagens com IA..."
            : lockedCount > 0
              ? `${lockedCount} bloqueada(s) — IA gerará ${3 - lockedCount} imagem(ns)`
              : slots.length === 0
                ? "Pesquise na web, carregue do PC ou gere com IA"
                : "Bloqueie as imagens que quer manter"}
        </p>
      </div>

      {showResults && searchResults.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Resultados da pesquisa</span>
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="sm" onClick={handleSearch} disabled={searching} className="h-6 px-2 text-xs gap-1">
                <RefreshCw className={cn("h-3 w-3", searching && "animate-spin")} />
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowResults(false)} className="h-6 px-2 text-xs">
                Fechar
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5 max-h-56 overflow-y-auto">
            {searchResults.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => addImageFromSearch(url)}
                className="aspect-square rounded-md overflow-hidden border border-border hover:border-primary hover:ring-2 hover:ring-primary/30 transition-all"
              >
                <img
                  src={url}
                  alt={`Resultado ${i + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
