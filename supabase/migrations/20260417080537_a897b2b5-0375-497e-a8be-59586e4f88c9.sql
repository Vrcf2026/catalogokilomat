CREATE TABLE public.brand_families (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES public.product_families(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (brand_id, family_id)
);

CREATE INDEX idx_brand_families_brand ON public.brand_families(brand_id);
CREATE INDEX idx_brand_families_family ON public.brand_families(family_id);

ALTER TABLE public.brand_families ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brand-family links viewable by everyone"
ON public.brand_families FOR SELECT
USING (true);

CREATE POLICY "Admins can insert brand-family links"
ON public.brand_families FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update brand-family links"
ON public.brand_families FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete brand-family links"
ON public.brand_families FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));