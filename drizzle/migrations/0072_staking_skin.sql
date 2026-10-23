CREATE OR REPLACE FUNCTION public.bix_staking_skin_for_me() RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE cfg jsonb; owners uuid[]; hit boolean;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  SELECT value INTO cfg FROM app_settings WHERE key = 'staking_skin';
  IF cfg IS NULL OR coalesce((cfg->>'enabled')::boolean, false) = false THEN RETURN false; END IF;
  SELECT coalesce(array_agg(x::uuid), '{}') INTO owners FROM jsonb_array_elements_text(coalesce(cfg->'owners','[]'::jsonb)) x;
  WITH RECURSIVE up(uid, depth, path) AS (
    SELECT auth.uid(), 0, ARRAY[auth.uid()]
    UNION ALL
    SELECT r.referred_by, up.depth + 1, up.path || r.referred_by FROM up JOIN referral_codes r ON r.user_id = up.uid
    WHERE r.referred_by IS NOT NULL AND up.depth < 60 AND NOT r.referred_by = ANY(up.path)
  ) SELECT EXISTS (SELECT 1 FROM up WHERE uid = ANY(owners)) INTO hit;
  RETURN hit;
END $$;
REVOKE ALL ON FUNCTION public.bix_staking_skin_for_me() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bix_staking_skin_for_me() TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_staking_skin_admin() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE cfg jsonb;
BEGIN
  IF NOT is_bix_admin() THEN RAISE EXCEPTION 'Owner only' USING ERRCODE = '42501'; END IF;
  SELECT value INTO cfg FROM app_settings WHERE key = 'staking_skin';
  RETURN jsonb_build_object('enabled', coalesce((cfg->>'enabled')::boolean, false), 'owners', coalesce((
    SELECT jsonb_agg(jsonb_build_object('id', rc.user_id, 'code', rc.code)) FROM jsonb_array_elements_text(coalesce(cfg->'owners','[]'::jsonb)) x JOIN referral_codes rc ON rc.user_id = x::uuid), '[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.bix_staking_skin_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bix_staking_skin_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_staking_skin_save(p_enabled boolean, p_codes text[]) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE ids jsonb; missing text;
BEGIN
  IF NOT is_bix_admin() THEN RAISE EXCEPTION 'Owner only' USING ERRCODE = '42501'; END IF;
  SELECT c INTO missing FROM unnest(coalesce(p_codes,'{}')) c WHERE NOT EXISTS (SELECT 1 FROM referral_codes WHERE upper(code) = upper(trim(c))) LIMIT 1;
  IF missing IS NOT NULL THEN RAISE EXCEPTION 'Kode member tidak ditemukan: %', missing; END IF;
  SELECT coalesce(jsonb_agg(DISTINCT user_id), '[]'::jsonb) INTO ids FROM referral_codes WHERE upper(code) IN (SELECT upper(trim(c)) FROM unnest(coalesce(p_codes,'{}')) c);
  INSERT INTO app_settings(key, value) VALUES ('staking_skin', jsonb_build_object('enabled', p_enabled, 'owners', ids))
  ON CONFLICT (key) DO UPDATE SET value = excluded.value;
  RETURN bix_staking_skin_admin();
END $$;
REVOKE ALL ON FUNCTION public.bix_staking_skin_save(boolean, text[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bix_staking_skin_save(boolean, text[]) TO authenticated;