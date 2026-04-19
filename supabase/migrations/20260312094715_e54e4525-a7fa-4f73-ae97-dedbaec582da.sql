
-- Create product_images table for multiple images per product
CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Public can view images
CREATE POLICY "Images viewable by everyone" ON public.product_images FOR SELECT TO public USING (true);

-- Admins can manage images
CREATE POLICY "Admins can insert images" ON public.product_images FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update images" ON public.product_images FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete images" ON public.product_images FOR DELETE TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
