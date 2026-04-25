import { useState, useRef, useEffect } from "react";
import { Phone, Send, HardHat } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { HONEYPOT_FIELD_NAME, honeypotStyle, isLikelyBot } from "@/lib/antiBot";

interface ContactButtonProps {
  triggerClassName?: string;
}

const ContactButton = ({ triggerClassName }: ContactButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [honeypot, setHoneypot] = useState("");
  const formOpenedAt = useRef<number>(Date.now());

  useEffect(() => {
    if (isOpen) formOpenedAt.current = Date.now();
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLikelyBot({ honeypotValue: honeypot, formOpenedAt: formOpenedAt.current })) {
      // Silent success — don't tip off bots about the check.
      toast.success("Mensagem enviada! Entraremos em contacto brevemente.");
      setForm({ name: "", email: "", phone: "", message: "" });
      setHoneypot("");
      setIsOpen(false);
      return;
    }
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Por favor preencha nome, email e mensagem.");
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
      setIsOpen(false);
    } catch {
      toast.error("Erro ao enviar a mensagem. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={
            triggerClassName ??
            "inline-flex items-center gap-1 text-primary hover:underline transition-colors"
          }
          aria-label="Contacte-nos"
        >
          <Phone className="h-3.5 w-3.5" />
          Contacte-nos
        </button>
      </DialogTrigger>
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

        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 flex gap-2 items-start">
          <HardHat className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-foreground/80 leading-relaxed">
            <strong>Temos tudo para a sua obra.</strong> Se não vê um produto no catálogo,
            contacte-nos — fazemos chegar até si.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Honeypot — invisible to humans, bots auto-fill it */}
          <input
            type="text"
            name={HONEYPOT_FIELD_NAME}
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={honeypotStyle}
          />
          <div>
            <Label htmlFor="contact-name" className="text-xs">Nome *</Label>
            <Input
              id="contact-name"
              placeholder="O seu nome"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              maxLength={100}
              required
            />
          </div>
          <div>
            <Label htmlFor="contact-email" className="text-xs">Email *</Label>
            <Input
              id="contact-email"
              type="email"
              placeholder="O seu email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              maxLength={255}
              required
            />
          </div>
          <div>
            <Label htmlFor="contact-phone" className="text-xs">Telefone (opcional)</Label>
            <Input
              id="contact-phone"
              type="tel"
              placeholder="O seu telefone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              maxLength={30}
            />
          </div>
          <div>
            <Label htmlFor="contact-message" className="text-xs">Mensagem *</Label>
            <Textarea
              id="contact-message"
              placeholder="Diga-nos o que procura ou em que podemos ajudar..."
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              maxLength={1000}
              rows={4}
              required
            />
          </div>
          <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
            <Send className="h-4 w-4" />
            {isSubmitting ? "A enviar..." : "Enviar Mensagem"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContactButton;
