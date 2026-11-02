CREATE OR REPLACE FUNCTION public.bixtok_vip_hosts(p_uids uuid[]) RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(array_agg(u), '{}') FROM (
    SELECT s.user_id AS u FROM public.stakes s
    WHERE s.user_id = ANY(p_uids[1:200]) AND s.status = 'active'
    GROUP BY s.user_id
    HAVING SUM(s.amount_usd) >= (SELECT live_host_min_stake_usd FROM public.bixtok_config WHERE id = 1)
  ) t
$$;
REVOKE ALL ON FUNCTION public.bixtok_vip_hosts(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bixtok_vip_hosts(uuid[]) TO authenticated;