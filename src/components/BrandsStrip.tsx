import { useCallback, useEffect, useRef, useState } from "react";
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

  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const segmentWidthRef = useRef(0);
  const [isHovered, setIsHovered] = useState(false);
  const isHoveredRef = useRef(false);
  const repetitionCount = Math.max(4, Math.ceil(24 / Math.max(brands.length, 1)));

  const applyOffset = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    track.style.transform = `translate3d(${-offsetRef.current}px, 0, 0)`;
  }, []);

  const recalculateSegment = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const segmentWidth = track.scrollWidth / repetitionCount;
    segmentWidthRef.current = Number.isFinite(segmentWidth) ? segmentWidth : 0;
    if (segmentWidthRef.current > 0) {
      offsetRef.current = ((offsetRef.current % segmentWidthRef.current) + segmentWidthRef.current) % segmentWidthRef.current;
      applyOffset();
    }
  }, [applyOffset, repetitionCount]);

  const setPaused = (paused: boolean) => {
    isHoveredRef.current = paused;
    setIsHovered(paused);
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track || brands.length === 0) return;
    let rafId: number;
    let last = performance.now();
    const speed = 40; // px per second
    recalculateSegment();
    const resizeObserver = new ResizeObserver(recalculateSegment);
    resizeObserver.observe(track);
    window.addEventListener("resize", recalculateSegment);

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const segmentWidth = segmentWidthRef.current;
      if (!isHoveredRef.current && segmentWidth > 0) {
        offsetRef.current += speed * dt;
        if (offsetRef.current >= segmentWidth) offsetRef.current -= segmentWidth;
        applyOffset();
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", recalculateSegment);
    };
  }, [applyOffset, brands.length, recalculateSegment]);

  const nudge = (dir: 1 | -1) => {
    const segmentWidth = segmentWidthRef.current;
    if (segmentWidth <= 0) return;
    offsetRef.current = ((offsetRef.current + dir * 240) % segmentWidth + segmentWidth) % segmentWidth;
    applyOffset();
  };

  if (isLoading || brands.length === 0) return null;

  const items = Array.from({ length: repetitionCount }, () => brands).flat();

  return (
    <section
      className="border-y border-border/50 bg-muted/30 py-4 overflow-hidden"
      aria-label="Marcas que trabalhamos"
    >
      <div className="container mx-auto px-4">
        <p className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-4">
          Trabalhamos com as melhores marcas — clique para filtrar
        </p>
        <div
          className="relative"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
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
            className="overflow-hidden"
          >
            <div ref={trackRef} className="flex gap-8 sm:gap-12 w-max will-change-transform">
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
