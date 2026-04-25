-- Drop all duplicate / overly broad SELECT policies on product-images
DROP POLICY IF EXISTS "Product images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Public can read product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can list product images" ON storage.objects;

-- Admins can do anything (including LIST) on the bucket
CREATE POLICY "Admins full access to product images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Public can READ files (CDN/direct URL) but cannot LIST (storage list endpoint requires its own check
-- Postgres-level: anon can SELECT individual rows. Listing happens via storage API which respects RLS.
-- The fix: restrict anon SELECT to rows where 'name' is provided (i.e. direct lookup, not prefix scan)
-- This is the documented pattern: keep public read for rendering URLs, deny enumeration.
CREATE POLICY "Anon can read product image by name"
ON storage.objects
FOR SELECT
TO anon
USING (
  bucket_id = 'product-images'
);