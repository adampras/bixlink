CREATE OR REPLACE FUNCTION public.bix_asset_balances(p_user uuid)
 RETURNS TABLE(usdt_balance numeric, bix_balance numeric)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT
    CASE WHEN p_user = auth.uid() OR public.is_bix_admin() OR auth.uid() IS NULL AND current_user = 'postgres' THEN
      GREATEST(0,
        public.bix_wallet_balance(p_user)
        + COALESCE((SELECT SUM(CASE
            WHEN direction = 'BIX_TO_USDT' AND status = 'approved' THEN amount_out
            WHEN direction = 'USDT_TO_BIX' AND status IN ('pending','approved') THEN -amount_in
            ELSE 0 END)
          FROM public.swap_requests WHERE user_id = p_user), 0)
      )
    ELSE NULL END AS usdt_balance,
    CASE WHEN p_user = auth.uid() OR public.is_bix_admin() OR auth.uid() IS NULL AND current_user = 'postgres' THEN
      GREATEST(0,
        COALESCE((SELECT SUM(CASE
            WHEN direction = 'USDT_TO_BIX' AND status = 'approved' THEN amount_out
            WHEN direction = 'BIX_TO_USDT' AND status IN ('pending','approved') THEN -amount_in
            ELSE 0 END)
          FROM public.swap_requests WHERE user_id = p_user), 0)
        + COALESCE((SELECT SUM(CASE WHEN recipient_id = p_user THEN amount_bix ELSE -amount_bix END)
          FROM public.bix_transfers WHERE status = 'completed' AND (sender_id = p_user OR recipient_id = p_user)), 0)
        + COALESCE((SELECT SUM(amount_bix) FROM public.bix_allocations WHERE user_id = p_user), 0)
        + COALESCE((SELECT v.balance_bix FROM public.owner_bix_vault v
            WHERE v.owner_id = p_user AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = p_user AND r.role = 'admin')), 0)
      )
    ELSE NULL END AS bix_balance
$function$;

INSERT INTO public.owner_bix_vault (owner_id, balance_bix)
SELECT user_id, 1000000 FROM public.user_roles WHERE role = 'admin'
ON CONFLICT (owner_id) DO NOTHING;