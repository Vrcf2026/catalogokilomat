import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

  if (isLoading || brands.length === 0) return null;

  const items = [...brands, ...brands];

  return (
    <section
      className="border-y border-border/50 bg-muted/30 py-6 overflow-hidden"
      aria-label="Marcas que trabalhamos"
    >
      <div className="container mx-auto px-4">
        <p className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-4">
          Trabalhamos com as melhores marcas
        </p>
        <div className="relative overflow-hidden">
          <div
            className="flex gap-8 sm:gap-12 w-max"
            style={{ animation: "kilomat-scroll-x 40s linear infinite" }}
          >
            {items.map((b, i) => (
              <div
                key={`${b.id}-${i}`}
                className="shrink-0 flex items-center justify-center h-10 sm:h-12 px-3"
                title={b.name}
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
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes kilomat-scroll-x {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
};

export default BrandsStrip;
