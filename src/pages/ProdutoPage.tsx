import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ChevronRight, Copy, Minus, Plus, ShoppingCart, Loader2, Package, MessageCircle } from "lucide-react";
import { PRODUCT_COLUMNS } from "@/lib/fetchAllRows";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { CartDrawer } from "@/components/CartDrawer";
import kilomatLogo from "@/assets/kilomat-wordmark.png";
import { SEO } from "@/components/SEO";

export default function ProdutoPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem, setIsOpen, totalItems } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ["product_by_slug", slug],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("products")
        .select(`${PRODUCT_COLUMNS}, brands(name), product_families(name)`)
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: productImages = [] } = useQuery({
    queryKey: ["product_images_slug", product?.id],
    enabled: !!product?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("product_images")
        .select("*")
        .eq("product_id", product.id)
        .order("position", { ascending: true });
      return data || [];
    },
  });

  const allImages: string[] = productImages.length > 0
    ? productImages.map((i: any) => i.image_url)
    : product?.image_url ? [product.image_url] : [];

  // SEO
  useEffect(() => {
    if (!product) return;
    const title = `${product.name} — Kilomat`;
    document.title = title;
    const desc = product.description || `${product.name} — Consulte disponibilidade na Kilomat, Montijo.`;
    const setMeta = (selector: string, attr: string, value: string) => {
      let el = document.head.querySelector(selector) as HTMLElement | null;
      if (!el) {
        el = document.createElement("meta");
        const parts = selector.match(/\[(\w+)="([^"]+)"\]/);
        if (parts) el.setAttribute(parts[1], parts[2]);
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };
    setMeta('meta[name="description"]', "content", desc.slice(0, 160));
    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", desc.slice(0, 160));
    let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", `https://showroom.kilomat.pt/produto/${slug}`);
  }, [product, slug]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copiado!");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product || error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background p-6">
        <Package className="h-16 w-16 text-muted-foreground/40" />
        <h1 className="font-heading text-xl font-bold">Produto não encontrado</h1>
        <Button onClick={() => navigate("/")}>Voltar ao catálogo</Button>
      </div>
    );
  }

  const brandName = product.brands?.name as string | undefined;
  const familyName = product.product_families?.name as string | undefined;
  const waText = encodeURIComponent(`Olá Kilomat, quero informação sobre: ${product.name} (Ref: ${product.sku || slug})`);

  const seoTitle = `${product.name}${brandName ? ` — ${brandName}` : ""} | Kilomat`.slice(0, 60);
  const rawDesc = (product as any).description || (product as any).short_description || "";
  const cleanDesc = String(rawDesc).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  const seoDesc = (cleanDesc || `${product.name}${familyName ? ` — ${familyName}` : ""}. Disponível no catálogo Kilomat. Peça orçamento online.`).slice(0, 160);

  return (
    <div className="min-h-screen bg-background">
      <SEO title={seoTitle} description={seoDesc} path={`/produto/${slug}`} />
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex items-center justify-between px-3 py-2 sm:px-4 sm:py-4">
          <Link to="/">
            <img src={kilomatLogo} alt="Kilomat" className="h-10 sm:h-16 w-auto drop-shadow-md" />
          </Link>
          <div className="flex items-center gap-2">
            <DarkModeToggle />
            <Button variant="outline" size="sm" className="relative gap-1.5" onClick={() => setIsOpen(true)}>
              <ShoppingCart className="h-4 w-4" />
              Orçamento
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap mb-4">
          <Link to="/" className="hover:text-primary">Início</Link>
          {product.category && (<><ChevronRight className="h-3 w-3" /><span>{product.category}</span></>)}
          {familyName && (<><ChevronRight className="h-3 w-3" /><span>{familyName}</span></>)}
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium truncate">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Gallery */}
          <div className="space-y-3">
            <div className="aspect-square bg-secondary rounded-xl overflow-hidden flex items-center justify-center">
              {allImages.length > 0 ? (
                <img src={allImages[selectedIdx]} alt={product.name} className="w-full h-full object-contain" />
              ) : (
                <Package className="h-24 w-24 text-muted-foreground/30" />
              )}
            </div>
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedIdx(i)}
                    className={`w-16 h-16 rounded-md overflow-hidden border-2 flex-shrink-0 ${i === selectedIdx ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"}`}
                  >
                    <img src={img} alt={`${product.name} ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-4">
            {brandName && (
              <span className="inline-block bg-foreground text-background text-xs font-bold px-2 py-1 rounded">
                {brandName}
              </span>
            )}
            <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground">{product.name}</h1>
            {product.sku && (
              <p className="text-xs font-mono text-muted-foreground">REF: {product.sku}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {product.category && <Badge variant="secondary">{product.category}</Badge>}
              {familyName && <Badge variant="outline">{familyName}</Badge>}
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-sm text-muted-foreground italic">Consulte disponibilidade e preço</p>
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-border rounded-md">
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-r-none" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-l-none" onClick={() => setQuantity((q) => q + 1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  className="flex-1 gap-2"
                  onClick={() => {
                    addItem({ id: product.id, name: product.name, sku: product.sku ?? null, price: product.price, imageUrl: allImages[0] || product.image_url, category: product.category }, quantity);
                    toast.success(`${quantity}x ${product.name} adicionado`);
                    setQuantity(1);
                  }}
                >
                  <ShoppingCart className="h-4 w-4" />
                  Adicionar ao orçamento
                </Button>
              </div>
              <a
                href={`https://wa.me/351938283386?text=${waText}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full h-10 rounded-md border border-border bg-card hover:bg-accent transition-colors text-sm font-medium"
              >
                <MessageCircle className="h-4 w-4 text-green-600" />
                Enviar por WhatsApp
              </a>
              <Button variant="outline" className="w-full gap-2" onClick={copyLink}>
                <Copy className="h-4 w-4" />
                Copiar link do produto
              </Button>
            </div>

            {product.description && (
              <div className="border-t border-border pt-4">
                <h2 className="font-heading font-semibold mb-2">Descrição</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{product.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <CartDrawer />
    </div>
  );
}