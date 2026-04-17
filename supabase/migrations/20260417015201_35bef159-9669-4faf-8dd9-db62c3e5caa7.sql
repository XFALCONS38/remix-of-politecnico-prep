CREATE OR REPLACE FUNCTION public.get_available_sets()
RETURNS TABLE(set_id text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT s FROM (
    SELECT set_id AS s FROM public.questions WHERE is_active = true
    UNION
    SELECT set_id AS s FROM public.passages
  ) u
  WHERE s IS NOT NULL
  ORDER BY s;
$$;

GRANT EXECUTE ON FUNCTION public.get_available_sets() TO authenticated, anon;