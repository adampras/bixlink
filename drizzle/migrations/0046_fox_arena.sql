ALTER TABLE public.bix_vbix_ledger DROP CONSTRAINT bix_vbix_ledger_kind_check;
ALTER TABLE public.bix_vbix_ledger ADD CONSTRAINT bix_vbix_ledger_kind_check CHECK (kind = ANY (ARRAY['mining','network','quest']));

CREATE TABLE public.bix_quest_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  quest_key text NOT NULL,
  period_key text NOT NULL,
  amount_vbix numeric NOT NULL CHECK (amount_vbix >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, quest_key, period_key)
);
GRANT SELECT ON public.bix_quest_claims TO authenticated;
GRANT ALL ON public.bix_quest_claims TO service_role;
ALTER TABLE public.bix_quest_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin read quest claims" ON public.bix_quest_claims FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_bix_admin());

CREATE TABLE public.bix_season_prizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season text NOT NULL,
  rank integer NOT NULL,
  user_id uuid NOT NULL,
  points numeric NOT NULL,
  amount_bix numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid,
  UNIQUE (season, user_id)
);
GRANT SELECT ON public.bix_season_prizes TO authenticated;
GRANT ALL ON public.bix_season_prizes TO service_role;
ALTER TABLE public.bix_season_prizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin read season prizes" ON public.bix_season_prizes FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_bix_admin());

CREATE OR REPLACE FUNCTION public.bix_arena_config() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'enabled', false, 'leaderboard', true,
    'rewards', jsonb_build_object('checkin', 0.5, 'quiz', 1, 'streak', 3, 'referral', 5, 'stake7', 2),
    'missions', jsonb_build_object('checkin', true, 'quiz', true, 'streak', true, 'referral', true, 'stake7', true),
    'quiz', '[{"q":"What is the fixed total supply of BIX?","options":["1,000,000","21,000,000","100,000,000"],"answer":1}]'::jsonb,
    'prizes', '[50,30,20,10,10,5,5,5,5,5]'::jsonb
  ) || COALESCE((SELECT value FROM public.app_settings WHERE key = 'bix_arena'), '{}'::jsonb)
$$;

CREATE OR REPLACE FUNCTION public.bix_arena_streak(p_user uuid) RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE d date := (now() AT TIME ZONE 'UTC')::date; n int := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.bix_quest_claims WHERE user_id = p_user AND quest_key = 'checkin' AND period_key = d::text) THEN d := d - 1; END IF;
  WHILE EXISTS (SELECT 1 FROM public.bix_quest_claims WHERE user_id = p_user AND quest_key = 'checkin' AND period_key = d::text) LOOP n := n + 1; d := d - 1; END LOOP;
  RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.bix_quest_status() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_cfg jsonb := public.bix_arena_config(); v_day text := ((now() AT TIME ZONE 'UTC')::date)::text; v_week text := to_char(now() AT TIME ZONE 'UTC', 'IYYY-"W"IW'); v_quiz jsonb; v_idx int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  v_idx := CASE WHEN jsonb_array_length(v_cfg->'quiz') > 0 THEN (EXTRACT(DOY FROM now())::int % jsonb_array_length(v_cfg->'quiz')) ELSE NULL END;
  v_quiz := CASE WHEN v_idx IS NULL THEN NULL ELSE (v_cfg->'quiz'->v_idx) - 'answer' END;
  RETURN jsonb_build_object(
    'enabled', (v_cfg->>'enabled')::boolean, 'leaderboard', (v_cfg->>'leaderboard')::boolean,
    'rewards', v_cfg->'rewards', 'missions', v_cfg->'missions', 'quiz', v_quiz,
    'day', v_day, 'week', v_week, 'streak', public.bix_arena_streak(v_uid),
    'claimed', COALESCE((SELECT jsonb_agg(quest_key) FROM public.bix_quest_claims WHERE user_id = v_uid AND period_key IN (v_day, v_week, 'streak-' || v_day)), '[]'::jsonb),
    'questVbix', COALESCE((SELECT SUM(amount_vbix) FROM public.bix_vbix_ledger WHERE user_id = v_uid AND kind = 'quest'), 0),
    'totalVbix', COALESCE((SELECT SUM(amount_vbix) FROM public.bix_vbix_ledger WHERE user_id = v_uid), 0),
    'monthPoints', COALESCE((SELECT SUM(amount_vbix) FROM public.bix_quest_claims WHERE user_id = v_uid AND created_at >= date_trunc('month', now())), 0),
    'hasStake', EXISTS (SELECT 1 FROM public.stakes WHERE user_id = v_uid AND status = 'active'),
    'mining', EXISTS (SELECT 1 FROM public.bix_mining_accounts WHERE user_id = v_uid),
    'cap', 100);
END $$;

CREATE OR REPLACE FUNCTION public.bix_quest_claim(p_key text, p_answer integer DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_cfg jsonb := public.bix_arena_config(); v_day date := (now() AT TIME ZONE 'UTC')::date; v_period text; v_reward numeric; v_total numeric; v_pool numeric; v_idx int; v_amount numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF NOT COALESCE((v_cfg->>'enabled')::boolean, false) THEN RAISE EXCEPTION 'Fox Arena is closed'; END IF;
  IF p_key NOT IN ('checkin','quiz','streak','referral','stake7') THEN RAISE EXCEPTION 'Unknown mission'; END IF;
  IF NOT COALESCE((v_cfg->'missions'->>p_key)::boolean, false) THEN RAISE EXCEPTION 'Mission is off'; END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_uid AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Verify your email first'; END IF;
  v_period := CASE p_key WHEN 'checkin' THEN v_day::text WHEN 'quiz' THEN v_day::text WHEN 'streak' THEN 'streak-' || v_day::text ELSE to_char(now() AT TIME ZONE 'UTC', 'IYYY-"W"IW') END;
  IF p_key = 'quiz' THEN
    IF jsonb_array_length(v_cfg->'quiz') = 0 THEN RAISE EXCEPTION 'No quiz today'; END IF;
    v_idx := EXTRACT(DOY FROM now())::int % jsonb_array_length(v_cfg->'quiz');
    IF p_answer IS NULL OR p_answer <> (v_cfg->'quiz'->v_idx->>'answer')::int THEN RAISE EXCEPTION 'Wrong answer — try again tomorrow'; END IF;
  ELSIF p_key = 'streak' THEN
    IF public.bix_arena_streak(v_uid) < 7 OR public.bix_arena_streak(v_uid) % 7 <> 0 THEN RAISE EXCEPTION 'Reach a 7-day check-in streak first'; END IF;
  ELSIF p_key = 'referral' THEN
    IF NOT EXISTS (SELECT 1 FROM public.referral_codes r JOIN auth.users u ON u.id = r.user_id WHERE r.referred_by = v_uid AND u.email_confirmed_at IS NOT NULL AND r.created_at >= date_trunc('week', now())) THEN RAISE EXCEPTION 'Invite a member who verifies their email this week'; END IF;
  ELSIF p_key = 'stake7' THEN
    IF NOT EXISTS (SELECT 1 FROM public.stakes WHERE user_id = v_uid AND status = 'active' AND COALESCE(activated_at, created_at) <= now() - interval '7 days') THEN RAISE EXCEPTION 'Keep a stake active for 7 days first'; END IF;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('bix_vbix_pool'));
  IF EXISTS (SELECT 1 FROM public.bix_quest_claims WHERE user_id = v_uid AND quest_key = p_key AND period_key = v_period) THEN RAISE EXCEPTION 'Already claimed'; END IF;
  v_reward := GREATEST(COALESCE((v_cfg->'rewards'->>p_key)::numeric, 0), 0);
  SELECT COALESCE(SUM(amount_vbix), 0) INTO v_total FROM public.bix_vbix_ledger WHERE user_id = v_uid;
  SELECT COALESCE(SUM(amount_vbix), 0) INTO v_pool FROM public.bix_vbix_ledger;
  v_amount := round(LEAST(v_reward, GREATEST(100 - v_total, 0), GREATEST(1000000 - v_pool, 0)), 6);
  INSERT INTO public.bix_quest_claims(user_id, quest_key, period_key, amount_vbix) VALUES (v_uid, p_key, v_period, v_amount);
  IF v_amount > 0 THEN INSERT INTO public.bix_vbix_ledger(user_id, source_user, kind, level, amount_vbix) VALUES (v_uid, v_uid, 'quest', 0, v_amount); END IF;
  RETURN jsonb_build_object('amount', v_amount, 'capped', v_amount < v_reward);
END $$;

CREATE OR REPLACE FUNCTION public.bix_leaderboard(p_season text DEFAULT NULL) RETURNS TABLE(rank bigint, member text, points numeric, is_me boolean) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH s AS (SELECT COALESCE(to_date(p_season || '-01', 'YYYY-MM-DD'), date_trunc('month', now())::date) AS start)
  SELECT row_number() OVER (ORDER BY SUM(c.amount_vbix) DESC, MIN(c.created_at)), 'BIX-' || upper(left(COALESCE(rc.code, c.user_id::text), 3)) || '…', SUM(c.amount_vbix), c.user_id = auth.uid()
  FROM public.bix_quest_claims c CROSS JOIN s LEFT JOIN public.referral_codes rc ON rc.user_id = c.user_id
  WHERE auth.uid() IS NOT NULL AND c.created_at >= s.start AND c.created_at < s.start + interval '1 month'
    AND NOT EXISTS (SELECT 1 FROM public.bix_clone_accounts x WHERE x.user_id = c.user_id)
  GROUP BY c.user_id, rc.code ORDER BY 3 DESC LIMIT 20
$$;

CREATE OR REPLACE FUNCTION public.bix_arena_save(p_config jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_bix_admin() THEN RAISE EXCEPTION 'Owner access required'; END IF;
  INSERT INTO public.app_settings(key, value) VALUES ('bix_arena', p_config) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
END $$;

CREATE OR REPLACE FUNCTION public.bix_season_close(p_season text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_prizes jsonb := public.bix_arena_config()->'prizes'; v_start date := to_date(p_season || '-01', 'YYYY-MM-DD'); n int;
BEGIN
  IF NOT public.is_bix_admin() THEN RAISE EXCEPTION 'Owner access required'; END IF;
  INSERT INTO public.bix_season_prizes(season, rank, user_id, points, amount_bix)
  SELECT p_season, r, user_id, pts, COALESCE((v_prizes->>(r - 1)::int)::numeric, 0) FROM (
    SELECT c.user_id, SUM(c.amount_vbix) pts, row_number() OVER (ORDER BY SUM(c.amount_vbix) DESC, MIN(c.created_at)) r
    FROM public.bix_quest_claims c WHERE c.created_at >= v_start AND c.created_at < v_start + interval '1 month'
      AND NOT EXISTS (SELECT 1 FROM public.bix_clone_accounts x WHERE x.user_id = c.user_id)
    GROUP BY c.user_id) t WHERE r <= 10
  ON CONFLICT (season, user_id) DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT; RETURN n;
END $$;

CREATE OR REPLACE FUNCTION public.bix_review_season_prize(p_id uuid, p_approve boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_bix_admin() THEN RAISE EXCEPTION 'Owner access required'; END IF;
  UPDATE public.bix_season_prizes SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END, reviewed_at = now(), reviewed_by = auth.uid() WHERE id = p_id AND status = 'pending';
END $$;

REVOKE ALL ON FUNCTION public.bix_quest_status(), public.bix_quest_claim(text, integer), public.bix_leaderboard(text), public.bix_arena_save(jsonb), public.bix_season_close(text), public.bix_review_season_prize(uuid, boolean), public.bix_arena_config(), public.bix_arena_streak(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_quest_status(), public.bix_quest_claim(text, integer), public.bix_leaderboard(text), public.bix_arena_save(jsonb), public.bix_season_close(text), public.bix_review_season_prize(uuid, boolean), public.bix_arena_config() TO authenticated;