CREATE OR REPLACE FUNCTION public.bix_call_find(p_query text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid; q text := trim(coalesce(p_query,'')); d text; via text;
BEGIN
  IF auth.uid() IS NULL OR length(q) < 3 THEN RETURN NULL; END IF;
  d := regexp_replace(q, '[^0-9]', '', 'g');
  SELECT user_id INTO uid FROM referral_codes WHERE upper(code) = upper(q) OR (d <> '' AND upper(code) = 'BIX-' || d AND q !~ '^\+|^0') LIMIT 1;
  IF uid IS NOT NULL THEN via := 'id'; END IF;
  IF uid IS NULL THEN SELECT user_id INTO uid FROM profiles WHERE lower(username) = lower(trim(both '@' from q)) LIMIT 1; IF uid IS NOT NULL THEN via := 'username'; END IF; END IF;
  IF uid IS NULL AND length(d) >= 8 THEN
    IF d LIKE '0%' THEN d := '62' || substr(d, 2); END IF;
    SELECT user_id INTO uid FROM profiles WHERE whatsapp_public AND regexp_replace(coalesce(whatsapp,''), '[^0-9]', '', 'g') = d LIMIT 1;
    IF uid IS NOT NULL THEN via := 'whatsapp'; END IF;
  END IF;
  IF uid IS NULL THEN RETURN NULL; END IF;
  RETURN bix_call_peer(uid) || jsonb_build_object('code', (SELECT code FROM referral_codes WHERE user_id = uid LIMIT 1), 'via', via);
END $$;
REVOKE ALL ON FUNCTION public.bix_call_find(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_call_find(text) TO authenticated;