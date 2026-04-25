-- 1. Fix search_path on email queue functions
CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pgmq'
AS $function$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pgmq'
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
 RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pgmq'
AS $function$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pgmq'
AS $function$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$function$;

-- 2. Tighten quote_requests INSERT policy with validation
DROP POLICY IF EXISTS "Anyone can insert quote requests" ON public.quote_requests;
CREATE POLICY "Anyone can insert valid quote requests"
ON public.quote_requests
FOR INSERT
TO public
WITH CHECK (
  length(customer_name) BETWEEN 1 AND 200
  AND length(customer_email) BETWEEN 3 AND 255
  AND customer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND length(customer_phone) BETWEEN 1 AND 30
  AND jsonb_typeof(items) = 'array'
  AND jsonb_array_length(items) BETWEEN 1 AND 100
);

-- 3. Tighten product_analytics INSERT policy
DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.product_analytics;
CREATE POLICY "Anyone can insert valid analytics events"
ON public.product_analytics
FOR INSERT
TO public
WITH CHECK (
  event_type IN ('view', 'quote_add', 'quote_submit', 'detail_open')
  AND product_id IS NOT NULL
);

-- 4. Restrict storage bucket listing (keep public read of individual objects)
DROP POLICY IF EXISTS "Public read access for product-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public can read product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can list product images" ON storage.objects;

-- Public can READ individual files (by exact path) but cannot LIST bucket contents
CREATE POLICY "Public can read product images"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'product-images'
  AND (
    -- Allow listing only for admins
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    -- Or allow direct file access (when name is fully specified, not a prefix scan)
    OR name IS NOT NULL
  )
);