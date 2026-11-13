ALTER TABLE public.bix_presale_orders DROP CONSTRAINT bix_presale_orders_status_check;
ALTER TABLE public.bix_presale_orders ADD CONSTRAINT bix_presale_orders_status_check CHECK (status = ANY (ARRAY['locked','reversed','test']));

-- Designated IDs (design whitelist) and their downline deposit to Owner 1 wallets; referral tree untouched.
CREATE OR REPLACE FUNCTION public.bix_deposit_owner(p_user uuid)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE cur uuid := p_user; nxt uuid; seen uuid[] := ARRAY[]::uuid[]; i int := 0;
BEGIN
  LOOP
    IF EXISTS (SELECT 1 FROM public.bix_deposit_owner1_lock WHERE user_id = cur) THEN RETURN NULL; END IF;
    IF EXISTS (SELECT 1 FROM public.bix_design_whitelist WHERE user_id = cur) THEN RETURN NULL; END IF;
    SELECT referred_by INTO nxt FROM public.referral_codes WHERE user_id = cur;
    IF nxt IS NOT NULL AND public.bix_quota_overflow(nxt, cur) THEN RETURN NULL; END IF;
    cur := nxt;
    i := i + 1;
    EXIT WHEN cur IS NULL OR cur = ANY(seen) OR i > 60;
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = cur AND role = 'reviewer') THEN RETURN cur; END IF;
    seen := seen || cur;
  END LOOP;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.bix_deposit_owner(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bix_presale_test_state() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'enabled', COALESCE((SELECT (value->>'enabled')::boolean FROM public.app_settings WHERE key='presale_test'), false),
    'allowed', auth.uid() IS NOT NULL AND (public.bix_is_owner1() OR EXISTS(SELECT 1 FROM public.bix_design_whitelist WHERE user_id = auth.uid())));
$$;
GRANT EXECUTE ON FUNCTION public.bix_presale_test_state() TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_presale_test_set(p_on boolean) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 access required'; END IF;
  INSERT INTO public.app_settings(key, value) VALUES ('presale_test', jsonb_build_object('enabled', p_on))
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
  RETURN public.bix_presale_test_state();
END $$;
REVOKE ALL ON FUNCTION public.bix_presale_test_set(boolean) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION public.bix_presale_test_set(boolean) TO authenticated;

-- Virtual test purchase: status 'test' never counts in pool, balances, vesting claims or bonuses.
CREATE OR REPLACE FUNCTION public.bix_presale_test_buy(p_usd numeric) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s jsonb := public.bix_presale_test_state(); v_cfg jsonb := public.bix_presale_config(); v_price numeric; v_bix numeric; v_id uuid;
BEGIN
  IF NOT (s->>'allowed')::boolean THEN RAISE EXCEPTION 'Virtual test is limited to Owner 1 and designated IDs'; END IF;
  IF NOT (s->>'enabled')::boolean THEN RAISE EXCEPTION 'Virtual test mode is off'; END IF;
  IF p_usd IS NULL OR p_usd < 100 OR p_usd > 1000 THEN RAISE EXCEPTION 'Amount must be between 100 and 1000'; END IF;
  v_price := COALESCE(NULLIF(v_cfg->'stages'->COALESCE((v_cfg->>'activeStage')::int,0)->>'price','')::numeric, 0.25);
  v_bix := round(p_usd / v_price, 2);
  INSERT INTO public.bix_presale_orders (user_id, package_usd, bix_amount, release_days, sponsor_bix, strategy, status)
  VALUES (auth.uid(), p_usd, v_bix, COALESCE((v_cfg->>'vestingDays')::int,100), 0, 'virtual_test', 'test') RETURNING id INTO v_id;
  RETURN jsonb_build_object('id', v_id, 'bix', v_bix, 'test', true);
END $$;
REVOKE ALL ON FUNCTION public.bix_presale_test_buy(numeric) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION public.bix_presale_test_buy(numeric) TO authenticated;