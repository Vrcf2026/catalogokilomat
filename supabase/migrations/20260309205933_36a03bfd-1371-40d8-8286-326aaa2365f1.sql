
-- Allow anyone to read products
CREATE POLICY "Anyone can view products" ON public.products
FOR SELECT USING (true);

-- Allow anyone to insert products
CREATE POLICY "Anyone can insert products" ON public.products
FOR INSERT WITH CHECK (true);

-- Allow anyone to update products
CREATE POLICY "Anyone can update products" ON public.products
FOR UPDATE USING (true) WITH CHECK (true);
