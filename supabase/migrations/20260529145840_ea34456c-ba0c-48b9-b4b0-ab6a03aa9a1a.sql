-- Populate slug for all products missing one
UPDATE public.products
SET slug = public.generate_slug(
  name || '-' || COALESCE(sku, substring(id::text, 1, 8))
)
WHERE slug IS NULL OR slug = '';

-- De-duplicate any collisions by appending the short id
WITH dupes AS (
  SELECT id, slug,
         row_number() OVER (PARTITION BY slug ORDER BY created_at) AS rn
  FROM public.products
)
UPDATE public.products p
SET slug = p.slug || '-' || substring(p.id::text, 1, 6)
FROM dupes d
WHERE p.id = d.id AND d.rn > 1;

-- Enforce uniqueness going forward
CREATE UNIQUE INDEX IF NOT EXISTS products_slug_unique ON public.products(slug);