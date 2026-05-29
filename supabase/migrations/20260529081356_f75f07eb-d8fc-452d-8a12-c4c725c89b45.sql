ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS ordem INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS visivel BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS icone TEXT;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name) AS rn FROM public.categories
)
UPDATE public.categories c SET ordem = r.rn FROM ranked r WHERE c.id = r.id;