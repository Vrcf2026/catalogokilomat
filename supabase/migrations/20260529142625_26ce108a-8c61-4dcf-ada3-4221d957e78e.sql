-- generate_slug: only used server-side / by admin code paths
REVOKE EXECUTE ON FUNCTION public.generate_slug(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_slug(text) TO authenticated, service_role;

-- update_updated_at_column: trigger function, no need for direct execute by clients
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO service_role;

-- has_role: required by RLS policies — authenticated users must call it. Revoke from anon.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;