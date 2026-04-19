import { useState, useCallback, forwardRef } from "react";
import { Package, ImageOff, Pencil, ShoppingCart, Minus, Plus, Star, BookOpen } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { trackEvent } from "@/lib/trackEvent";

function ProductImage({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 text-muted-foreground w-full h-full justify-center">
        <ImageOff className="h-10 w-10" />
        <span className="text-xs">Erro ao carregar</span>
      </div>
    );
  }

  return (
    <>
      {!loaded && (
        <div className="absolute inset-0 bg-secondary animate-pulse" />
      )}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </>
  );
}

interface ProductCardProps {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number | null;
  imageUrl: string | null;
  images: { id: string; image_url: string; position: number }[];
  familyName: string | null;
  featured?: boolean;
  includeInCatalog?: boolean;
  onEdit?: () => void;
  isAdmin?: boolean;
}

export const ProductCard = forwardRef<HTMLDivElement, ProductCardProps & { onClick?: () => void }>(function ProductCard({ id, name, description, category, price, imageUrl, images, familyName, onEdit, isAdmin, onClick, featured, includeInCatalog }, ref) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const queryClient = useQueryClient();
  const allImages = images.length > 0
    ? images.sort((a, b) => a.position - b.position).map(i => i.image_url)
    : imageUrl ? [imageUrl] : [];

  const [selectedIndex, setSelectedIndex] = useState(0);
  const currentImage = allImages[selectedIndex] || null;

  const toggleField = async (field: "featured" | "include_in_catalog", value: boolean) => {
    const updateData: any = {};
    updateData[field] = value;
    const { error } = await supabase.from("products").update(updateData).eq("id", id);
    if (error) {
      toast.error("Erro ao atualizar produto");
    } else {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    }
  };

  return (
    <div
      ref={ref}
      className={`group product-card-shadow rounded-xl bg-card overflow-hidden cursor-pointer ${featured && !isAdmin ? 'border-2 border-primary ring-1 ring-primary/20' : 'border border-border'}`}
      onClick={() => { if (isAdmin) { onEdit?.(); } else { trackEvent(id, "click"); onClick?.(); } }}
    >
      <div className="relative aspect-square bg-secondary flex items-center justify-center overflow-hidden">
        {currentImage ? (
          <ProductImage src={currentImage} alt={name} />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageOff className="h-10 w-10" />
            <span className="text-xs">Sem imagem</span>
          </div>
        )}
        {isAdmin && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-background/80 backdrop-blur-sm rounded-full p-1.5">
              <Pencil className="h-3.5 w-3.5 text-foreground" />
            </div>
          </div>
        )}
        {featured && !isAdmin && (
          <div className="absolute top-0 left-0 z-20 px-2 py-0.5 rounded-br-lg text-[9px] font-bold uppercase tracking-wider text-primary-foreground bg-primary">
            ★ Destaque
          </div>
        )}
        {featured && isAdmin && (
          <div className="absolute top-2 left-2">
            <div className="bg-amber-500 text-white rounded-full p-1">
              <Star className="h-3 w-3 fill-current" />
            </div>
          </div>
        )}
      </div>

      {allImages.length > 1 && (
        <div className="flex gap-1.5 px-3 py-2 bg-secondary/50">
          {allImages.map((img, idx) => (
            <button
              key={idx}
              onClick={(e) => { e.stopPropagation(); setSelectedIndex(idx); }}
              className={`w-10 h-10 rounded-md overflow-hidden border-2 transition-all flex-shrink-0 ${
                idx === selectedIndex ? 'border-primary ring-1 ring-primary' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <img src={img} alt={`${name} ${idx + 1}`} className="w-full h-full object-cover" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      )}

      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          {category && (
            <span className="inline-block text-[11px] font-medium uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {category}
            </span>
          )}
          {familyName && (
            <span className="inline-block text-[11px] font-medium text-accent-foreground bg-accent/15 px-2 py-0.5 rounded-full">
              {familyName}
            </span>
          )}
        </div>
        <h3 className="font-heading font-semibold text-card-foreground line-clamp-1">{name}</h3>
        {description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        )}
        {price != null && (
          <p className="font-heading font-bold text-lg text-foreground">
            {price.toFixed(2).replace(".", ",")} €
          </p>
        )}

        {/* Admin toggles */}
        {isAdmin && (
          <div className="flex flex-col gap-2 pt-2 border-t border-border" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <BookOpen className="h-3 w-3" />
                Catálogo
              </label>
              <Switch
                checked={!!includeInCatalog}
                onCheckedChange={(v) => toggleField("include_in_catalog", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Star className="h-3 w-3" />
                Destaque
              </label>
              <Switch
                checked={!!featured}
                onCheckedChange={(v) => toggleField("featured", v)}
              />
            </div>
          </div>
        )}

        {!isAdmin && (
          <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center border border-border rounded-md">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-r-none" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-8 text-center text-sm font-medium">{quantity}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-l-none" onClick={() => setQuantity((q) => q + 1)}>
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 flex-1"
              onClick={() => {
                addItem({ id, name, price, imageUrl: allImages[0] || imageUrl, category }, quantity);
                toast.success(`${quantity}x ${name} adicionado ao carrinho`);
                setQuantity(1);
              }}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Adicionar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
});