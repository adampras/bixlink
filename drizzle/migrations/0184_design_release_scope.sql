CREATE TABLE public.bix_design_whitelist (user_id uuid PRIMARY KEY, note text, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.bix_design_whitelist TO authenticated; GRANT ALL ON public.bix_design_whitelist TO service_role;
ALTER TABLE public.bix_design_whitelist ENABLE ROW LEVEL SECURITY;
CREATE POLICY design_wl_owner ON public.bix_design_whitelist FOR SELECT TO authenticated USING (public.bix_is_owner1());

CREATE OR REPLACE FUNCTION public.bix_design_cfg() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT jsonb_build_object('mode','scoped','owner2_design',false,'owner2_locked','[]'::jsonb) || COALESCE((SELECT value FROM public.app_settings WHERE key='bix_design_release'),'{}'::jsonb) $$;
REVOKE ALL ON FUNCTION public.bix_design_cfg() FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.bix_design_cfg() TO service_role;

CREATE OR REPLACE FUNCTION public.bix_design_access() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE c jsonb := public.bix_design_cfg(); u uuid := auth.uid(); o2 boolean := false; wl boolean := false; nextgen boolean := false;
BEGIN
  IF u IS NULL THEN RETURN jsonb_build_object('next_gen', c->>'mode'='public', 'owner2', false, 'locked','[]'::jsonb); END IF;
  IF public.bix_is_owner1() THEN RETURN jsonb_build_object('next_gen', c->>'mode'<>'off', 'owner2', false, 'owner1', true, 'locked','[]'::jsonb); END IF;
  o2 := public.bix_growth_excluded(u);
  IF o2 THEN
    nextgen := c->>'mode'<>'off' AND COALESCE((c->>'owner2_design')::boolean,false);
    RETURN jsonb_build_object('next_gen', nextgen, 'owner2', true, 'locked', COALESCE(c->'owner2_locked','[]'::jsonb));
  END IF;
  IF c->>'mode'='public' THEN nextgen := true;
  ELSIF c->>'mode'='scoped' THEN
    WITH RECURSIVE anc AS (SELECT u AS uid, ARRAY[u] AS path, 0 AS d UNION ALL SELECT r.referred_by, a.path||r.referred_by, a.d+1 FROM anc a JOIN public.referral_codes r ON r.user_id=a.uid WHERE r.referred_by IS NOT NULL AND NOT r.referred_by=ANY(a.path) AND a.d<200)
    SELECT EXISTS(SELECT 1 FROM anc WHERE public.bix_is_owner1_user(uid) OR EXISTS(SELECT 1 FROM public.bix_design_whitelist w WHERE w.user_id=anc.uid)) INTO wl;
    nextgen := wl;
  END IF;
  RETURN jsonb_build_object('next_gen', nextgen, 'owner2', false, 'locked','[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.bix_design_access() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.bix_design_access() TO anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.bix_design_admin() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN IF NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 only'; END IF;
RETURN jsonb_build_object('config', public.bix_design_cfg(), 'whitelist', COALESCE((SELECT jsonb_agg(jsonb_build_object('user_id',w.user_id,'code',r.code,'name',p.full_name,'note',w.note) ORDER BY w.created_at) FROM public.bix_design_whitelist w LEFT JOIN public.referral_codes r ON r.user_id=w.user_id LEFT JOIN public.profiles p ON p.user_id=w.user_id),'[]'::jsonb)); END $$;
REVOKE ALL ON FUNCTION public.bix_design_admin() FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.bix_design_admin() TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.bix_design_save(p_mode text, p_owner2_design boolean, p_locked jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN IF NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 only'; END IF;
IF p_mode NOT IN ('off','scoped','public') THEN RAISE EXCEPTION 'Invalid mode'; END IF;
IF jsonb_typeof(COALESCE(p_locked,'[]'::jsonb))<>'array' THEN RAISE EXCEPTION 'Invalid list'; END IF;
INSERT INTO public.app_settings(key,value) VALUES('bix_design_release', jsonb_build_object('mode',p_mode,'owner2_design',COALESCE(p_owner2_design,false),'owner2_locked',COALESCE(p_locked,'[]'::jsonb)))
ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value;
RETURN public.bix_design_cfg(); END $$;
REVOKE ALL ON FUNCTION public.bix_design_save(text,boolean,jsonb) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.bix_design_save(text,boolean,jsonb) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.bix_design_whitelist_set(p_query text, p_on boolean) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v uuid; q text := upper(trim(regexp_replace(COALESCE(p_query,''),'^@','')));
BEGIN IF NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 only'; END IF;
SELECT r.user_id INTO v FROM public.referral_codes r LEFT JOIN public.profiles p ON p.user_id=r.user_id
 WHERE upper(r.code)=q OR upper(r.code)='BIX-'||q OR upper(COALESCE(p.username,''))=q OR r.user_id::text=lower(q) LIMIT 1;
IF v IS NULL THEN RAISE EXCEPTION 'ID not found'; END IF;
IF p_on AND public.bix_growth_excluded(v) THEN RAISE EXCEPTION 'ID ini berada di jaringan Admin 2 — gunakan saklar Admin 2'; END IF;
IF p_on THEN INSERT INTO public.bix_design_whitelist(user_id) VALUES(v) ON CONFLICT DO NOTHING; ELSE DELETE FROM public.bix_design_whitelist WHERE user_id=v; END IF;
RETURN public.bix_design_admin(); END $$;
REVOKE ALL ON FUNCTION public.bix_design_whitelist_set(text,boolean) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.bix_design_whitelist_set(text,boolean) TO authenticated,service_role;