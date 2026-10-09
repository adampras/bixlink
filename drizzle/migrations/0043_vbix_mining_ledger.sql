CREATE TABLE public.bix_mining_accounts (
  user_id uuid PRIMARY KEY,
  started_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bix_mining_accounts TO authenticated;
GRANT ALL ON public.bix_mining_accounts TO service_role;
ALTER TABLE public.bix_mining_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own mining account" ON public.bix_mining_accounts FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_bix_admin());

CREATE TABLE public.bix_vbix_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_user uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('mining','network')),
  level integer NOT NULL DEFAULT 0,
  amount_vbix numeric NOT NULL CHECK (amount_vbix > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bix_vbix_ledger_user_idx ON public.bix_vbix_ledger(user_id, created_at);
GRANT SELECT ON public.bix_vbix_ledger TO authenticated;
GRANT ALL ON public.bix_vbix_ledger TO service_role;
ALTER TABLE public.bix_vbix_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own vbix ledger" ON public.bix_vbix_ledger FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_bix_admin());

CREATE OR REPLACE FUNCTION public.bix_mining_rate(p_user uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $f$
  SELECT COALESCE((s.value->>'ratePerDay')::numeric, 1)
    * CASE WHEN EXISTS (SELECT 1 FROM public.stakes WHERE user_id = p_user AND status = 'active')
           THEN 1 + COALESCE((s.value->>'stakeBoostPct')::numeric, 0) / 100 ELSE 1 END
  FROM (SELECT (SELECT value FROM public.app_settings WHERE key = 'mining') AS value) s
$f$;

CREATE OR REPLACE FUNCTION public.bix_mining_settle()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $f$
DECLARE v_uid uuid := auth.uid(); v_acc record; v_enabled boolean; v_amount numeric; v_levels jsonb; v_parent uuid; v_child uuid; v_pct numeric; i int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT * INTO v_acc FROM public.bix_mining_accounts WHERE user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN RETURN public.bix_mining_status(); END IF;
  SELECT COALESCE((value->>'enabled')::boolean, false) INTO v_enabled FROM public.app_settings WHERE key = 'mining';
  v_amount := round(EXTRACT(EPOCH FROM (now() - v_acc.settled_at)) / 86400 * public.bix_mining_rate(v_uid), 6);
  UPDATE public.bix_mining_accounts SET settled_at = now() WHERE user_id = v_uid;
  IF COALESCE(v_enabled, false) AND v_amount > 0 THEN
    INSERT INTO public.bix_vbix_ledger(user_id, source_user, kind, level, amount_vbix) VALUES (v_uid, v_uid, 'mining', 0, v_amount);
    SELECT COALESCE(value->'levels', '[12,6,3,2,1]'::jsonb) INTO v_levels FROM public.app_settings WHERE key = 'referrals';
    v_levels := COALESCE(v_levels, '[12,6,3,2,1]'::jsonb);
    v_child := v_uid;
    FOR i IN 0 .. jsonb_array_length(v_levels) - 1 LOOP
      SELECT referred_by INTO v_parent FROM public.referral_codes WHERE user_id = v_child;
      EXIT WHEN v_parent IS NULL OR v_parent = v_uid;
      v_pct := COALESCE((v_levels->>i)::numeric, 0);
      IF v_pct > 0 AND round(v_amount * v_pct / 100, 6) > 0 THEN
        INSERT INTO public.bix_vbix_ledger(user_id, source_user, kind, level, amount_vbix) VALUES (v_parent, v_uid, 'network', i + 1, round(v_amount * v_pct / 100, 6));
      END IF;
      v_child := v_parent;
    END LOOP;
  END IF;
  RETURN public.bix_mining_status();
END $f$;

CREATE OR REPLACE FUNCTION public.bix_mining_status()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $f$
  SELECT jsonb_build_object(
    'started', a.user_id IS NOT NULL,
    'settledAt', a.settled_at,
    'serverNow', now(),
    'enabled', COALESCE((SELECT (value->>'enabled')::boolean FROM public.app_settings WHERE key = 'mining'), false),
    'ratePerDay', public.bix_mining_rate(auth.uid()),
    'boosted', EXISTS (SELECT 1 FROM public.stakes WHERE user_id = auth.uid() AND status = 'active'),
    'miningVbix', COALESCE((SELECT SUM(amount_vbix) FROM public.bix_vbix_ledger WHERE user_id = auth.uid() AND kind = 'mining'), 0),
    'networkVbix', COALESCE((SELECT SUM(amount_vbix) FROM public.bix_vbix_ledger WHERE user_id = auth.uid() AND kind = 'network'), 0))
  FROM (SELECT 1) x LEFT JOIN public.bix_mining_accounts a ON a.user_id = auth.uid()
$f$;

CREATE OR REPLACE FUNCTION public.bix_mining_start()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $f$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Verifikasi email diperlukan'; END IF;
  IF EXISTS (SELECT 1 FROM public.bix_clone_accounts WHERE user_id = auth.uid()) THEN RAISE EXCEPTION 'Not available for this account'; END IF;
  IF NOT COALESCE((SELECT (value->>'enabled')::boolean FROM public.app_settings WHERE key = 'mining'), false) THEN RAISE EXCEPTION 'Mining sedang dinonaktifkan'; END IF;
  INSERT INTO public.bix_mining_accounts(user_id) VALUES (auth.uid()) ON CONFLICT (user_id) DO NOTHING;
  RETURN public.bix_mining_status();
END $f$;

REVOKE ALL ON FUNCTION public.bix_mining_start(), public.bix_mining_settle(), public.bix_mining_status(), public.bix_mining_rate(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_mining_start(), public.bix_mining_settle(), public.bix_mining_status(), public.bix_mining_rate(uuid) TO authenticated;