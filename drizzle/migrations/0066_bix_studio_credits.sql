CREATE TABLE public.bix_studio_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT false,
  members_enabled boolean NOT NULL DEFAULT false,
  prices jsonb NOT NULL DEFAULT '{"banner":10,"poster":30,"presentation":40,"video":80}'::jsonb,
  costs jsonb NOT NULL DEFAULT '{"banner":2,"poster":10,"presentation":15,"video":40}'::jsonb,
  features jsonb NOT NULL DEFAULT '{"banner":true,"poster":true,"presentation":true,"video":false}'::jsonb,
  daily_limit integer NOT NULL DEFAULT 20,
  credit_usd numeric NOT NULL DEFAULT 0.05,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.bix_studio_config TO service_role;
ALTER TABLE public.bix_studio_config ENABLE ROW LEVEL SECURITY;
INSERT INTO public.bix_studio_config (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE public.bix_studio_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('grant','spend','refund')),
  feature text,
  credits integer NOT NULL,
  paid_usd numeric NOT NULL DEFAULT 0,
  cost_credits integer NOT NULL DEFAULT 0,
  note text,
  ref_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX bix_studio_ledger_one_refund ON public.bix_studio_ledger(ref_id) WHERE kind = 'refund';
CREATE INDEX bix_studio_ledger_user ON public.bix_studio_ledger(user_id, created_at DESC);
GRANT SELECT ON public.bix_studio_ledger TO authenticated;
GRANT ALL ON public.bix_studio_ledger TO service_role;
ALTER TABLE public.bix_studio_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own studio ledger" ON public.bix_studio_ledger FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_bix_admin());

CREATE OR REPLACE FUNCTION public.bix_studio_status() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.bix_studio_config; bal integer; used integer; adm boolean := public.is_bix_admin();
BEGIN
  SELECT * INTO c FROM public.bix_studio_config WHERE id = 1;
  SELECT COALESCE(SUM(credits),0) INTO bal FROM public.bix_studio_ledger WHERE user_id = auth.uid();
  SELECT COUNT(*) INTO used FROM public.bix_studio_ledger WHERE user_id = auth.uid() AND kind = 'spend' AND created_at >= date_trunc('day', now());
  RETURN jsonb_build_object('enabled', c.enabled, 'members_enabled', c.members_enabled, 'prices', c.prices, 'features', c.features,
    'daily_limit', c.daily_limit, 'credit_usd', c.credit_usd, 'balance', bal, 'used_today', used, 'is_owner', adm,
    'open', adm OR (c.enabled AND c.members_enabled));
END $$;

CREATE OR REPLACE FUNCTION public.bix_studio_spend(p_feature text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.bix_studio_config; bal integer; used integer; price integer; cost integer; rid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF public.is_bix_admin() THEN RETURN jsonb_build_object('charged', 0, 'owner', true); END IF;
  SELECT * INTO c FROM public.bix_studio_config WHERE id = 1 FOR UPDATE;
  IF NOT (c.enabled AND c.members_enabled) THEN RAISE EXCEPTION 'BIX Studio is closed'; END IF;
  IF COALESCE((c.features->>p_feature)::boolean, false) IS NOT TRUE THEN RAISE EXCEPTION 'This feature is closed'; END IF;
  price := COALESCE((c.prices->>p_feature)::integer, 0);
  cost := COALESCE((c.costs->>p_feature)::integer, 0);
  SELECT COUNT(*) INTO used FROM public.bix_studio_ledger WHERE user_id = auth.uid() AND kind = 'spend' AND created_at >= date_trunc('day', now());
  IF used >= c.daily_limit THEN RAISE EXCEPTION 'Daily limit reached'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text));
  SELECT COALESCE(SUM(credits),0) INTO bal FROM public.bix_studio_ledger WHERE user_id = auth.uid();
  IF bal < price THEN RAISE EXCEPTION 'Not enough Studio Credit'; END IF;
  INSERT INTO public.bix_studio_ledger(user_id, kind, feature, credits, cost_credits, created_by)
    VALUES (auth.uid(), 'spend', p_feature, -price, cost, auth.uid()) RETURNING id INTO rid;
  RETURN jsonb_build_object('charged', price, 'id', rid, 'balance', bal - price);
END $$;

CREATE OR REPLACE FUNCTION public.bix_studio_grant(p_code text, p_credits integer, p_paid_usd numeric, p_note text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u uuid; rid uuid;
BEGIN
  IF NOT public.is_bix_admin() THEN RAISE EXCEPTION 'Owner access required'; END IF;
  IF p_credits IS NULL OR p_credits <= 0 OR p_credits > 1000000 THEN RAISE EXCEPTION 'Invalid credit amount'; END IF;
  SELECT user_id INTO u FROM public.referral_codes WHERE upper(code) = upper(trim(p_code));
  IF u IS NULL THEN RAISE EXCEPTION 'Member code not found'; END IF;
  INSERT INTO public.bix_studio_ledger(user_id, kind, credits, paid_usd, note, created_by)
    VALUES (u, 'grant', p_credits, GREATEST(COALESCE(p_paid_usd,0),0), left(p_note, 200), auth.uid()) RETURNING id INTO rid;
  RETURN rid;
END $$;

CREATE OR REPLACE FUNCTION public.bix_studio_refund(p_entry uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e public.bix_studio_ledger;
BEGIN
  IF NOT public.is_bix_admin() THEN RAISE EXCEPTION 'Owner access required'; END IF;
  SELECT * INTO e FROM public.bix_studio_ledger WHERE id = p_entry AND kind = 'spend';
  IF e.id IS NULL THEN RAISE EXCEPTION 'Usage not found'; END IF;
  INSERT INTO public.bix_studio_ledger(user_id, kind, feature, credits, cost_credits, ref_id, note, created_by)
    VALUES (e.user_id, 'refund', e.feature, -e.credits, -e.cost_credits, e.id, 'Refund', auth.uid());
END $$;

CREATE OR REPLACE FUNCTION public.bix_studio_save(p jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_bix_admin() THEN RAISE EXCEPTION 'Owner access required'; END IF;
  UPDATE public.bix_studio_config SET
    enabled = COALESCE((p->>'enabled')::boolean, enabled),
    members_enabled = COALESCE((p->>'members_enabled')::boolean, members_enabled),
    prices = COALESCE(p->'prices', prices), costs = COALESCE(p->'costs', costs), features = COALESCE(p->'features', features),
    daily_limit = GREATEST(COALESCE((p->>'daily_limit')::integer, daily_limit), 0),
    credit_usd = GREATEST(COALESCE((p->>'credit_usd')::numeric, credit_usd), 0), updated_at = now()
  WHERE id = 1;
END $$;

CREATE OR REPLACE FUNCTION public.bix_studio_report() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb; c public.bix_studio_config;
BEGIN
  IF NOT public.is_bix_admin() THEN RAISE EXCEPTION 'Owner access required'; END IF;
  SELECT * INTO c FROM public.bix_studio_config WHERE id = 1;
  SELECT jsonb_build_object(
    'config', to_jsonb(c),
    'sold_credits', COALESCE(SUM(credits) FILTER (WHERE kind='grant'),0),
    'paid_usd', COALESCE(SUM(paid_usd) FILTER (WHERE kind='grant'),0),
    'used_credits', COALESCE(-SUM(credits) FILTER (WHERE kind IN ('spend','refund')),0),
    'cost_credits', COALESCE(SUM(cost_credits) FILTER (WHERE kind IN ('spend','refund')),0),
    'recent', COALESCE((SELECT jsonb_agg(x) FROM (SELECT l.id, l.kind, l.feature, l.credits, l.paid_usd, l.created_at, rc.code,
        EXISTS(SELECT 1 FROM public.bix_studio_ledger f WHERE f.ref_id = l.id) AS refunded
      FROM public.bix_studio_ledger l LEFT JOIN public.referral_codes rc ON rc.user_id = l.user_id ORDER BY l.created_at DESC LIMIT 30) x), '[]'::jsonb)
  ) INTO r FROM public.bix_studio_ledger;
  RETURN r;
END $$;

REVOKE ALL ON FUNCTION public.bix_studio_status(), public.bix_studio_spend(text), public.bix_studio_grant(text,integer,numeric,text), public.bix_studio_refund(uuid), public.bix_studio_save(jsonb), public.bix_studio_report() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_studio_status(), public.bix_studio_spend(text), public.bix_studio_grant(text,integer,numeric,text), public.bix_studio_refund(uuid), public.bix_studio_save(jsonb), public.bix_studio_report() TO authenticated;