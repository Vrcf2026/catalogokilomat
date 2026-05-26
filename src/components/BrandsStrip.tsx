import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

const BrandsStrip = () => {
  const { data: brands = [], isLoading } = useQuery({
    queryKey: ["brands-strip"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("id, name, logo_url")
        .order("name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || brands.length === 0) return;
    let rafId: number;
    let last = performance.now();
    const speed = 40; // px per second
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (!isHovered && el) {
        el.scrollLeft += speed * dt;
        const half = el.scrollWidth / 2;
        if (el.scrollLeft >= half) el.scrollLeft -= half;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [brands.length, isHovered]);

  const nudge = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 240, behavior: "smooth" });
  };

  if (isLoading || brands.length === 0) return null;

  const items = [...brands, ...brands];

  return (
    <section
      className="border-y border-border/50 bg-muted/30 py-6 overflow-hidden"
      aria-label="Marcas que trabalhamos"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="container mx-auto px-4">
        <p className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-4">
          Trabalhamos com as melhores marcas — clique para filtrar
        </p>
        <div className="relative">
          <button
            type="button"
            onClick={() => nudge(-1)}
            aria-label="Anterior"
            className={`absolute left-0 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full bg-background/90 border border-border shadow-md flex items-center justify-center transition-opacity hover:bg-background ${isHovered ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => nudge(1)}
            aria-label="Seguinte"
            className={`absolute right-0 top-1/2 -translate-y-1/2 z-10 h-9 w-9 rounded-full bg-background/90 border border-border shadow-md flex items-center justify-center transition-opacity hover:bg-background ${isHovered ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div
            ref={scrollRef}
            className="overflow-x-auto scrollbar-none"
            style={{ scrollbarWidth: "none" }}
          >
            <div className="flex gap-8 sm:gap-12 w-max">
            {items.map((b, i) => (
              <Link
                key={`${b.id}-${i}`}
                to={`/?brand=${b.id}`}
                className="shrink-0 flex items-center justify-center h-10 sm:h-12 px-3 hover:scale-105 transition-transform cursor-pointer"
                title={b.name}
                aria-label={`Ver produtos ${b.name}`}
              >
                {b.logo_url ? (
                  <img
                    src={b.logo_url}
                    alt={b.name}
                    className="h-full w-auto object-contain opacity-90 hover:opacity-100 transition-opacity"
                    loading="lazy"
                  />
                ) : (
                  <span className="font-heading text-sm sm:text-base font-semibold text-foreground hover:text-primary transition-colors whitespace-nowrap">
                    {b.name}
                  </span>
                )}
              </Link>
            ))}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
      `}</style>
    </section>
  );
};

export default BrandsStrip;
