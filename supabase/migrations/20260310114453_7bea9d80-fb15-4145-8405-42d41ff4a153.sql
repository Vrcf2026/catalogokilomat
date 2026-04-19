
-- Create product_families table (subcategories within categories)
CREATE TABLE public.product_families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_families ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can view families" ON public.product_families
FOR SELECT USING (true);

CREATE POLICY "Anyone can insert families" ON public.product_families
FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update families" ON public.product_families
FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can delete families" ON public.product_families
FOR DELETE USING (true);

-- Add family_id to products
ALTER TABLE public.products ADD COLUMN family_id uuid REFERENCES public.product_families(id) ON DELETE SET NULL;
