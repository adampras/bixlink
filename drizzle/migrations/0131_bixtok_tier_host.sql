ALTER TABLE public.bixtok_config ADD COLUMN IF NOT EXISTS live_host_min_stake_usd numeric NOT NULL DEFAULT 500;
CREATE OR REPLACE FUNCTION public.bixtok_is_tier_host(p_uid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT p_uid IS NOT NULL AND COALESCE((SELECT SUM(amount_usd) FROM public.stakes WHERE user_id = p_uid AND status = 'active'),0)
    >= (SELECT live_host_min_stake_usd FROM public.bixtok_config WHERE id = 1)
$$;
GRANT EXECUTE ON FUNCTION public.bixtok_is_tier_host(uuid) TO authenticated;