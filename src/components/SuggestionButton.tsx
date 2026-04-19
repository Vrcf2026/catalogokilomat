import { useState } from "react";
import { MessageSquarePlus, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SuggestionButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105"
        aria-label="Enviar sugestão"
      >
        <MessageSquarePlus className="h-5 w-5" />
        <span className="hidden sm:inline text-sm font-medium">Sugestão</span>
      </button>

      {/* Overlay + Form */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 bg-background border border-border rounded-2xl shadow-2xl p-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-semibold text-foreground flex items-center gap-2">
                <MessageSquarePlus className="h-5 w-5 text-primary" />
                Envie a sua sugestão
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              A sua opinião é importante para nós. Partilhe as suas ideias ou sugestões.
            </p>
            <form onSubmit={handleSubmit} className="space-y-3">
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
          </div>
        </div>
      )}
    </>
  );
};

export default SuggestionButton;
