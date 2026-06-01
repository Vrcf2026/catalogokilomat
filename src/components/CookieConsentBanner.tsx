import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Cookie, X } from "lucide-react";

const COOKIE_CONSENT_KEY = "kilomat_cookie_consent";

export function openCookiePreferences() {
  try {
    localStorage.removeItem(COOKIE_CONSENT_KEY);
  } catch {}
  window.dispatchEvent(new Event("kilomat:reopen-cookies"));
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const handler = () => setVisible(true);
    window.addEventListener("kilomat:reopen-cookies", handler);
    return () => window.removeEventListener("kilomat:reopen-cookies", handler);
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    setVisible(false);
    window.location.reload();
  };

  const handleReject = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "rejected");
    try { localStorage.removeItem("kilomat_cart"); } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 animate-in slide-in-from-bottom-5 duration-500">
      <div className="container mx-auto max-w-2xl">
        <div className="rounded-xl border border-border bg-background/95 backdrop-blur-lg shadow-xl p-5">
          <div className="flex items-start gap-3">
            <Cookie className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 space-y-3">
              <p className="text-sm text-foreground leading-relaxed">
                Utilizamos cookies essenciais para o funcionamento do website e cookies funcionais
                para guardar o seu carrinho de orçamento entre visitas.{" "}
                <Link to="/politica-de-cookies" className="text-primary hover:underline font-medium">
                  Política de Cookies
                </Link>
                .
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Se recusar os cookies funcionais, o carrinho não será guardado ao fechar o browser.
                Pode alterar a sua escolha a qualquer momento clicando em{" "}
                <strong className="text-foreground">Gerir Cookies</strong> no rodapé.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={handleAccept} className="gap-1.5">
                  Aceitar Todos
                </Button>
                <Button size="sm" variant="outline" onClick={handleReject}>
                  Apenas Essenciais
                </Button>
              </div>
            </div>
            <button
              onClick={handleReject}
              className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
