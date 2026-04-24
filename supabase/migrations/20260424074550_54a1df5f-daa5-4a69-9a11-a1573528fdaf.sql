-- 1. Adicionar coluna SKU à tabela products
ALTER TABLE public.products 
ADD COLUMN sku text;

-- Índice único para lookups O(1) e evitar duplicados (permite múltiplos NULL)
CREATE UNIQUE INDEX idx_products_sku_unique 
ON public.products(sku) 
WHERE sku IS NOT NULL;

-- Índices auxiliares para performance com 10k+ produtos
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_family_id ON public.products(family_id);
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON public.products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);

-- 2. Tabela para guardar imagens de produtos eliminados (órfãs)
-- Quando um produto é eliminado pela sincronização, as suas imagens vão para aqui
-- ligadas pelo SKU. Se o SKU voltar num próximo import, as imagens são restauradas.
CREATE TABLE public.orphaned_product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL,
  image_url text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  product_name text,
  product_description text,
  product_category text,
  product_family_id uuid,
  product_brand_id uuid,
  product_price numeric,
  product_featured boolean DEFAULT false,
  product_include_in_catalog boolean DEFAULT false,
  orphaned_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '6 months')
);

CREATE INDEX idx_orphaned_images_sku ON public.orphaned_product_images(sku);
CREATE INDEX idx_orphaned_images_expires_at ON public.orphaned_product_images(expires_at);

ALTER TABLE public.orphaned_product_images ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver/gerir imagens órfãs (não são públicas)
CREATE POLICY "Admins can view orphaned images"
ON public.orphaned_product_images
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert orphaned images"
ON public.orphaned_product_images
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete orphaned images"
ON public.orphaned_product_images
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 3. Função de limpeza de imagens órfãs expiradas (>6 meses)
-- Pode ser chamada manualmente pelo admin ou agendada
CREATE OR REPLACE FUNCTION public.cleanup_expired_orphaned_images()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.orphaned_product_images
  WHERE expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;