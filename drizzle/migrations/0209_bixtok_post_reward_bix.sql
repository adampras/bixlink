ALTER TABLE public.bixtok_config
  ADD COLUMN IF NOT EXISTS post_reward_bix numeric NOT NULL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS post_reward_promo_bix numeric NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS post_reward_daily int NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS post_reward_daily_staker int NOT NULL DEFAULT 5;

CREATE OR REPLACE FUNCTION public.bixtok_post_reward_claim()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); c public.bixtok_config; v_stake numeric; v_limit int; v_today int; v_v record; v_promo boolean; v_amt numeric; v_sum numeric := 0; v_n int := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT * INTO c FROM public.bixtok_config WHERE id = 1;
  IF NOT COALESCE((c.features->>'post_rewards')::boolean, false) THEN RETURN jsonb_build_object('amount', 0, 'off', true); END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_uid AND email_confirmed_at IS NOT NULL) THEN RETURN jsonb_build_object('amount', 0); END IF;
  IF EXISTS (SELECT 1 FROM public.bix_clone_accounts WHERE user_id = v_uid) THEN RETURN jsonb_build_object('amount', 0); END IF;
  PERFORM pg_advisory_xact_lock(hashtext('bixtok_post_reward:' || v_uid::text));
  SELECT COALESCE(SUM(amount_usd), 0) INTO v_stake FROM public.stakes WHERE user_id = v_uid AND status = 'active';
  v_limit := CASE WHEN v_stake >= 100 THEN c.post_reward_daily_staker ELSE c.post_reward_daily END;
  SELECT count(*) INTO v_today FROM public.bixtok_post_rewards WHERE user_id = v_uid AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  FOR v_v IN SELECT v.id, v.caption FROM public.bixtok_videos v
    WHERE v.creator_id = v_uid AND v.created_at > now() - interval '15 minutes'
      AND NOT EXISTS (SELECT 1 FROM public.bixtok_post_rewards r WHERE r.video_id = v.id)
      AND NOT EXISTS (SELECT 1 FROM public.bixtok_videos o WHERE o.src = v.src AND o.id <> v.id AND o.created_at < v.created_at)
    ORDER BY v.created_at LOOP
    EXIT WHEN v_today >= v_limit;
    v_promo := COALESCE(v_v.caption, '') ~* '(presale|bixgo|bix ?call|bixcare|bixtok|bixlink|bixmall|bix ?pay)';
    v_amt := round(GREATEST(CASE WHEN v_promo THEN c.post_reward_promo_bix ELSE c.post_reward_bix END, 0), 6);
    INSERT INTO public.bixtok_post_rewards(user_id, video_id, promo, amount_vbix) VALUES (v_uid, v_v.id, v_promo, v_amt);
    IF v_amt > 0 THEN INSERT INTO public.bix_allocations(user_id, amount_bix, note, created_by) VALUES (v_uid, v_amt, 'BIXTOK creator post reward', v_uid); END IF;
    v_sum := v_sum + v_amt; v_today := v_today + 1; v_n := v_n + 1;
  END LOOP;
  RETURN jsonb_build_object('amount', v_sum, 'posts', v_n, 'today', v_today, 'limit', v_limit, 'asset', 'BIX');
END $$;