CREATE OR REPLACE FUNCTION public.bix_leader_status(p_user uuid)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH l AS (SELECT * FROM public.bix_leaders WHERE user_id = p_user),
  own AS (SELECT COALESCE(max(amount_usd),0) v FROM public.stakes WHERE user_id = p_user AND status = 'active'),
  base AS (SELECT COALESCE(NULLIF((SELECT virtual_usd FROM l WHERE status='approved'),0), (SELECT v FROM own)) v),
  turn AS (SELECT COALESCE(sum(s.amount_usd),0) v FROM public.stakes s JOIN public.referral_codes r ON r.user_id = s.user_id
           WHERE r.referred_by = p_user AND s.status = 'active' AND NOT s.funded_vusdt
             AND NOT EXISTS (SELECT 1 FROM public.bix_clone_accounts c WHERE c.user_id = s.user_id)
             AND NOT EXISTS (SELECT 1 FROM public.bix_leaders bl WHERE bl.user_id = s.user_id AND bl.status = 'approved' AND bl.virtual_usd > 0)),
  esc AS (SELECT COALESCE(sum(w.net_usd),0) v FROM public.wallet_transactions w, l WHERE w.user_id = p_user AND w.type='reward' AND w.status='approved' AND w.created_at >= l.created_at),
  q AS (SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM l WHERE status='approved') THEN true
                    WHEN NOT (SELECT require_turnover FROM l) THEN true
                    ELSE (SELECT v FROM base) > 0 AND (SELECT v FROM turn) >= (SELECT v FROM base) * (SELECT turnover_multiple FROM l) END v)
  SELECT CASE WHEN p_user = auth.uid() OR public.is_bix_admin() OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'reviewer') OR (auth.uid() IS NULL AND current_user = 'postgres') THEN
    jsonb_build_object('status', (SELECT status FROM l), 'kind', (SELECT support_kind FROM l),
      'virtual_usd', COALESCE((SELECT virtual_usd FROM l WHERE status='approved'),0),
      'require_turnover', COALESCE((SELECT require_turnover FROM l), true),
      'multiple', COALESCE((SELECT turnover_multiple FROM l), 3),
      'own_stake', (SELECT v FROM own), 'base', (SELECT v FROM base), 'turnover', (SELECT v FROM turn),
      'target', (SELECT v FROM base) * COALESCE((SELECT turnover_multiple FROM l), 3),
      'escrow_usd', CASE WHEN (SELECT v FROM q) THEN 0 ELSE (SELECT v FROM esc) END,
      'qualified', (SELECT v FROM q)) ELSE NULL END
$function$;