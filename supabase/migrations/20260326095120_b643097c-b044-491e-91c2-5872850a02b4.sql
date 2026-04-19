
CREATE TABLE public.catalog_customizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('category', 'brand')),
  reference_name TEXT NOT NULL,
  logo_url TEXT,
  cover_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (type, reference_name)
);

ALTER TABLE public.catalog_customizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customizations viewable by everyone" ON public.catalog_customizations FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert customizations" ON public.catalog_customizations FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update customizations" ON public.catalog_customizations FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete customizations" ON public.catalog_customizations FOR DELETE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
