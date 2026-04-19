import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { Minus, Plus, Trash2, ShoppingCart, Send, XCircle } from "lucide-react";
import { useState } from "react";
import { CheckoutDialog } from "./CheckoutDialog";

export function CartDrawer() {
  const { items, isOpen, setIsOpen, updateQuantity, removeItem, clearCart } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const totalValue = items.reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent className="flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Carrinho de Orçamento
            </SheetTitle>
          </SheetHeader>

          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <ShoppingCart className="h-12 w-12 opacity-40" />
              <p className="text-sm">O carrinho está vazio</p>
            </div>
          ) : (
            <>
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" className="text-destructive gap-1 text-xs" onClick={clearCart}>
                  <XCircle className="h-3.5 w-3.5" />
                  Limpar tudo
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-3 py-2">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3 p-3 rounded-lg border border-border bg-card">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-md object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                        <ShoppingCart className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-1">{item.name}</p>
                      {item.category && (
                        <span className="text-[10px] uppercase tracking-wider text-primary">{item.category}</span>
                      )}
                      {item.price != null && (
                        <p className="text-xs text-muted-foreground">{item.price.toFixed(2).replace(".", ",")} €/un</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto text-destructive" onClick={() => removeItem(item.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total de artigos:</span>
                  <span className="font-semibold">{items.reduce((s, i) => s + i.quantity, 0)}</span>
                </div>
                {totalValue > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Valor total estimado:</span>
                    <span className="font-semibold">{totalValue.toFixed(2).replace(".", ",")} €</span>
                  </div>
                )}
                <Button className="w-full gap-2" size="lg" onClick={() => { setIsOpen(false); setCheckoutOpen(true); }}>
                  <Send className="h-4 w-4" />
                  Pedir Orçamento
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <CheckoutDialog open={checkoutOpen} onOpenChange={setCheckoutOpen} />
    </>
  );
}
