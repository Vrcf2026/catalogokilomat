export interface CatalogPaginationProduct {
  id: string;
  name: string;
  family_id: string | null;
  featured?: boolean;
}

export interface CatalogFamilyPage<T extends CatalogPaginationProduct = CatalogPaginationProduct> {
  familyName: string;
  products: T[];
  pageNumberInFamily: number;
  totalPagesInFamily: number;
}

const PRODUCTS_PER_PAGE = 6;

function sortFamilyProducts<T extends CatalogPaginationProduct>(products: T[]) {
  return [...products].sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return a.name.localeCompare(b.name, "pt", { sensitivity: "base" });
  });
}

export function buildCatalogFamilyPages<T extends CatalogPaginationProduct>(
  products: T[],
  familyMap: Record<string, string>
): CatalogFamilyPage<T>[] {
  const familyGroups = new Map<string, T[]>();

  products.forEach((product) => {
    const familyName = product.family_id && familyMap[product.family_id]
      ? familyMap[product.family_id]
      : "Outros";

    const existing = familyGroups.get(familyName) ?? [];
    existing.push(product);
    familyGroups.set(familyName, existing);
  });

  const pages: CatalogFamilyPage<T>[] = [];

  for (const [familyName, familyProducts] of familyGroups.entries()) {
    const sortedProducts = sortFamilyProducts(familyProducts);
    const totalPagesInFamily = Math.max(1, Math.ceil(sortedProducts.length / PRODUCTS_PER_PAGE));

    for (let pageIndex = 0; pageIndex < totalPagesInFamily; pageIndex += 1) {
      const start = pageIndex * PRODUCTS_PER_PAGE;
      const end = start + PRODUCTS_PER_PAGE;

      pages.push({
        familyName,
        products: sortedProducts.slice(start, end),
        pageNumberInFamily: pageIndex + 1,
        totalPagesInFamily,
      });
    }
  }

  return pages.length > 0
    ? pages
    : [{ familyName: "Sem resultados", products: [], pageNumberInFamily: 1, totalPagesInFamily: 1 }];
}