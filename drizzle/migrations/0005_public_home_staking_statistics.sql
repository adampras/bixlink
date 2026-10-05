CREATE OR REPLACE FUNCTION public.bix_public_home_stats()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'active_stakes', (SELECT count(*) FROM public.stakes WHERE status = 'active'),
    'total_staked_usd', (SELECT COALESCE(sum(amount_usd), 0) FROM public.stakes WHERE status = 'active'),
    'members', (SELECT count(*) FROM public.referral_codes),
    'average_apy', (SELECT COALESCE(round(avg(apy), 2), 0) FROM public.stakes WHERE status = 'active'),
    'income', COALESCE((SELECT jsonb_agg(jsonb_build_object('category', category, 'amount_usd', total) ORDER BY category) FROM (SELECT category, sum(amount_usd) AS total FROM public.income_sources GROUP BY category) grouped_income), '[]'::jsonb)
  )
$$;
REVOKE ALL ON FUNCTION public.bix_public_home_stats() FROM public;
GRANT EXECUTE ON FUNCTION public.bix_public_home_stats() TO anon, authenticated, service_role;