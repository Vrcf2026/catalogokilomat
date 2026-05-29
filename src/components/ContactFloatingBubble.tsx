import { useEffect, useState } from "react";
import { X, HardHat, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { HONEYPOT_FIELD_NAME, honeypotStyle, isLikelyBot } from "@/lib/antiBot";

const STORAGE_KEY = "kilomat-contact-bubble-dismissed-at";
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24h

const ContactFloatingBubble = () => {
  const [visible, setVisible] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [honeypot, setHoneypot] = useState("");
  const [formOpenedAt, setFormOpenedAt] = useState(() => Date.now());

  useEffect(() => {
    if (dialogOpen) {
      setFormOpenedAt(Date.now());
      setHoneypot("");
    }
  }, [dialogOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissedAt = Number(localStorage.getItem(STORAGE_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DURATION_MS) return;
    const t = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Por favor preencha nome, email e mensagem.");
      return;
    }
    if (isLikelyBot({ honeypotValue: honeypot, formOpenedAt })) {
      // Silent success to avoid teaching bots what triggered the block
      toast.success("Mensagem enviada! Entraremos em contacto brevemente.");
      setForm({ name: "", email: "", phone: "", message: "" });
      setDialogOpen(false);
      dismiss();
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("send-contact", {
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          message: form.message.trim(),
        },
      });
      if (error) throw error;
      toast.success("Mensagem enviada! Entraremos em contacto brevemente.");
      setForm({ name: "", email: "", phone: "", message: "" });
      setDialogOpen(false);
      dismiss();
    } catch {
      toast.error("Erro ao enviar a mensagem. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <>
      <div
        className="fixed bottom-4 right-4 z-40 max-w-[19rem] animate-fade-in"
        role="complementary"
        aria-label="Mensagem de contacto"
      >
        <div className="relative rounded-2xl border border-primary/30 bg-background/95 backdrop-blur-md shadow-2xl p-4 pr-8">
          <button
            type="button"
            onClick={dismiss}
            aria-label="Fechar"
            className="absolute top-2 right-2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="flex gap-3 items-start">
            <div className="shrink-0 w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
              <HardHat className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-2">
              <p className="text-xs leading-relaxed text-foreground">
                <strong>Temos tudo para a sua obra.</strong>
                <br />
                Se não vê um produto no catálogo, contacte-nos — fazemos chegar até si.
              </p>
              <Button
                size="sm"
                className="h-7 px-3 text-xs gap-1.5 w-full"
                onClick={() => setDialogOpen(true)}
              >
                <Phone className="h-3 w-3" />
                Contacte-nos
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              Fale connosco
            </DialogTitle>
            <DialogDescription>
              Não encontrou o que procura? Temos tudo para construção e renovação.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label htmlFor="bubble-name" className="text-xs">Nome *</Label>
              <Input id="bubble-name" value={form.name} maxLength={100} required
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="bubble-email" className="text-xs">Email *</Label>
              <Input id="bubble-email" type="email" value={form.email} maxLength={255} required
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="bubble-phone" className="text-xs">Telefone (opcional)</Label>
              <Input id="bubble-phone" type="tel" value={form.phone} maxLength={30}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="bubble-message" className="text-xs">Mensagem *</Label>
              <Textarea id="bubble-message" rows={4} value={form.message} maxLength={1000} required
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />
            </div>
            <input
              type="text"
              name={HONEYPOT_FIELD_NAME}
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              style={honeypotStyle}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "A enviar..." : "Enviar Mensagem"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContactFloatingBubble;
