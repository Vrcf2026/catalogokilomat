CREATE TABLE public.product_analytics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL,
  event_type text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_analytics_product_id ON public.product_analytics(product_id);
CREATE INDEX idx_product_analytics_event_type ON public.product_analytics(event_type);
CREATE INDEX idx_product_analytics_created_at ON public.product_analytics(created_at);

ALTER TABLE public.product_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert analytics events"
ON public.product_analytics
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Admins can view analytics"
ON public.product_analytics
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete analytics"
ON public.product_analytics
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));