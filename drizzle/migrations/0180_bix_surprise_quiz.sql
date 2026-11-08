CREATE TABLE public.bix_surprise_bank (id serial PRIMARY KEY, q text NOT NULL, options jsonb NOT NULL, answer int NOT NULL);
GRANT ALL ON public.bix_surprise_bank TO service_role;
ALTER TABLE public.bix_surprise_bank ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.bix_surprise_attempts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, round int NOT NULL, qids int[] NOT NULL, result text, amount numeric NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), answered_at timestamptz, UNIQUE(round, user_id));
GRANT SELECT ON public.bix_surprise_attempts TO authenticated;
GRANT ALL ON public.bix_surprise_attempts TO service_role;
ALTER TABLE public.bix_surprise_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own attempts" ON public.bix_surprise_attempts FOR SELECT TO authenticated USING (user_id = auth.uid());

INSERT INTO public.bix_surprise_bank(q, options, answer) VALUES
('Fitur telepon & video call bebas pulsa di BIXLINK adalah?', '["BIX CALL","BIX FLY","BIX RADIO","BIX MAIL"]', 0),
('Layanan ojek, mobil, food & kirim barang BIXLINK bernama?', '["BIXCARE","BIXGO","BIXTOK","BIX GOLD"]', 1),
('Fitur live streaming & video pendek BIXLINK adalah?', '["BIXTOK","BIX CALL","BIXGO","BIX PAY"]', 0),
('Layanan bengkel, cuci, laundry & rental di BIXLINK disebut?', '["BIX GOLD","BIXTOK","BIXCARE","BIX PAY"]', 2),
('Fitur emas per gram di BIXLINK bernama?', '["BIX GOLD","BIX SILVER","BIXGO","BIX MART"]', 0),
('Fitur kirim BIX antar member secara instan adalah?', '["BIX CALL","BIX PAY","BIXTOK","BIXCARE"]', 1),
('Simbol koin utama ekosistem BIXLINK adalah?', '["BTC","ETH","BIX","USDC"]', 2),
('Maskot ikonik BIXLINK berbentuk?', '["Elang","Rubah","Singa","Naga"]', 1),
('Berapa total suplai BIXCOIN dalam tokenomics?', '["1 juta","21 juta","100 juta","1 miliar"]', 1),
('Harga presale BIX dalam blueprint adalah?', '["$0,10","$0,25","$0,50","$5"]', 2),
('Di BIXGO, driver menerima berapa persen tarif trip?', '["50%","70%","85%","100%"]', 2),
('Untuk menjaga keamanan akun, saat daftar BIXLINK wajib?', '["Verifikasi email","Kirim foto KTP ke grup","Bayar biaya admin","Tidak perlu apa-apa"]', 0),
('Jika ada kendala deposit/penarikan, sebaiknya hubungi?', '["Upline saja","Customer Service resmi / Fox AI","Orang asing di grup","Tidak perlu lapor"]', 1),
('Fitur grup edukasi & Live Class berada di?', '["BIX CALL GROUP","BIX GOLD","BIXCARE","BIX PAY"]', 0),
('Pembayaran pakai scan QR di BIXLINK lewat menu?', '["BIX PAY","BIXTOK","BIX GOLD","Arena"]', 0),
('Fitur misi & kuis harian berhadiah vBIX bernama?', '["Fox Arena","BIX Mall","BIXCARE","BIX Stay"]', 0);

CREATE OR REPLACE FUNCTION public.bix_surprise_cfg() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT value FROM public.app_settings WHERE key = 'bix_surprise'), '{}'::jsonb)
    || jsonb_build_object() $$;

CREATE OR REPLACE FUNCTION public.bix_surprise_status() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c jsonb := public.bix_surprise_cfg(); v_round int := COALESCE((c->>'round')::int, 1); v_quota int := COALESCE((c->>'quota')::int, 20); v_won int; a record;
BEGIN
  SELECT count(*) INTO v_won FROM public.bix_surprise_attempts WHERE round = v_round AND result = 'win';
  SELECT * INTO a FROM public.bix_surprise_attempts WHERE round = v_round AND user_id = auth.uid();
  RETURN jsonb_build_object('enabled', COALESCE((c->>'enabled')::boolean, false), 'quota', v_quota, 'reward', COALESCE((c->>'reward')::numeric, 1), 'round', v_round, 'winners', v_won, 'left', GREATEST(v_quota - v_won, 0), 'mine', CASE WHEN a.id IS NULL THEN NULL ELSE COALESCE(a.result, 'open') END);
END $$;

CREATE OR REPLACE FUNCTION public.bix_surprise_open() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); c jsonb := public.bix_surprise_cfg(); v_round int := COALESCE((c->>'round')::int, 1); a record; v_ids int[];
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF NOT COALESCE((c->>'enabled')::boolean, false) THEN RAISE EXCEPTION 'Promo sedang tidak aktif'; END IF;
  SELECT * INTO a FROM public.bix_surprise_attempts WHERE round = v_round AND user_id = v_uid;
  IF a.id IS NOT NULL AND a.result IS NOT NULL THEN RAISE EXCEPTION 'Anda sudah ikut ronde ini'; END IF;
  IF a.id IS NULL THEN
    SELECT array_agg(id) INTO v_ids FROM (SELECT id FROM public.bix_surprise_bank ORDER BY random() LIMIT 2) s;
    INSERT INTO public.bix_surprise_attempts(user_id, round, qids) VALUES (v_uid, v_round, v_ids) RETURNING * INTO a;
  END IF;
  RETURN jsonb_build_object('attempt', a.id, 'questions', (SELECT jsonb_agg(jsonb_build_object('q', b.q, 'options', b.options) ORDER BY x.ord) FROM unnest(a.qids) WITH ORDINALITY x(id, ord) JOIN public.bix_surprise_bank b ON b.id = x.id));
END $$;

CREATE OR REPLACE FUNCTION public.bix_surprise_answer(p_attempt uuid, p_answers int[]) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); c jsonb := public.bix_surprise_cfg(); v_round int := COALESCE((c->>'round')::int, 1); v_quota int := COALESCE((c->>'quota')::int, 20); v_reward numeric := GREATEST(COALESCE((c->>'reward')::numeric, 1), 0); a record; v_ok boolean; v_won int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF NOT COALESCE((c->>'enabled')::boolean, false) THEN RAISE EXCEPTION 'Promo sedang tidak aktif'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('bix_surprise'));
  SELECT * INTO a FROM public.bix_surprise_attempts WHERE id = p_attempt AND user_id = v_uid AND round = v_round FOR UPDATE;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Kuis tidak ditemukan'; END IF;
  IF a.result IS NOT NULL THEN RAISE EXCEPTION 'Anda sudah ikut ronde ini'; END IF;
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
  IF v_reward > 0 THEN INSERT INTO public.bix_vbix_ledger(user_id, source_user, kind, level, amount_vbix) VALUES (v_uid, v_uid, 'quest', 0, v_reward); END IF;
  RETURN jsonb_build_object('result', 'win', 'amount', v_reward);
END $$;

CREATE OR REPLACE FUNCTION public.bix_surprise_admin() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c jsonb := public.bix_surprise_cfg(); v_round int := COALESCE((c->>'round')::int, 1);
BEGIN
  IF NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 only'; END IF;
  RETURN public.bix_surprise_status() || jsonb_build_object('bank', (SELECT count(*) FROM public.bix_surprise_bank), 'list', COALESCE((SELECT jsonb_agg(jsonb_build_object('name', COALESCE(p.username, p.display_name, left(a.user_id::text, 8)), 'result', a.result, 'amount', a.amount, 'at', COALESCE(a.answered_at, a.created_at)) ORDER BY a.created_at DESC) FROM public.bix_surprise_attempts a LEFT JOIN public.profiles p ON p.id = a.user_id WHERE a.round = v_round), '[]'::jsonb));
END $$;

CREATE OR REPLACE FUNCTION public.bix_surprise_save(p_enabled boolean, p_quota int, p_reward numeric, p_new_round boolean) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c jsonb := public.bix_surprise_cfg(); v_round int := COALESCE((c->>'round')::int, 1);
BEGIN
  IF NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 only'; END IF;
  IF p_quota < 1 OR p_quota > 1000 THEN RAISE EXCEPTION 'Kuota 1–1000'; END IF;
  IF p_reward < 0 OR p_reward > 100 THEN RAISE EXCEPTION 'Hadiah 0–100 BIX'; END IF;
  IF p_new_round THEN v_round := v_round + 1; END IF;
  INSERT INTO public.app_settings(key, value) VALUES ('bix_surprise', jsonb_build_object('enabled', p_enabled, 'quota', p_quota, 'reward', p_reward, 'round', v_round))
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
  RETURN public.bix_surprise_admin();
END $$;

REVOKE ALL ON FUNCTION public.bix_surprise_cfg() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bix_surprise_status(), public.bix_surprise_open(), public.bix_surprise_answer(uuid, int[]), public.bix_surprise_admin(), public.bix_surprise_save(boolean, int, numeric, boolean) TO authenticated;