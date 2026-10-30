CREATE TABLE IF NOT EXISTS public.bix_network_moves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL,
  old_sponsor uuid,
  new_sponsor uuid,
  action text NOT NULL,
  moved_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bix_network_moves TO authenticated;
GRANT ALL ON public.bix_network_moves TO service_role;
ALTER TABLE public.bix_network_moves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner1 reads network moves" ON public.bix_network_moves FOR SELECT TO authenticated USING (public.bix_is_owner1());

CREATE OR REPLACE FUNCTION public.bix_network_is_descendant(p_root uuid, p_target uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  WITH RECURSIVE d(id) AS (
    SELECT user_id FROM public.referral_codes WHERE referred_by = p_root
    UNION SELECT r.user_id FROM public.referral_codes r JOIN d ON r.referred_by = d.id
  ) SELECT EXISTS (SELECT 1 FROM d WHERE id = p_target)
$$;
REVOKE EXECUTE ON FUNCTION public.bix_network_is_descendant(uuid, uuid) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.bix_network_lookup(p_code text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r record; v_sponsor text; v_direct int; v_team int;
BEGIN
  IF NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 only'; END IF;
  SELECT rc.user_id, rc.code, rc.referred_by, u.email INTO r FROM public.referral_codes rc LEFT JOIN auth.users u ON u.id = rc.user_id
   WHERE upper(rc.code) = upper(trim(p_code)) OR lower(u.email) = lower(trim(p_code)) LIMIT 1;
  IF r.user_id IS NULL THEN RAISE EXCEPTION 'Member not found'; END IF;
  SELECT code INTO v_sponsor FROM public.referral_codes WHERE user_id = r.referred_by;
  SELECT count(*) INTO v_direct FROM public.referral_codes WHERE referred_by = r.user_id;
  WITH RECURSIVE d(id) AS (SELECT user_id FROM public.referral_codes WHERE referred_by = r.user_id
    UNION SELECT x.user_id FROM public.referral_codes x JOIN d ON x.referred_by = d.id) SELECT count(*) INTO v_team FROM d;
  RETURN jsonb_build_object('code', r.code, 'email', r.email, 'sponsor', v_sponsor, 'direct', v_direct, 'team', v_team);
END $$;

CREATE OR REPLACE FUNCTION public.bix_network_move(p_member text, p_sponsor text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_m uuid; v_old uuid; v_s uuid;
BEGIN
  IF NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 only'; END IF;
  SELECT user_id, referred_by INTO v_m, v_old FROM public.referral_codes WHERE upper(code) = upper(trim(p_member)) FOR UPDATE;
  IF v_m IS NULL THEN RAISE EXCEPTION 'Member not found'; END IF;
  IF nullif(trim(coalesce(p_sponsor,'')),'') IS NOT NULL THEN
    SELECT user_id INTO v_s FROM public.referral_codes WHERE upper(code) = upper(trim(p_sponsor));
    IF v_s IS NULL THEN RAISE EXCEPTION 'New sponsor not found'; END IF;
    IF v_s = v_m THEN RAISE EXCEPTION 'A member cannot sponsor itself'; END IF;
    IF public.bix_network_is_descendant(v_m, v_s) THEN RAISE EXCEPTION 'New sponsor is inside this member''s downline (loop blocked)'; END IF;
  END IF;
  UPDATE public.referral_codes SET referred_by = v_s WHERE user_id = v_m;
  INSERT INTO public.bix_network_moves(member_id, old_sponsor, new_sponsor, action, moved_by)
  VALUES (v_m, v_old, v_s, CASE WHEN v_s IS NULL THEN 'detach' ELSE 'move' END, auth.uid());
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.bix_network_insert(p_new text, p_child text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_n uuid; v_nold uuid; v_c uuid; v_parent uuid;
BEGIN
  IF NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 only'; END IF;
  SELECT user_id, referred_by INTO v_n, v_nold FROM public.referral_codes WHERE upper(code) = upper(trim(p_new)) FOR UPDATE;
  SELECT user_id, referred_by INTO v_c, v_parent FROM public.referral_codes WHERE upper(code) = upper(trim(p_child)) FOR UPDATE;
  IF v_n IS NULL OR v_c IS NULL THEN RAISE EXCEPTION 'Member not found'; END IF;
  IF v_n = v_c THEN RAISE EXCEPTION 'Choose two different members'; END IF;
  IF public.bix_network_is_descendant(v_c, v_n) THEN RAISE EXCEPTION 'Inserted account is already below this member (loop blocked)'; END IF;
  UPDATE public.referral_codes SET referred_by = v_parent WHERE user_id = v_n;
  UPDATE public.referral_codes SET referred_by = v_n WHERE user_id = v_c;
  INSERT INTO public.bix_network_moves(member_id, old_sponsor, new_sponsor, action, moved_by) VALUES
   (v_n, v_nold, v_parent, 'insert', auth.uid()), (v_c, v_parent, v_n, 'insert-child', auth.uid());
  RETURN jsonb_build_object('ok', true);
END $$;
REVOKE EXECUTE ON FUNCTION public.bix_network_lookup(text), public.bix_network_move(text,text), public.bix_network_insert(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_network_lookup(text), public.bix_network_move(text,text), public.bix_network_insert(text,text) TO authenticated;