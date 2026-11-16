CREATE TABLE public.bixtok_post_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid NOT NULL UNIQUE,
  promo boolean NOT NULL DEFAULT false,
  amount_vbix numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bixtok_post_rewards TO authenticated;
GRANT ALL ON public.bixtok_post_rewards TO service_role;
ALTER TABLE public.bixtok_post_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own post rewards" ON public.bixtok_post_rewards FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.bixtok_post_reward_claim() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_uid uuid := auth.uid(); v_cfg jsonb; v_stake numeric; v_limit int; v_today int; v_v record; v_promo boolean; v_reward numeric; v_cap numeric; v_total numeric; v_amt numeric; v_sum numeric := 0; v_n int := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  SELECT to_jsonb(c) INTO v_cfg FROM public.bixtok_config c WHERE id = 1;
  IF NOT COALESCE((v_cfg->'features'->>'post_rewards')::boolean, false) THEN RETURN jsonb_build_object('amount', 0, 'off', true); END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_uid AND email_confirmed_at IS NOT NULL) THEN RETURN jsonb_build_object('amount', 0); END IF;
  IF EXISTS (SELECT 1 FROM public.bix_clone_accounts WHERE user_id = v_uid) THEN RETURN jsonb_build_object('amount', 0); END IF;
  PERFORM pg_advisory_xact_lock(hashtext('bix_vbix_pool'));
  SELECT COALESCE(SUM(amount_usd), 0) INTO v_stake FROM public.stakes WHERE user_id = v_uid AND status = 'active';
  v_limit := CASE WHEN v_stake >= 100 THEN 5 ELSE 3 END;
  SELECT count(*) INTO v_today FROM public.bixtok_post_rewards WHERE user_id = v_uid AND created_at >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  v_cap := GREATEST(COALESCE((public.bix_arena_config()->>'cap')::numeric, 0), 0);
  FOR v_v IN SELECT v.id, v.caption, v.src FROM public.bixtok_videos v
    WHERE v.creator_id = v_uid AND v.created_at > now() - interval '15 minutes'
      AND NOT EXISTS (SELECT 1 FROM public.bixtok_post_rewards r WHERE r.video_id = v.id)
      AND NOT EXISTS (SELECT 1 FROM public.bixtok_videos o WHERE o.src = v.src AND o.id <> v.id AND o.created_at < v.created_at)
    ORDER BY v.created_at LOOP
    EXIT WHEN v_today >= v_limit;
    v_promo := COALESCE(v_v.caption, '') ~* '(presale|bixgo|bix ?call|bixcare|bixtok|bixlink|bixmall|bix ?pay)';
    v_reward := CASE WHEN v_promo THEN 1.00 ELSE 0.50 END;
    SELECT COALESCE(SUM(amount_vbix), 0) INTO v_total FROM public.bix_vbix_ledger WHERE user_id = v_uid AND kind = 'quest';
    v_amt := CASE WHEN v_cap > 0 THEN round(LEAST(v_reward, GREATEST(v_cap - v_total, 0)), 6) ELSE v_reward END;
    INSERT INTO public.bixtok_post_rewards(user_id, video_id, promo, amount_vbix) VALUES (v_uid, v_v.id, v_promo, v_amt);
    IF v_amt > 0 THEN INSERT INTO public.bix_vbix_ledger(user_id, source_user, kind, level, amount_vbix) VALUES (v_uid, v_uid, 'quest', 0, v_amt); END IF;
    v_sum := v_sum + v_amt; v_today := v_today + 1; v_n := v_n + 1;
  END LOOP;
  RETURN jsonb_build_object('amount', v_sum, 'posts', v_n, 'today', v_today, 'limit', v_limit);
END $$;
REVOKE ALL ON FUNCTION public.bixtok_post_reward_claim() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bixtok_post_reward_claim() TO authenticated;