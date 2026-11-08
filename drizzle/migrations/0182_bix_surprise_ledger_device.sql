ALTER TABLE public.bix_surprise_attempts ADD COLUMN IF NOT EXISTS device_id text;
CREATE INDEX IF NOT EXISTS bix_surprise_attempts_device_idx ON public.bix_surprise_attempts(round, device_id) WHERE result = 'win';

CREATE OR REPLACE FUNCTION public.bix_surprise_answer(p_attempt uuid, p_answers int[], p_device text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); c jsonb := public.bix_surprise_cfg(); v_round int := COALESCE((c->>'round')::int, 1); v_quota int := COALESCE((c->>'quota')::int, 20); v_reward numeric := GREATEST(COALESCE((c->>'reward')::numeric, 1), 0); a record; v_ok boolean; v_won int; v_owner boolean := public.bix_is_owner1(); v_dev text := left(trim(COALESCE(p_device, '')), 128);
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF NOT COALESCE((c->>'enabled')::boolean, false) THEN RAISE EXCEPTION 'Promo sedang tidak aktif'; END IF;
  IF NOT v_owner AND length(v_dev) < 16 THEN RAISE EXCEPTION 'Perangkat tidak dikenali, muat ulang halaman'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('bix_surprise'));
  SELECT * INTO a FROM public.bix_surprise_attempts WHERE id = p_attempt AND user_id = v_uid AND round = v_round FOR UPDATE;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Kuis tidak ditemukan'; END IF;
  IF a.result IS NOT NULL THEN RAISE EXCEPTION 'Anda sudah ikut ronde ini'; END IF;
  UPDATE public.bix_surprise_attempts SET device_id = v_dev WHERE id = a.id;
  IF NOT v_owner AND EXISTS (SELECT 1 FROM public.bix_surprise_attempts WHERE round = v_round AND device_id = v_dev AND result = 'win') THEN
    UPDATE public.bix_surprise_attempts SET result = 'device', answered_at = now() WHERE id = a.id;
    RETURN jsonb_build_object('result', 'device');
  END IF;
  SELECT bool_and(b.answer = p_answers[x.ord]) INTO v_ok FROM unnest(a.qids) WITH ORDINALITY x(id, ord) JOIN public.bix_surprise_bank b ON b.id = x.id;
  v_ok := COALESCE(v_ok, false) AND array_length(p_answers, 1) = array_length(a.qids, 1);
  IF NOT v_ok THEN
    UPDATE public.bix_surprise_attempts SET result = 'wrong', answered_at = now() WHERE id = a.id;
    RETURN jsonb_build_object('result', 'wrong');
  END IF;
  SELECT count(*) INTO v_won FROM public.bix_surprise_attempts WHERE round = v_round AND result = 'win';
  IF v_won >= v_quota OR EXISTS (SELECT 1 FROM public.bix_clone_accounts WHERE user_id = v_uid) OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_uid AND email_confirmed_at IS NOT NULL) THEN
    UPDATE public.bix_surprise_attempts SET result = 'late', answered_at = now() WHERE id = a.id;
    RETURN jsonb_build_object('result', 'late');
  END IF;
  UPDATE public.bix_surprise_attempts SET result = 'win', amount = v_reward, answered_at = now() WHERE id = a.id;
  IF v_reward > 0 THEN INSERT INTO public.bix_allocations(user_id, amount_bix, note, created_by) VALUES (v_uid, v_reward, 'Kuis Kejutan FREE BIX · Ronde ' || v_round, v_uid); END IF;
  RETURN jsonb_build_object('result', 'win', 'amount', v_reward);
END $$;

CREATE OR REPLACE FUNCTION public.bix_surprise_answer(p_attempt uuid, p_answers int[]) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'Muat ulang halaman untuk versi kuis terbaru'; END $$;

REVOKE ALL ON FUNCTION public.bix_surprise_answer(uuid, int[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_surprise_answer(uuid, int[], text) TO authenticated;