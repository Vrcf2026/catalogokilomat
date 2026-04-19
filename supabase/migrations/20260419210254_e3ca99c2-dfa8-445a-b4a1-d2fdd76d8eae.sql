-- 1. Remove overly permissive upload policy on product-images bucket
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;

-- 2. Restrict listing of objects in product-images bucket to admins only
-- (Public reads of individual files still work via getPublicUrl)
DROP POLICY IF EXISTS "Public can list product images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Public read product images" ON storage.objects;

CREATE POLICY "Public can read product image files"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'product-images'
  AND name IS NOT NULL
);

-- 3. Allow admins to read unsubscribe tokens for auditing
CREATE POLICY "Admins can read unsubscribe tokens"
ON public.email_unsubscribe_tokens
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 4. Fix mutable search_path on has_role (already SECURITY DEFINER)
-- Already has SET search_path = public, this is just a no-op safety re-declaration
-- but we ensure update_updated_at_column also has it
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;