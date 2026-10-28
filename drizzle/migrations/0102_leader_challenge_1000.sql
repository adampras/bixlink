CREATE TABLE public.bix_leader_challenge_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  challenge text NOT NULL DEFAULT 'team1000',
  verified_count integer NOT NULL,
  reward_bix numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE (user_id, challenge)
);
GRANT SELECT ON public.bix_leader_challenge_claims TO authenticated;
GRANT ALL ON public.bix_leader_challenge_claims TO service_role;
ALTER TABLE public.bix_leader_challenge_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or admin challenge read" ON public.bix_leader_challenge_claims FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_bix_admin());

-- Verified, non-clone, real-email downline across the whole team (cycle-safe)
CREATE OR REPLACE FUNCTION public.bix_challenge_verified_team(p_user uuid) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  WITH RECURSIVE tree AS (
    SELECT r.user_id, ARRAY[p_user, r.user_id] AS path, 1 AS depth FROM public.referral_codes r WHERE r.referred_by = p_user AND r.user_id <> p_user
    UNION ALL
    SELECT r.user_id, t.path || r.user_id, t.depth + 1 FROM public.referral_codes r JOIN tree t ON r.referred_by = t.user_id
    WHERE NOT r.user_id = ANY(t.path) AND t.depth < 50
  )
  SELECT count(DISTINCT t.user_id)::int FROM tree t
  WHERE public.bix_has_real_verified_email(t.user_id)
    AND NOT EXISTS (SELECT 1 FROM public.bix_clone_accounts c WHERE c.user_id = t.user_id)
$$;
REVOKE ALL ON FUNCTION public.bix_challenge_verified_team(uuid) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bix_leader_challenge_status() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v_uid uuid := auth.uid(); v_eligible boolean; v_count int := 0; c public.bix_leader_challenge_claims;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  v_eligible := EXISTS (SELECT 1 FROM public.bix_leaders WHERE user_id = v_uid AND status = 'approved')
    AND NOT EXISTS (SELECT 1 FROM public.bix_clone_accounts WHERE user_id = v_uid);
  IF v_eligible THEN v_count := public.bix_challenge_verified_team(v_uid); END IF;
  SELECT * INTO c FROM public.bix_leader_challenge_claims WHERE user_id = v_uid AND challenge = 'team1000';
  RETURN jsonb_build_object('eligible', v_eligible, 'count', v_count, 'target', 1000, 'reward', 1000,
    'selfVerified', public.bix_has_real_verified_email(v_uid),
    'claim', CASE WHEN c.id IS NULL THEN NULL ELSE jsonb_build_object('status', c.status, 'createdAt', c.created_at, 'note', c.note) END);
END $$;
GRANT EXECUTE ON FUNCTION public.bix_leader_challenge_status() TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_leader_challenge_claim() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_uid uuid := auth.uid(); v_count int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.bix_leaders WHERE user_id = v_uid AND status = 'approved') THEN RAISE EXCEPTION 'Challenge is only for sponsored leader and loan accounts'; END IF;
  IF EXISTS (SELECT 1 FROM public.bix_clone_accounts WHERE user_id = v_uid) THEN RAISE EXCEPTION 'Not eligible'; END IF;
  IF NOT public.bix_has_real_verified_email(v_uid) THEN RAISE EXCEPTION 'Verify your email before claiming'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('challenge:' || v_uid::text));
  IF EXISTS (SELECT 1 FROM public.bix_leader_challenge_claims WHERE user_id = v_uid AND challenge = 'team1000') THEN RAISE EXCEPTION 'Challenge already claimed'; END IF;
  v_count := public.bix_challenge_verified_team(v_uid);
  IF v_count < 1000 THEN RAISE EXCEPTION 'Target not reached: % / 1000 verified members', v_count; END IF;
  INSERT INTO public.bix_leader_challenge_claims(user_id, verified_count, reward_bix) VALUES (v_uid, v_count, 1000);
  RETURN jsonb_build_object('status', 'pending', 'count', v_count);
END $$;
GRANT EXECUTE ON FUNCTION public.bix_leader_challenge_claim() TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_leader_challenge_list() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 only'; END IF;
  RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('id', c.id, 'email', u.email, 'count', c.verified_count, 'liveCount', public.bix_challenge_verified_team(c.user_id), 'reward', c.reward_bix, 'status', c.status, 'createdAt', c.created_at) ORDER BY c.created_at DESC)
    FROM public.bix_leader_challenge_claims c LEFT JOIN auth.users u ON u.id = c.user_id), '[]'::jsonb);
END $$;
GRANT EXECUTE ON FUNCTION public.bix_leader_challenge_list() TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_leader_challenge_review(p_id uuid, p_approve boolean, p_note text DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.bix_leader_challenge_claims; v_bal numeric;
BEGIN
  IF NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 only'; END IF;
  SELECT * INTO c FROM public.bix_leader_challenge_claims WHERE id = p_id FOR UPDATE;
  IF c.id IS NULL OR c.status <> 'pending' THEN RAISE EXCEPTION 'Claim not pending'; END IF;
  IF p_approve THEN
    SELECT balance_bix INTO v_bal FROM public.owner_bix_vault WHERE owner_id = auth.uid() FOR UPDATE;
    IF COALESCE(v_bal, 0) < c.reward_bix THEN RAISE EXCEPTION 'Owner vault balance too low'; END IF;
    UPDATE public.owner_bix_vault SET balance_bix = balance_bix - c.reward_bix, updated_at = now() WHERE owner_id = auth.uid();
    INSERT INTO public.bix_allocations(user_id, amount_bix, note, created_by) VALUES (c.user_id, c.reward_bix, 'Leader Challenge 1000 verified team', auth.uid());
  END IF;
  UPDATE public.bix_leader_challenge_claims SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END, note = left(p_note, 300), reviewed_at = now() WHERE id = p_id;
  RETURN jsonb_build_object('ok', true);
END $$;
GRANT EXECUTE ON FUNCTION public.bix_leader_challenge_review(uuid, boolean, text) TO authenticated;