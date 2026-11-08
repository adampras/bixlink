CREATE OR REPLACE FUNCTION public.bix_design_set_card(p_skin text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN IF NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 only'; END IF;
IF p_skin NOT IN ('quartz','obsidian','emerald','corsa','amethyst') THEN RAISE EXCEPTION 'Unknown card color'; END IF;
INSERT INTO public.app_settings(key,value) VALUES('bix_design_release', public.bix_design_cfg() || jsonb_build_object('card',p_skin))
ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value;
RETURN public.bix_design_cfg(); END $$;
REVOKE ALL ON FUNCTION public.bix_design_set_card(text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.bix_design_set_card(text) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.bix_design_access() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE c jsonb := public.bix_design_cfg(); u uuid := auth.uid(); o2 boolean := false; wl boolean := false; nextgen boolean := false; ch boolean := COALESCE((c->>'chrono')::boolean,false); card text := COALESCE(c->>'card','obsidian');
BEGIN
  IF u IS NULL THEN RETURN jsonb_build_object('next_gen', c->>'mode'='public', 'owner2', false, 'chrono', false, 'locked','[]'::jsonb); END IF;
  IF public.bix_is_owner1() THEN RETURN jsonb_build_object('next_gen', c->>'mode'<>'off', 'owner2', false, 'owner1', true, 'chrono', ch AND c->>'mode'<>'off', 'card', card, 'locked','[]'::jsonb); END IF;
  o2 := public.bix_growth_excluded(u);
  IF o2 THEN
    nextgen := c->>'mode'<>'off' AND COALESCE((c->>'owner2_design')::boolean,false);
    RETURN jsonb_build_object('next_gen', nextgen, 'owner2', true, 'chrono', false, 'locked', COALESCE(c->'owner2_locked','[]'::jsonb));
  END IF;
  IF c->>'mode'='public' THEN nextgen := true;
  ELSIF c->>'mode'='scoped' THEN
    WITH RECURSIVE anc AS (SELECT u AS uid, ARRAY[u] AS path, 0 AS d UNION ALL SELECT r.referred_by, a.path||r.referred_by, a.d+1 FROM anc a JOIN public.referral_codes r ON r.user_id=a.uid WHERE r.referred_by IS NOT NULL AND NOT r.referred_by=ANY(a.path) AND a.d<200)
    SELECT EXISTS(SELECT 1 FROM anc WHERE public.bix_is_owner1_user(uid) OR EXISTS(SELECT 1 FROM public.bix_design_whitelist w WHERE w.user_id=anc.uid)) INTO wl;
    nextgen := wl;
  END IF;
  RETURN jsonb_build_object('next_gen', nextgen, 'owner2', false, 'chrono', ch AND nextgen, 'card', CASE WHEN ch AND nextgen THEN card END, 'locked','[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.bix_design_access() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.bix_design_access() TO anon,authenticated,service_role;