import {
  Package,
  Paintbrush,
  ArrowUpFromLine,
  FlaskConical,
  Zap,
  Wind,
  Layers,
  Pipette,
  Minus,
  Square,
  ShoppingBag,
  Anchor,
  Home,
  Network,
  Circle,
  Wrench,
  Plug,
  Flame,
  Waves,
  Lock,
  ShieldCheck,
  Disc,
  Gauge,
  PanelTop,
  LayoutGrid,
} from "lucide-react";
import type React from "react";

export const categoryIconMap: Record<string, React.ElementType> = {
  "Tintas": Paintbrush,
  "Elevacao e Traccao": ArrowUpFromLine,
  "Quimicos": FlaskConical,
  "Ferramenta Eletrica": Zap,
  "Exaustão e Ventilação": Wind,
  "Cimentos e Argamassas": Layers,
  "Canalizacao": Pipette,
  "Barramentos, Tubos e Perfis": Minus,
  "Chapas": Square,
  "Drogaria": ShoppingBag,
  "Fixacao": Anchor,
  "Coberturas e Terraços": Home,
  "Arames Redes e Vedacoes": Network,
  "Rodas, Rodizios e Rolamentos": Circle,
  "Ferramentas Manuais": Wrench,
  "Material Electrico": Plug,
  "Perfuração, Demolição e Corte": Zap,
  "Solo e Drenagem": Waves,
  "Ferragens": Lock,
  "Higiene e Proteccao": ShieldCheck,
  "Solda": Flame,
  "Pladur, Perfis e Acessorios": PanelTop,
  "Discos": Disc,
  "Gas": Gauge,
};

export const getCategoryIcon = (category?: string | null): React.ElementType => {
  if (!category) return Package;
  return categoryIconMap[category] || Package;
};

export const CategoryPlaceholder = ({ category }: { category: string | null }) => {
  const Icon = getCategoryIcon(category);
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground w-full h-full bg-secondary/60">
      <Icon className="h-12 w-12 opacity-40" />
      {category && <span className="text-xs opacity-60">{category}</span>}
    </div>
  );
};

export { LayoutGrid };