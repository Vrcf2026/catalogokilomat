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

export interface CategoryMeta {
  icon: React.ElementType;
  color: string; // Tailwind text-* for icon
  bg: string;    // Tailwind bg-* for surface
}

export const categoryMetaMap: Record<string, CategoryMeta> = {
  "Tintas":                       { icon: Paintbrush,      color: "text-red-500",     bg: "bg-red-50 dark:bg-red-950/30" },
  "Elevacao e Traccao":           { icon: ArrowUpFromLine, color: "text-orange-500",  bg: "bg-orange-50 dark:bg-orange-950/30" },
  "Quimicos":                     { icon: FlaskConical,    color: "text-purple-500",  bg: "bg-purple-50 dark:bg-purple-950/30" },
  "Ferramenta Eletrica":          { icon: Zap,             color: "text-yellow-500",  bg: "bg-yellow-50 dark:bg-yellow-950/30" },
  "Exaustão e Ventilação":        { icon: Wind,            color: "text-sky-400",     bg: "bg-sky-50 dark:bg-sky-950/30" },
  "Cimentos e Argamassas":        { icon: Layers,          color: "text-stone-500",   bg: "bg-stone-100 dark:bg-stone-950/30" },
  "Canalizacao":                  { icon: Pipette,         color: "text-blue-500",    bg: "bg-blue-50 dark:bg-blue-950/30" },
  "Barramentos, Tubos e Perfis":  { icon: Minus,           color: "text-zinc-500",    bg: "bg-zinc-100 dark:bg-zinc-950/30" },
  "Chapas":                       { icon: Square,          color: "text-slate-500",   bg: "bg-slate-100 dark:bg-slate-950/30" },
  "Drogaria":                     { icon: ShoppingBag,     color: "text-pink-500",    bg: "bg-pink-50 dark:bg-pink-950/30" },
  "Fixacao":                      { icon: Anchor,          color: "text-gray-600",    bg: "bg-gray-100 dark:bg-gray-950/30" },
  "Coberturas e Terraços":        { icon: Home,            color: "text-green-600",   bg: "bg-green-50 dark:bg-green-950/30" },
  "Arames Redes e Vedacoes":      { icon: Network,         color: "text-teal-500",    bg: "bg-teal-50 dark:bg-teal-950/30" },
  "Rodas, Rodizios e Rolamentos": { icon: Circle,          color: "text-indigo-500",  bg: "bg-indigo-50 dark:bg-indigo-950/30" },
  "Ferramentas Manuais":          { icon: Wrench,          color: "text-blue-700",    bg: "bg-blue-50 dark:bg-blue-950/30" },
  "Material Electrico":           { icon: Plug,            color: "text-amber-500",   bg: "bg-amber-50 dark:bg-amber-950/30" },
  "Perfuração, Demolição e Corte":{ icon: Zap,             color: "text-red-600",     bg: "bg-red-50 dark:bg-red-950/30" },
  "Solo e Drenagem":              { icon: Waves,           color: "text-cyan-500",    bg: "bg-cyan-50 dark:bg-cyan-950/30" },
  "Ferragens":                    { icon: Lock,            color: "text-neutral-600", bg: "bg-neutral-100 dark:bg-neutral-950/30" },
  "Higiene e Proteccao":          { icon: ShieldCheck,     color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  "Solda":                        { icon: Flame,           color: "text-orange-600",  bg: "bg-orange-50 dark:bg-orange-950/30" },
  "Pladur, Perfis e Acessorios":  { icon: PanelTop,        color: "text-violet-500",  bg: "bg-violet-50 dark:bg-violet-950/30" },
  "Discos":                       { icon: Disc,            color: "text-rose-500",    bg: "bg-rose-50 dark:bg-rose-950/30" },
  "Gas":                          { icon: Gauge,           color: "text-lime-600",    bg: "bg-lime-50 dark:bg-lime-950/30" },
};

export const defaultCategoryMeta: CategoryMeta = {
  icon: Package,
  color: "text-muted-foreground",
  bg: "bg-muted",
};

export const allCategoryMeta: CategoryMeta = {
  icon: LayoutGrid,
  color: "text-primary",
  bg: "bg-primary/10",
};

export function getCategoryMeta(name?: string | null): CategoryMeta {
  if (!name) return defaultCategoryMeta;
  return categoryMetaMap[name] ?? defaultCategoryMeta;
}

// Backwards-compatible helper
export const getCategoryIcon = (category?: string | null): React.ElementType =>
  getCategoryMeta(category).icon;

export const CategoryPlaceholder = ({ category }: { category: string | null }) => {
  const meta = getCategoryMeta(category);
  const Icon = meta.icon;
  return (
    <div className={`flex flex-col items-center justify-center gap-2 w-full h-full ${meta.bg}`}>
      <Icon className={`h-12 w-12 opacity-60 ${meta.color}`} />
      {category && <span className="text-xs opacity-70 text-foreground">{category}</span>}
    </div>
  );
};

export { LayoutGrid };