CREATE OR REPLACE FUNCTION public.bix_arena_config() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'enabled', false, 'leaderboard', true, 'cap', 0,
    'rewards', jsonb_build_object('checkin', 0.5, 'quiz', 1, 'streak', 3, 'referral', 5, 'stake7', 2),
    'missions', jsonb_build_object('checkin', true, 'quiz', true, 'streak', true, 'referral', true, 'stake7', true),
    'quiz', '[{"q":"What is the fixed total supply of BIX?","options":["1,000,000","21,000,000","100,000,000"],"answer":1}]'::jsonb,
    'prizes', '[50,30,20,10,10,5,5,5,5,5]'::jsonb
  ) || COALESCE((SELECT value FROM public.app_settings WHERE key = 'bix_arena'), '{}'::jsonb)
$$;

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
    'cap', GREATEST(COALESCE((v_cfg->>'cap')::numeric, 0), 0));
END $$;

CREATE OR REPLACE FUNCTION public.bix_quest_claim(p_key text, p_answer integer DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_cfg jsonb := public.bix_arena_config(); v_day date := (now() AT TIME ZONE 'UTC')::date; v_period text; v_reward numeric; v_total numeric; v_idx int; v_amount numeric; v_cap numeric;
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
  v_cap := GREATEST(COALESCE((v_cfg->>'cap')::numeric, 0), 0);
  SELECT COALESCE(SUM(amount_vbix), 0) INTO v_total FROM public.bix_vbix_ledger WHERE user_id = v_uid AND kind = 'quest';
  v_amount := CASE WHEN v_cap > 0 THEN round(LEAST(v_reward, GREATEST(v_cap - v_total, 0)), 6) ELSE round(v_reward, 6) END;
  INSERT INTO public.bix_quest_claims(user_id, quest_key, period_key, amount_vbix) VALUES (v_uid, p_key, v_period, v_amount);
  IF v_amount > 0 THEN INSERT INTO public.bix_vbix_ledger(user_id, source_user, kind, level, amount_vbix) VALUES (v_uid, v_uid, 'quest', 0, v_amount); END IF;
  RETURN jsonb_build_object('amount', v_amount, 'capped', v_amount < v_reward);
END $$;