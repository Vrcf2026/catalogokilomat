import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useCart } from "@/contexts/CartContext";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Send, CheckCircle, Plus, Trash2 } from "lucide-react";
import { trackEvent } from "@/lib/trackEvent";

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CustomItem {
  id: string;
  description: string;
  quantity: number;
}

export function CheckoutDialog({ open, onOpenChange }: CheckoutDialogProps) {
  const { items, clearCart } = useCart();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [sendCopy, setSendCopy] = useState(true);
  const submitTimestamps = useRef<number[]>([]);

  const MAX_SUBMITS = 3;
  const RATE_WINDOW_MS = 60_000; // 1 minute

  const addCustomItem = () => {
    setCustomItems((prev) => [...prev, { id: crypto.randomUUID(), description: "", quantity: 1 }]);
  };

  const updateCustomItem = (id: string, field: "description" | "quantity", value: string | number) => {
    setCustomItems((prev) => prev.map((ci) => ci.id === id ? { ...ci, [field]: value } : ci));
  };

  const removeCustomItem = (id: string) => {
    setCustomItems((prev) => prev.filter((ci) => ci.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !phone.trim()) {
      toast.error("Por favor preencha todos os campos obrigatórios.");
      return;
    }
    if (!acceptedTerms) {
      toast.error("Deve aceitar os Termos e Condições para continuar.");
      return;
    }

    // Rate limiting: max 3 submits per minute
    const now = Date.now();
    submitTimestamps.current = submitTimestamps.current.filter(t => now - t < RATE_WINDOW_MS);
    if (submitTimestamps.current.length >= MAX_SUBMITS) {
      toast.error("Demasiados pedidos. Aguarde um momento antes de tentar novamente.");
      return;
    }
    submitTimestamps.current.push(now);

    const validCustomItems = customItems.filter((ci) => ci.description.trim());

    setLoading(true);
    try {
      const quoteItems = [
        ...items.map((i) => ({
          id: i.id,
          name: i.name,
          price: i.price,
          category: i.category,
          quantity: i.quantity,
        })),
        ...validCustomItems.map((ci) => ({
          id: ci.id,
          name: ci.description.trim(),
          price: null,
          category: "Pedido personalizado",
          quantity: ci.quantity,
        })),
      ];

      const { error: fnError } = await supabase.functions.invoke("send-quote-request", {
        body: {
          customerName: name.trim(),
          customerEmail: email.trim(),
          customerPhone: phone.trim(),
          notes: notes.trim(),
          items: quoteItems,
          sendCopyToCustomer: sendCopy,
        },
      });
      if (fnError) throw fnError;

      setSuccess(true);
      // Track quote events for analytics
      items.forEach((item) => trackEvent(item.id, "quote"));
      clearCart();
      setTimeout(() => {
        setSuccess(false);
        onOpenChange(false);
        setName("");
        setEmail("");
        setPhone("");
        setNotes("");
        setCustomItems([]);
        setAcceptedTerms(false);
        setSendCopy(true);
      }, 3000);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar pedido. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <h3 className="font-heading text-xl font-bold">Pedido Enviado!</h3>
            <p className="text-muted-foreground text-sm">
              O seu pedido de orçamento foi enviado com sucesso. Entraremos em contacto brevemente.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pedir Orçamento</DialogTitle>
          <DialogDescription>
            Preencha os seus dados para receber um orçamento personalizado.
          </DialogDescription>
        </DialogHeader>

        {/* Items summary */}
        {items.length > 0 && (
          <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-2 max-h-40 overflow-y-auto">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-foreground">{item.quantity}x {item.name}</span>
                {item.price != null && (
                  <span className="text-muted-foreground">{(item.price * item.quantity).toFixed(2).replace(".", ",")} €</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Custom items section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Produtos adicionais (texto livre)</Label>
            <Button type="button" variant="outline" size="sm" className="gap-1 text-xs" onClick={addCustomItem}>
              <Plus className="h-3 w-3" />
              Adicionar
            </Button>
          </div>
          {customItems.map((ci) => (
            <div key={ci.id} className="flex gap-2 items-start">
              <Input
                placeholder="Descreva o produto..."
                value={ci.description}
                onChange={(e) => updateCustomItem(ci.id, "description", e.target.value)}
                className="flex-1"
                maxLength={200}
              />
              <Input
                type="number"
                min={1}
                value={ci.quantity}
                onChange={(e) => updateCustomItem(ci.id, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 text-center"
              />
              <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-destructive flex-shrink-0" onClick={() => removeCustomItem(ci.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="O seu nome" required maxLength={100} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" required maxLength={255} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Contacto Telefónico *</Label>
            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+351 912 345 678" required maxLength={20} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Informações adicionais..." maxLength={1000} rows={3} />
          </div>
          <div className="flex items-start space-x-2">
            <Checkbox
              id="sendCopy"
              checked={sendCopy}
              onCheckedChange={(checked) => setSendCopy(checked === true)}
            />
            <label htmlFor="sendCopy" className="text-xs text-muted-foreground leading-tight cursor-pointer">
              Enviar uma cópia do pedido para o meu email
            </label>
          </div>
          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
            />
            <label htmlFor="terms" className="text-xs text-muted-foreground leading-tight cursor-pointer">
              Li e aceito os{" "}
              <a href="/termos-e-condicoes" target="_blank" className="text-primary hover:underline">
                Termos e Condições
              </a>{" "}
              e a{" "}
              <a href="/termos-e-condicoes#6" target="_blank" className="text-primary hover:underline">
                Política de Privacidade
              </a>.
            </label>
          </div>
          <Button type="submit" className="w-full gap-2" size="lg" disabled={loading || !acceptedTerms}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar Pedido de Orçamento
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
