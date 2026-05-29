-- Auto-generate slug on insert/update if missing
CREATE OR REPLACE FUNCTION public.products_auto_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  suffix INT := 0;
BEGIN
  IF NEW.slug IS NULL OR length(trim(NEW.slug)) = 0 THEN
    base_slug := public.generate_slug(
      coalesce(NEW.name, '') ||
      CASE WHEN NEW.sku IS NOT NULL AND length(NEW.sku) > 0
           THEN '-' || NEW.sku ELSE '' END
    );
    IF base_slug IS NULL OR length(base_slug) = 0 THEN
      base_slug := substr(NEW.id::text, 1, 8);
    END IF;
    final_slug := base_slug;
    WHILE EXISTS (
      SELECT 1 FROM public.products
      WHERE slug = final_slug AND id <> NEW.id
    ) LOOP
      suffix := suffix + 1;
      final_slug := base_slug || '-' || suffix::text;
    END LOOP;
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_auto_slug_trigger ON public.products;
CREATE TRIGGER products_auto_slug_trigger
BEFORE INSERT OR UPDATE OF name, sku, slug ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.products_auto_slug();