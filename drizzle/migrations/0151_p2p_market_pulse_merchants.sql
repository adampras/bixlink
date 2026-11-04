CREATE OR REPLACE FUNCTION public.bix_p2p_market_pulse()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH f AS (
    SELECT fl.id, fl.created_at, fl.amount_bix, fl.price_usd, fl.total_usd, fl.buyer_id, fl.seller_id, o.side AS offer_side
    FROM public.bix_p2p_fills fl
    LEFT JOIN public.bix_p2p_offers o ON o.id = fl.offer_id
  ),
  last2 AS (SELECT price_usd FROM f ORDER BY created_at DESC LIMIT 2),
  day AS (SELECT * FROM f WHERE created_at > now() - interval '24 hours'),
  owners AS (SELECT DISTINCT user_id AS uid FROM public.bix_p2p_offers WHERE status = 'open'),
  merchants AS (
    SELECT ow.uid, (SELECT count(*)::int FROM f WHERE f.buyer_id = ow.uid OR f.seller_id = ow.uid) AS fills
    FROM owners ow
  )
  SELECT CASE WHEN auth.uid() IS NULL THEN NULL ELSE jsonb_build_object(
    'last_price', (SELECT price_usd FROM last2 LIMIT 1),
    'prev_price', (SELECT price_usd FROM last2 OFFSET 1 LIMIT 1),
    'volume_24h', COALESCE((SELECT sum(amount_bix) FROM day), 0),
    'usd_24h', COALESCE((SELECT sum(total_usd) FROM day), 0),
    'trades_24h', (SELECT count(*) FROM day),
    'trades_total', (SELECT count(*) FROM f),
    'high_24h', (SELECT max(price_usd) FROM day),
    'low_24h', (SELECT min(price_usd) FROM day),
    'recent', COALESCE((SELECT jsonb_agg(r ORDER BY r->>'at' DESC) FROM (
      SELECT jsonb_build_object(
        'id', id, 'at', created_at, 'bix', amount_bix, 'price', price_usd,
        'side', CASE WHEN offer_side = 'SELL' THEN 'BUY' ELSE 'SELL' END,
        'who', 'BIX-' || upper(substr(md5(CASE WHEN offer_side = 'SELL' THEN buyer_id ELSE seller_id END::text), 1, 3)) || '***'
      ) r FROM f ORDER BY created_at DESC LIMIT 15) x), '[]'::jsonb),
    'merchants', COALESCE((SELECT jsonb_object_agg(uid::text, jsonb_build_object('tag', 'BIX-' || upper(substr(md5(uid::text), 1, 3)) || '***', 'fills', fills)) FROM merchants), '{}'::jsonb)
  ) END;
$$;

REVOKE ALL ON FUNCTION public.bix_p2p_market_pulse() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_p2p_market_pulse() TO authenticated;