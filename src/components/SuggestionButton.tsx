import { useState, useRef, useEffect } from "react";
import { MessageSquarePlus, Send } from "lucide-react";
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

interface SuggestionButtonProps {
  triggerClassName?: string;
}

const SuggestionButton = ({ triggerClassName }: SuggestionButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [honeypot, setHoneypot] = useState("");
  const formOpenedAt = useRef<number>(Date.now());

  useEffect(() => {
    if (isOpen) formOpenedAt.current = Date.now();
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLikelyBot({ honeypotValue: honeypot, formOpenedAt: formOpenedAt.current })) {
      toast.success("Sugestão enviada com sucesso! Obrigado pelo seu contributo.");
      setForm({ name: "", email: "", message: "" });
      setHoneypot("");
      setIsOpen(false);
      return;
    }
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Por favor preencha todos os campos.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("send-suggestion", {
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          message: form.message.trim(),
        },
      });

      if (error) throw error;

      toast.success("Sugestão enviada com sucesso! Obrigado pelo seu contributo.");
      setForm({ name: "", email: "", message: "" });
      setIsOpen(false);
    } catch {
      toast.error("Erro ao enviar a sugestão. Tente novamente.");
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
          aria-label="Enviar sugestão"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          Sugestão
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5 text-primary" />
            Envie a sua sugestão
          </DialogTitle>
          <DialogDescription>
            A sua opinião é importante para nós. Partilhe as suas ideias ou sugestões.
          </DialogDescription>
        </DialogHeader>
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
                <Label htmlFor="suggestion-name" className="text-xs">Nome</Label>
                <Input
                  id="suggestion-name"
                  placeholder="O seu nome"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  maxLength={100}
                  required
                />
              </div>
              <div>
                <Label htmlFor="suggestion-email" className="text-xs">Email</Label>
                <Input
                  id="suggestion-email"
                  type="email"
                  placeholder="O seu email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  maxLength={255}
                  required
                />
              </div>
              <div>
                <Label htmlFor="suggestion-message" className="text-xs">Mensagem</Label>
                <Textarea
                  id="suggestion-message"
                  placeholder="Escreva aqui a sua sugestão..."
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  maxLength={1000}
                  rows={4}
                  required
                />
              </div>
              <Button type="submit" className="w-full gap-2" disabled={isSubmitting}>
                <Send className="h-4 w-4" />
                {isSubmitting ? "A enviar..." : "Enviar Sugestão"}
              </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SuggestionButton;
