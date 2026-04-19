import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ImageOff, ChevronLeft, ChevronRight, ShoppingCart, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

interface ProductDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: {
    id?: string;
    name: string;
    description: string | null;
    category: string | null;
    price: number | null;
    imageUrl: string | null;
    images: { id: string; image_url: string; position: number }[];
    familyName: string | null;
  };
}

export function ProductDetailDialog({ open, onOpenChange, product }: ProductDetailDialogProps) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const allImages = product.images.length > 0
    ? product.images.sort((a, b) => a.position - b.position).map(i => i.image_url)
    : product.imageUrl ? [product.imageUrl] : [];

  const [selectedIndex, setSelectedIndex] = useState(0);
  const currentImage = allImages[selectedIndex] || null;

  const goNext = () => setSelectedIndex((i) => (i + 1) % allImages.length);
  const goPrev = () => setSelectedIndex((i) => (i - 1 + allImages.length) % allImages.length);

  const handleAddToCart = () => {
    if (!product.id) return;
    addItem(
      { id: product.id, name: product.name, price: product.price, imageUrl: allImages[0] || product.imageUrl, category: product.category },
      quantity
    );
    toast.success(`${quantity}x ${product.name} adicionado ao orçamento`);
    setQuantity(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full p-0 gap-0 overflow-hidden max-h-[90vh]">
        <DialogTitle className="sr-only">{product.name}</DialogTitle>

        <div className="flex flex-col md:flex-row max-h-[90vh]">
          {/* Image section */}
          <div className="relative w-full md:w-1/2 aspect-square bg-secondary flex items-center justify-center flex-shrink-0">
            {currentImage ? (
              <img
                src={currentImage}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <ImageOff className="h-12 w-12" />
                <span className="text-sm">Sem imagem</span>
              </div>
            )}

            {allImages.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/70 backdrop-blur-sm hover:bg-background/90 rounded-full h-8 w-8"
                  onClick={goPrev}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/70 backdrop-blur-sm hover:bg-background/90 rounded-full h-8 w-8"
                  onClick={goNext}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}

            {allImages.length > 1 && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 bg-background/70 backdrop-blur-sm rounded-full px-2 py-1">
                {allImages.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === selectedIndex ? 'bg-primary scale-125' : 'bg-muted-foreground/40'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Info section */}
          <div className="w-full md:w-1/2 p-6 flex flex-col gap-3 overflow-y-auto min-h-0">
            <div className="flex items-center gap-2 flex-wrap">
              {product.category && (
                <span className="inline-block text-[11px] font-medium uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                  {product.category}
                </span>
              )}
              {product.familyName && (
                <span className="inline-block text-[11px] font-medium text-accent-foreground bg-accent/15 px-2.5 py-1 rounded-full">
                  {product.familyName}
                </span>
              )}
            </div>

            <div className="flex items-start justify-between gap-3">
              <h2 className="font-heading text-2xl font-bold text-foreground">{product.name}</h2>

              {/* Compact cart control */}
              {product.id && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={handleAddToCart}
                    className="p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    title="Adicionar ao orçamento"
                  >
                    <ShoppingCart className="h-4 w-4" />
                  </button>
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => setQuantity((q) => q + 1)}
                      className="h-5 w-5 flex items-center justify-center rounded-t-md border border-border hover:bg-muted transition-colors"
                    >
                      <Plus className="h-3 w-3 text-muted-foreground" />
                    </button>
                    <span className="h-6 w-5 flex items-center justify-center text-xs font-semibold border-x border-border text-foreground">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="h-5 w-5 flex items-center justify-center rounded-b-md border border-border hover:bg-muted transition-colors"
                    >
                      <Minus className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {product.price != null && (
              <p className="font-heading text-3xl font-bold text-primary">
                {product.price.toFixed(2).replace(".", ",")} €
              </p>
            )}

            {product.description && (
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {product.description}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
