ALTER TABLE public.bix_leaders ADD COLUMN IF NOT EXISTS support_kind text NOT NULL DEFAULT 'virtual' CHECK (support_kind IN ('loan','virtual'));
UPDATE public.bix_leaders SET support_kind = CASE WHEN turnover_multiple = 5 THEN 'loan' ELSE 'virtual' END;
UPDATE public.bix_leaders SET turnover_multiple = CASE WHEN support_kind='loan' THEN 5 ELSE 3 END;

CREATE OR REPLACE FUNCTION public.bix_leader_kind_guard() RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.support_kind := CASE WHEN NEW.turnover_multiple = 5 THEN 'loan' ELSE 'virtual' END;
  END IF;
  NEW.turnover_multiple := CASE WHEN NEW.support_kind = 'loan' THEN 5 ELSE 3 END;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS bix_leaders_kind_guard ON public.bix_leaders;
CREATE TRIGGER bix_leaders_kind_guard BEFORE INSERT OR UPDATE ON public.bix_leaders FOR EACH ROW EXECUTE FUNCTION public.bix_leader_kind_guard();

CREATE OR REPLACE FUNCTION public.bix_leader_status(p_user uuid)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH l AS (SELECT * FROM public.bix_leaders WHERE user_id = p_user),
  own AS (SELECT COALESCE(max(amount_usd),0) v FROM public.stakes WHERE user_id = p_user AND status = 'active'),
  base AS (SELECT COALESCE(NULLIF((SELECT virtual_usd FROM l WHERE status='approved'),0), (SELECT v FROM own)) v),
  turn AS (SELECT COALESCE(sum(s.amount_usd),0) v FROM public.stakes s JOIN public.referral_codes r ON r.user_id = s.user_id WHERE r.referred_by = p_user AND s.status = 'active'
             AND NOT EXISTS (SELECT 1 FROM public.bix_clone_accounts c WHERE c.user_id = s.user_id)),
  esc AS (SELECT COALESCE(sum(w.net_usd),0) v FROM public.wallet_transactions w, l WHERE w.user_id = p_user AND w.type='reward' AND w.status='approved' AND w.created_at >= l.created_at),
  q AS (SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM l WHERE status='approved') THEN true
                    WHEN NOT (SELECT require_turnover FROM l) THEN true
                    ELSE (SELECT v FROM base) > 0 AND (SELECT v FROM turn) >= (SELECT v FROM base) * (SELECT turnover_multiple FROM l) END v)
  SELECT CASE WHEN p_user = auth.uid() OR public.is_bix_admin() OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'reviewer') OR (auth.uid() IS NULL AND current_user = 'postgres') THEN
    jsonb_build_object(
      'status', (SELECT status FROM l),
      'kind', (SELECT support_kind FROM l),
      'virtual_usd', COALESCE((SELECT virtual_usd FROM l WHERE status='approved'),0),
      'require_turnover', COALESCE((SELECT require_turnover FROM l), true),
      'multiple', COALESCE((SELECT turnover_multiple FROM l), 3),
      'own_stake', (SELECT v FROM own),
      'base', (SELECT v FROM base),
      'turnover', (SELECT v FROM turn),
      'target', (SELECT v FROM base) * COALESCE((SELECT turnover_multiple FROM l), 3),
      'escrow_usd', CASE WHEN (SELECT v FROM q) THEN 0 ELSE (SELECT v FROM esc) END,
      'qualified', (SELECT v FROM q)
    ) ELSE NULL END
$function$;

CREATE OR REPLACE FUNCTION public.request_bix_withdraw(p_amount numeric, p_address text)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_id uuid; v_fee numeric; v_status jsonb; v_balance numeric; v_today numeric; v_locked numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF p_amount IS NULL OR p_amount < 10 THEN RAISE EXCEPTION 'Minimum withdrawal is $10'; END IF;
  IF p_amount > 10000 THEN RAISE EXCEPTION 'Maximum withdrawal is $10,000 per day per account'; END IF;
  IF length(trim(coalesce(p_address,''))) < 20 THEN RAISE EXCEPTION 'Valid wallet address required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text));
  SELECT COALESCE(sum(amount_usd), 0) INTO v_today FROM public.wallet_transactions
  WHERE user_id = auth.uid() AND type = 'withdraw' AND status IN ('pending','approved') AND created_at >= date_trunc('day', now());
  IF v_today + p_amount > 10000 THEN RAISE EXCEPTION 'Daily withdrawal limit is $10,000 per account'; END IF;
  v_balance := public.bix_wallet_balance(auth.uid());
  IF v_balance < p_amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;
  v_status := public.bix_leader_status(auth.uid());
  IF NOT (v_status ->> 'qualified')::boolean THEN
    v_locked := (v_status ->> 'virtual_usd')::numeric + (v_status ->> 'escrow_usd')::numeric;
    IF p_amount > v_balance - v_locked THEN
      RAISE EXCEPTION 'Escrow locked: bonuses and support balance unlock after team turnover reaches %x (% / %)', v_status ->> 'multiple', v_status ->> 'turnover', v_status ->> 'target';
    END IF;
  END IF;
  v_fee := round(1 + p_amount * 0.005, 2);
  INSERT INTO public.wallet_transactions(user_id,type,amount_usd,fee_usd,net_usd,address)
  VALUES (auth.uid(),'withdraw',p_amount,v_fee,p_amount - v_fee,trim(p_address)) RETURNING id INTO v_id;
  RETURN v_id;
END $function$;