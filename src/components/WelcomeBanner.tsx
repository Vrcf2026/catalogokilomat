import { useEffect, useState } from "react";
import { Search, ShoppingCart, Send, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "kilomat_welcome";
const AUTO_CLOSE_MS = 10000;

export const WelcomeBanner = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(STORAGE_KEY)) {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => close(), AUTO_CLOSE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Close */}
        <button
          onClick={close}
          aria-label="Fechar"
          className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Hero image */}
        <div className="relative h-[180px] w-full">
          <img
            src="https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800"
            alt="Ferramentas Kilomat"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80" />
        </div>

        {/* Content */}
        <div className="px-6 pt-5 pb-6 space-y-5 text-center">
          <div>
            <p className="font-heading text-2xl font-bold tracking-tight" style={{ color: "#e11d48" }}>
              KILOMAT
            </p>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">
              materiais para construção
            </p>
            <p className="text-sm text-foreground/80 mt-2 leading-snug">
              Ferramentas, Construção e Agrícola
            </p>
          </div>

          {/* Steps */}
          <div className="flex items-center justify-center gap-2 text-[11px] font-medium text-foreground/80">
            <span className="inline-flex items-center gap-1">
              <Search className="h-3.5 w-3.5" style={{ color: "#e11d48" }} />
              Pesquise
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="inline-flex items-center gap-1">
              <ShoppingCart className="h-3.5 w-3.5" style={{ color: "#e11d48" }} />
              Seleccione
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="inline-flex items-center gap-1">
              <Send className="h-3.5 w-3.5" style={{ color: "#e11d48" }} />
              Peça orçamento
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
            <div
              className="h-full"
              style={{
                backgroundColor: "#e11d48",
                width: "100%",
                animation: `kilomat-welcome-progress ${AUTO_CLOSE_MS}ms linear forwards`,
              }}
            />
          </div>

          <Button
            onClick={close}
            className="w-full gap-2 text-white hover:opacity-90"
            style={{ backgroundColor: "#e11d48" }}
          >
            Entrar no catálogo
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes kilomat-welcome-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default WelcomeBanner;