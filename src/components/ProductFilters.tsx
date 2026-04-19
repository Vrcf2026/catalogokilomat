import { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";

interface Family {
  id: string;
  name: string;
}

interface Brand {
  id: string;
  name: string;
}

interface ProductFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  familyFilter: string;
  onFamilyChange: (value: string) => void;
  brandFilter: string;
  onBrandChange: (value: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  categories: string[];
  visibleFamilies: Family[];
  visibleBrands: Brand[];
}

export const ProductFilters = ({
  search,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  familyFilter,
  onFamilyChange,
  brandFilter,
  onBrandChange,
  sortBy,
  onSortChange,
  categories,
  visibleFamilies,
  visibleBrands,
}: ProductFiltersProps) => {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const isMobile = useIsMobile();

  const activeFilterCount = [
    categoryFilter !== "all",
    familyFilter !== "all",
    brandFilter !== "all",
    sortBy !== "featured",
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    onCategoryChange("all");
    onFamilyChange("all");
    onBrandChange("all");
    onSortChange("featured");
    onSearchChange("");
  };

  const hasActiveFilters = activeFilterCount > 0 || search.length > 0;

  const filterControls = (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <Select value={categoryFilter} onValueChange={onCategoryChange}>
        <SelectTrigger className="w-full bg-card border-border">
          <SelectValue placeholder="Todas as Categorias" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as Categorias</SelectItem>
          {categories.map((cat) => (
            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {visibleFamilies.length > 0 && (
        <Select value={familyFilter} onValueChange={onFamilyChange}>
          <SelectTrigger className="w-full bg-card border-border">
            <SelectValue placeholder="Todas as Famílias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Famílias</SelectItem>
            {visibleFamilies.map((f) => (
              <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {visibleBrands.length > 0 && (
        <Select value={brandFilter} onValueChange={onBrandChange}>
          <SelectTrigger className="w-full bg-card border-border">
            <SelectValue placeholder="Todas as Marcas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Marcas</SelectItem>
            {visibleBrands.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="w-full bg-card border-border">
          <SelectValue placeholder="Ordenar por" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="featured">Destaques</SelectItem>
          <SelectItem value="newest">Mais recentes</SelectItem>
          <SelectItem value="name-asc">Nome (A-Z)</SelectItem>
          <SelectItem value="name-desc">Nome (Z-A)</SelectItem>
          <SelectItem value="price-asc">Preço (menor)</SelectItem>
          <SelectItem value="price-desc">Preço (maior)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <section className="container mx-auto px-4 pb-6">
      <div className="max-w-5xl mx-auto space-y-3">
        {/* Search bar + filter toggle */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar produtos..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 bg-card border-border"
            />
          </div>
          {isMobile && (
            <Button
              variant={filtersOpen ? "default" : "outline"}
              size="icon"
              className="shrink-0 relative"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          )}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-muted-foreground hover:text-foreground gap-1 hidden sm:flex"
              onClick={clearAllFilters}
            >
              <X className="h-3.5 w-3.5" />
              Limpar
            </Button>
          )}
        </div>

        {/* Desktop: always show filters */}
        {!isMobile && filterControls}

        {/* Mobile: collapsible filters */}
        {isMobile && filtersOpen && (
          <div className="animate-in slide-in-from-top-2 duration-200">
            {filterControls}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 text-muted-foreground hover:text-foreground gap-1"
                onClick={clearAllFilters}
              >
                <X className="h-3.5 w-3.5" />
                Limpar filtros
              </Button>
            )}
          </div>
        )}

        {/* Active filter badges (mobile, when filters are closed) */}
        {isMobile && !filtersOpen && hasActiveFilters && (
          <div className="flex flex-wrap gap-1.5">
            {categoryFilter !== "all" && (
              <Badge variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={() => onCategoryChange("all")}>
                {categoryFilter} <X className="h-3 w-3" />
              </Badge>
            )}
            {familyFilter !== "all" && (
              <Badge variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={() => onFamilyChange("all")}>
                Família <X className="h-3 w-3" />
              </Badge>
            )}
            {brandFilter !== "all" && (
              <Badge variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={() => onBrandChange("all")}>
                Marca <X className="h-3 w-3" />
              </Badge>
            )}
            {sortBy !== "featured" && (
              <Badge variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={() => onSortChange("featured")}>
                Ordenação <X className="h-3 w-3" />
              </Badge>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
