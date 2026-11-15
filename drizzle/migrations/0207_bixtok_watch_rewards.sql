CREATE TABLE public.bixtok_watch_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid NOT NULL,
  promo boolean NOT NULL DEFAULT false,
  amount_vbix numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, video_id)
);
GRANT SELECT ON public.bixtok_watch_rewards TO authenticated;
GRANT ALL ON public.bixtok_watch_rewards TO service_role;
ALTER TABLE public.bixtok_watch_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own watch rewards" ON public.bixtok_watch_rewards FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE INDEX bixtok_watch_rewards_user_day ON public.bixtok_watch_rewards(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.bixtok_watch_status() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_cfg jsonb; v_stake numeric; v_today int; v_total numeric;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('enabled', false); END IF;
  SELECT to_jsonb(c) INTO v_cfg FROM public.bixtok_config c WHERE id = 1;
  SELECT COALESCE(SUM(amount_usd), 0) INTO v_stake FROM public.stakes WHERE user_id = v_uid AND status = 'active';
  SELECT count(*), COALESCE(SUM(amount_vbix), 0) INTO v_today, v_total FROM public.bixtok_watch_rewards WHERE user_id = v_uid AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  RETURN jsonb_build_object('enabled', COALESCE((v_cfg->'features'->>'watch_rewards')::boolean, false), 'today', v_today, 'today_vbix', v_total, 'limit', CASE WHEN v_stake >= 100 THEN 50 ELSE 10 END, 'min_seconds', 15, 'normal', 0.10, 'promo', 0.25);
END $$;

CREATE OR REPLACE FUNCTION public.bixtok_watch_claim(p_video uuid, p_seconds integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_cfg jsonb; v_vid record; v_stake numeric; v_limit int; v_today int; v_last timestamptz; v_promo boolean; v_reward numeric; v_cap numeric; v_total numeric; v_amount numeric;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT to_jsonb(c) INTO v_cfg FROM public.bixtok_config c WHERE id = 1;
  IF NOT COALESCE((v_cfg->'features'->>'watch_rewards')::boolean, false) THEN RAISE EXCEPTION 'Watch rewards are off'; END IF;
  IF COALESCE(p_seconds, 0) < 15 THEN RAISE EXCEPTION 'Watch at least 15 seconds'; END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_uid AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Verify your email first'; END IF;
  IF EXISTS (SELECT 1 FROM public.bix_clone_accounts WHERE user_id = v_uid) THEN RAISE EXCEPTION 'Not available for this account'; END IF;
  SELECT id, creator_id, caption INTO v_vid FROM public.bixtok_videos WHERE id = p_video AND enabled = true;
  IF v_vid.id IS NULL THEN RAISE EXCEPTION 'Video not found'; END IF;
  IF v_vid.creator_id = v_uid THEN RAISE EXCEPTION 'Own videos are not rewarded'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('bix_vbix_pool'));
  IF EXISTS (SELECT 1 FROM public.bixtok_watch_rewards WHERE user_id = v_uid AND video_id = p_video) THEN RAISE EXCEPTION 'Already rewarded'; END IF;
  SELECT COALESCE(SUM(amount_usd), 0) INTO v_stake FROM public.stakes WHERE user_id = v_uid AND status = 'active';
  v_limit := CASE WHEN v_stake >= 100 THEN 50 ELSE 10 END;
  SELECT count(*), max(created_at) INTO v_today, v_last FROM public.bixtok_watch_rewards WHERE user_id = v_uid AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  IF v_today >= v_limit THEN RAISE EXCEPTION 'Daily limit reached'; END IF;
  IF v_last IS NOT NULL AND v_last > now() - interval '15 seconds' THEN RAISE EXCEPTION 'Too fast — keep watching'; END IF;
  v_promo := COALESCE(v_vid.caption, '') ~* '(presale|bixgo|bix ?call|bixcare|bixtok|bixlink|bixmall|bix ?pay)';
  v_reward := CASE WHEN v_promo THEN 0.25 ELSE 0.10 END;
  v_cfg := public.bix_arena_config();
  v_cap := GREATEST(COALESCE((v_cfg->>'cap')::numeric, 0), 0);
  SELECT COALESCE(SUM(amount_vbix), 0) INTO v_total FROM public.bix_vbix_ledger WHERE user_id = v_uid AND kind = 'quest';
  v_amount := CASE WHEN v_cap > 0 THEN round(LEAST(v_reward, GREATEST(v_cap - v_total, 0)), 6) ELSE v_reward END;
  INSERT INTO public.bixtok_watch_rewards(user_id, video_id, promo, amount_vbix) VALUES (v_uid, p_video, v_promo, v_amount);
  IF v_amount > 0 THEN INSERT INTO public.bix_vbix_ledger(user_id, source_user, kind, level, amount_vbix) VALUES (v_uid, v_uid, 'quest', 0, v_amount); END IF;
  RETURN jsonb_build_object('amount', v_amount, 'promo', v_promo, 'today', v_today + 1, 'limit', v_limit, 'capped', v_amount < v_reward);
END $$;
REVOKE ALL ON FUNCTION public.bixtok_watch_claim(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.bixtok_watch_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bixtok_watch_claim(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bixtok_watch_status() TO authenticated;