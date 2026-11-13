CREATE OR REPLACE FUNCTION public.bix_design_in_scope(p_user uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH RECURSIVE anc AS (SELECT p_user AS uid, ARRAY[p_user] AS path, 0 AS d UNION ALL SELECT r.referred_by, a.path||r.referred_by, a.d+1 FROM anc a JOIN public.referral_codes r ON r.user_id=a.uid WHERE r.referred_by IS NOT NULL AND NOT r.referred_by=ANY(a.path) AND a.d<200)
  SELECT EXISTS(SELECT 1 FROM anc WHERE EXISTS(SELECT 1 FROM public.bix_design_whitelist w WHERE w.user_id=anc.uid))
      OR (NOT public.bix_growth_excluded(p_user) AND EXISTS(SELECT 1 FROM anc WHERE public.bix_is_owner1_user(uid)));
$$;
REVOKE ALL ON FUNCTION public.bix_design_in_scope(uuid) FROM public, anon;

CREATE OR REPLACE FUNCTION public.bix_design_access() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE c jsonb := public.bix_design_cfg(); u uuid := auth.uid(); o2 boolean; wl boolean := false; nextgen boolean := false; ch boolean := COALESCE((c->>'chrono')::boolean,false); card text := COALESCE(c->>'card','obsidian');
BEGIN
  IF u IS NULL THEN RETURN jsonb_build_object('next_gen', c->>'mode'='public', 'owner2', false, 'chrono', false, 'locked','[]'::jsonb); END IF;
  IF public.bix_is_owner1() THEN RETURN jsonb_build_object('next_gen', c->>'mode'<>'off', 'owner2', false, 'owner1', true, 'chrono', ch AND c->>'mode'<>'off', 'card', card, 'locked','[]'::jsonb); END IF;
  wl := public.bix_design_in_scope(u);
  o2 := public.bix_growth_excluded(u);
  IF o2 AND NOT wl THEN
    nextgen := c->>'mode'<>'off' AND COALESCE((c->>'owner2_design')::boolean,false);
    RETURN jsonb_build_object('next_gen', nextgen, 'owner2', true, 'chrono', false, 'locked', COALESCE(c->'owner2_locked','[]'::jsonb));
  END IF;
  IF c->>'mode'='public' THEN nextgen := true; ELSIF c->>'mode'='scoped' THEN nextgen := wl; END IF;
  RETURN jsonb_build_object('next_gen', nextgen, 'owner2', o2, 'chrono', ch AND nextgen, 'card', CASE WHEN ch AND nextgen THEN card END, 'locked','[]'::jsonb);
END $function$;

CREATE OR REPLACE FUNCTION public.bix_hub_orbit_access() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE m text := COALESCE(public.bix_design_cfg()->>'hub_orbit','scoped'); u uuid := auth.uid(); o1 boolean := false;
BEGIN IF u IS NOT NULL THEN o1 := public.bix_is_owner1(); END IF;
  RETURN jsonb_build_object('mode', CASE WHEN o1 THEN m END, 'on', m='public' OR (m='scoped' AND u IS NOT NULL AND (o1 OR public.bix_design_in_scope(u))));
END $function$;

CREATE OR REPLACE FUNCTION public.bix_hub_float_access() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE m text := COALESCE(public.bix_design_cfg()->>'hub_float','scoped'); u uuid := auth.uid(); o1 boolean := false;
BEGIN IF u IS NOT NULL THEN o1 := public.bix_is_owner1(); END IF;
  RETURN jsonb_build_object('mode', CASE WHEN o1 THEN m END, 'on', m='public' OR (m='scoped' AND u IS NOT NULL AND (o1 OR public.bix_design_in_scope(u))));
END $function$;

CREATE OR REPLACE FUNCTION public.bix_design_whitelist_set(p_query text, p_on boolean) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v uuid; q text := upper(trim(regexp_replace(COALESCE(p_query,''),'^@','')));
BEGIN IF NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 only'; END IF;
SELECT r.user_id INTO v FROM public.referral_codes r LEFT JOIN public.profiles p ON p.user_id=r.user_id
 WHERE upper(r.code)=q OR upper(r.code)='BIX-'||q OR upper(COALESCE(p.username,''))=q OR r.user_id::text=lower(q) LIMIT 1;
IF v IS NULL THEN RAISE EXCEPTION 'ID not found'; END IF;
IF p_on THEN INSERT INTO public.bix_design_whitelist(user_id) VALUES(v) ON CONFLICT DO NOTHING; ELSE DELETE FROM public.bix_design_whitelist WHERE user_id=v; END IF;
RETURN public.bix_design_admin(); END $function$;