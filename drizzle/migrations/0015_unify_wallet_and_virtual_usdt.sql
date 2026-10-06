CREATE OR REPLACE FUNCTION public.bix_vusdt_component(p_user uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (CASE WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user AND role = 'admin') THEN 1000000 ELSE 0 END)
    + COALESCE((SELECT SUM(CASE WHEN recipient_id = p_user THEN amount_usd ELSE -amount_usd END)
        FROM public.vusdt_transfers WHERE sender_id = p_user OR recipient_id = p_user), 0)
    - COALESCE((SELECT SUM(amount_usd) FROM public.stakes WHERE user_id = p_user AND funded_vusdt), 0)
    + COALESCE((SELECT SUM(refund_usd) FROM public.stakes WHERE user_id = p_user AND funded_vusdt AND status = 'unstaked'), 0)
$$;
REVOKE ALL ON FUNCTION public.bix_vusdt_component(uuid) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bix_wallet_balance(p_user uuid)
 RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT CASE WHEN p_user = auth.uid() OR public.is_bix_admin() OR auth.uid() IS NULL AND current_user = 'postgres' THEN
    (SELECT COALESCE(SUM(CASE
      WHEN type IN ('deposit','reward') AND status = 'approved' THEN net_usd
      WHEN type = 'withdraw' AND status IN ('approved','pending') THEN -amount_usd
      ELSE 0 END), 0) FROM public.wallet_transactions WHERE user_id = p_user)
    + COALESCE((SELECT virtual_usd FROM public.bix_leaders WHERE user_id = p_user AND status = 'approved'), 0)
    + public.bix_vusdt_component(p_user)
  ELSE NULL END
$function$;

CREATE OR REPLACE FUNCTION public.bix_vusdt_balance(p_user uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (SELECT usdt_balance FROM public.bix_asset_balances(p_user))
$$;