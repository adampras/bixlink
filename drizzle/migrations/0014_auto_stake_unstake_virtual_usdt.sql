ALTER TABLE public.stakes DROP CONSTRAINT IF EXISTS stakes_status_check;
ALTER TABLE public.stakes ADD CONSTRAINT stakes_status_check CHECK (status IN ('pending','active','rejected','completed','unstaked'));
ALTER TABLE public.stakes ADD COLUMN IF NOT EXISTS funded_vusdt boolean NOT NULL DEFAULT false;
ALTER TABLE public.stakes ADD COLUMN IF NOT EXISTS unstaked_at timestamptz;
ALTER TABLE public.stakes ADD COLUMN IF NOT EXISTS penalty_pct numeric NOT NULL DEFAULT 0;
ALTER TABLE public.stakes ADD COLUMN IF NOT EXISTS refund_usd numeric NOT NULL DEFAULT 0;

INSERT INTO public.app_settings(key, value) VALUES ('unstake', '{"tiers":[{"days":30,"pct":20},{"days":60,"pct":15},{"days":90,"pct":10},{"days":180,"pct":8},{"days":360,"pct":5}]}'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.bix_vusdt_balance(p_user uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN p_user = auth.uid() OR public.is_bix_admin() THEN
    (CASE WHEN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = p_user AND role = 'admin') THEN 1000000 ELSE 0 END)
    + COALESCE((SELECT SUM(CASE WHEN recipient_id = p_user THEN amount_usd ELSE -amount_usd END)
        FROM public.vusdt_transfers WHERE sender_id = p_user OR recipient_id = p_user), 0)
    - COALESCE((SELECT SUM(amount_usd) FROM public.stakes WHERE user_id = p_user AND funded_vusdt), 0)
    + COALESCE((SELECT SUM(refund_usd) FROM public.stakes WHERE user_id = p_user AND funded_vusdt AND status = 'unstaked'), 0)
  ELSE NULL END
$$;

CREATE OR REPLACE FUNCTION public.bix_unstake_penalty(p_days numeric, p_lock integer)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE t jsonb; v_pct numeric := 0;
BEGIN
  IF p_days >= p_lock THEN RETURN 0; END IF;
  FOR t IN SELECT x FROM jsonb_array_elements(COALESCE((SELECT value->'tiers' FROM public.app_settings WHERE key='unstake'),'[]'::jsonb)) x ORDER BY (x->>'days')::numeric
  LOOP
    IF p_days < (t->>'days')::numeric THEN RETURN LEAST(GREATEST((t->>'pct')::numeric,0),100); END IF;
  END LOOP;
  RETURN v_pct;
END $$;

CREATE OR REPLACE FUNCTION public.request_bix_stake(p_package text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.packages%ROWTYPE; new_id uuid; v_bal numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT * INTO p FROM public.packages WHERE id = p_package;
  IF NOT FOUND THEN RAISE EXCEPTION 'Package unavailable'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('vusdt' || auth.uid()::text));
  v_bal := COALESCE(public.bix_vusdt_balance(auth.uid()), 0);
  IF v_bal < p.price_usd THEN RAISE EXCEPTION 'Insufficient virtual USDT balance (need %, have %)', p.price_usd, round(v_bal,2); END IF;
  INSERT INTO public.stakes (user_id, package_id, amount_usd, apy, lock_days, status, activated_at, funded_vusdt)
  VALUES (auth.uid(), p.id, p.price_usd, p.apy, p.lock_days, 'active', now(), true) RETURNING id INTO new_id;
  RETURN new_id;
END $$;

CREATE OR REPLACE FUNCTION public.bix_unstake(p_stake uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.stakes%ROWTYPE; v_days numeric; v_pct numeric; v_refund numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('vusdt' || auth.uid()::text));
  SELECT * INTO s FROM public.stakes WHERE id = p_stake AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Stake not found'; END IF;
  IF s.status NOT IN ('active','completed') THEN RAISE EXCEPTION 'This stake cannot be unstaked'; END IF;
  v_days := EXTRACT(EPOCH FROM (now() - COALESCE(s.activated_at, s.created_at))) / 86400;
  v_pct := public.bix_unstake_penalty(v_days, s.lock_days);
  v_refund := round(s.amount_usd * (1 - v_pct/100), 2);
  UPDATE public.stakes SET status='unstaked', unstaked_at=now(), penalty_pct=v_pct, refund_usd=v_refund WHERE id = s.id;
  RETURN jsonb_build_object('penalty_pct', v_pct, 'refund_usd', v_refund);
END $$;

REVOKE ALL ON FUNCTION public.bix_unstake(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bix_unstake(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.bix_unstake_penalty(numeric, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bix_unstake_penalty(numeric, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.request_bix_stake(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.request_bix_stake(text) TO authenticated;

-- Swaps are now applied automatically
CREATE OR REPLACE FUNCTION public.bix_auto_approve_swap() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.status := 'approved'; NEW.reviewed_at := now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS swap_auto_approve ON public.swap_requests;
CREATE TRIGGER swap_auto_approve BEFORE INSERT ON public.swap_requests FOR EACH ROW EXECUTE FUNCTION public.bix_auto_approve_swap();