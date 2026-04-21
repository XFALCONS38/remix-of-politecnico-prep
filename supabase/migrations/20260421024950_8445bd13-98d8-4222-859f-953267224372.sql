
CREATE OR REPLACE FUNCTION public.get_user_allowed_sets(_user_id uuid)
RETURNS TABLE(set_id text, is_bonus boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _tier_id uuid;
  _has_any_mapping boolean;
BEGIN
  -- Find the user's active tier (match by slug or name)
  SELECT t.id INTO _tier_id
  FROM public.subscriptions s
  JOIN public.subscription_tiers t
    ON t.slug = s.tier OR t.name = s.tier
  WHERE s.user_id = _user_id
    AND s.status = 'active'
    AND s.access_expiry > now()
  ORDER BY s.access_expiry DESC
  LIMIT 1;

  -- If no active subscription, fall back to free tier
  IF _tier_id IS NULL THEN
    SELECT id INTO _tier_id
    FROM public.subscription_tiers
    WHERE slug = 'free'
    LIMIT 1;
  END IF;

  -- Check whether ANY tier_set_access mapping exists at all
  SELECT EXISTS(SELECT 1 FROM public.tier_set_access) INTO _has_any_mapping;

  -- If no mappings exist anywhere, fall back to all available sets (safe default)
  IF NOT _has_any_mapping THEN
    RETURN QUERY
      SELECT s.set_id, false AS is_bonus
      FROM public.get_available_sets() s;
    RETURN;
  END IF;

  -- Return the tier's allowed sets
  RETURN QUERY
    SELECT tsa.set_id, tsa.is_bonus
    FROM public.tier_set_access tsa
    WHERE tsa.tier_id = _tier_id
    ORDER BY tsa.set_id;
END;
$$;
