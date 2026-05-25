
CREATE TABLE IF NOT EXISTS public.homepage_highlights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('brand', 'category')),
  ref_id TEXT NOT NULL,
  label TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (type, ref_id)
);

CREATE INDEX IF NOT EXISTS idx_homepage_highlights_type ON public.homepage_highlights(type);
CREATE INDEX IF NOT EXISTS idx_homepage_highlights_active ON public.homepage_highlights(active);

ALTER TABLE public.homepage_highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Highlights viewable by everyone"
  ON public.homepage_highlights FOR SELECT USING (true);

CREATE POLICY "Admins can insert highlights"
  ON public.homepage_highlights FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update highlights"
  ON public.homepage_highlights FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete highlights"
  ON public.homepage_highlights FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);

CREATE OR REPLACE FUNCTION public.generate_slug(input TEXT) RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  result TEXT;
BEGIN
  result := lower(coalesce(input, ''));
  result := translate(result, 'áàãâäéèêëíìîïóòõôöúùûüçñ', 'aaaaaeeeeiiiioooooouuuucn');
  result := regexp_replace(result, '[^a-z0-9\s-]', '', 'g');
  result := regexp_replace(result, '\s+', '-', 'g');
  result := regexp_replace(result, '-+', '-', 'g');
  result := trim(both '-' from result);
  RETURN result;
END;
$$;
