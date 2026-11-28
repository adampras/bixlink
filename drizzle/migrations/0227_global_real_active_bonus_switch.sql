CREATE TABLE public.bix_active_bonus_control (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 enabled boolean NOT NULL DEFAULT false,
 changed_by uuid,
 changed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bix_active_bonus_control TO authenticated;
GRANT ALL ON public.bix_active_bonus_control TO service_role;
ALTER TABLE public.bix_active_bonus_control ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner1_read ON public.bix_active_bonus_control FOR SELECT TO authenticated USING ((SELECT public.bix_is_owner1()));
INSERT INTO public.bix_active_bonus_control(singleton,enabled) VALUES(true,false);

CREATE OR REPLACE FUNCTION public.bix_active_bonus_access(p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.bix_leaders l WHERE l.user_id=p_user AND l.status='approved' AND l.owner_access<>'closed'
 AND (l.owner_access='active_bonus' OR COALESCE((SELECT enabled FROM public.bix_active_bonus_control WHERE singleton),false)))
$$;
REVOKE ALL ON FUNCTION public.bix_active_bonus_access(uuid) FROM PUBLIC,anon,authenticated;

DO $$
DECLARE original text; changed text;
BEGIN
 original:=pg_get_functiondef('public.bix_balance_ledger(uuid)'::regprocedure);
 changed:=replace(original,'IF l.owner_access=''active_bonus'' THEN','IF public.bix_active_bonus_access(p_user) THEN');
 IF changed=original THEN RAISE EXCEPTION 'Balance access condition not found'; END IF;
 EXECUTE changed;
 original:=pg_get_functiondef('public.bix_locked_bonus_bix(uuid)'::regprocedure);
 changed:=replace(original,'l.owner_access=''active_bonus'' AND public.bix_active_bonus_real_source','public.bix_active_bonus_access(p_user) AND public.bix_active_bonus_real_source');
 IF changed=original THEN RAISE EXCEPTION 'BIX access condition not found'; END IF;
 EXECUTE changed;
END $$;

CREATE OR REPLACE FUNCTION public.bix_hold_network_bonus()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF public.bix_bonus_qualified(NEW.user_id) OR (public.bix_active_bonus_access(NEW.user_id) AND public.bix_active_bonus_real_source(NEW.member_id,NEW.source_stake_id)) THEN RETURN NEW; END IF;
 INSERT INTO public.bix_pending_network_bonuses(user_id,member_id,source_stake_id,kind,level,bonus_date,base_usd,rate_pct,total_usd,usdt_amount,bix_amount,bix_price_usd,created_at)
 VALUES(NEW.user_id,NEW.member_id,NEW.source_stake_id,NEW.kind,NEW.level,NEW.bonus_date,NEW.base_usd,NEW.rate_pct,NEW.total_usd,NEW.usdt_amount,NEW.bix_amount,NEW.bix_price_usd,COALESCE(NEW.created_at,now())) ON CONFLICT DO NOTHING;
 RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.bix_active_bonus_auto_admin()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 access required'; END IF;
 RETURN jsonb_build_object('enabled',COALESCE((SELECT enabled FROM public.bix_active_bonus_control WHERE singleton),false));
END $$;
REVOKE ALL ON FUNCTION public.bix_active_bonus_auto_admin() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bix_active_bonus_auto_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_active_bonus_auto_set(p_enabled boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE released integer:=0;
BEGIN
 IF NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 access required'; END IF;
 IF p_enabled IS NULL THEN RAISE EXCEPTION 'Switch value required'; END IF;
 PERFORM 1 FROM public.bix_active_bonus_control WHERE singleton FOR UPDATE;
 UPDATE public.bix_active_bonus_control SET enabled=p_enabled,changed_by=auth.uid(),changed_at=now() WHERE singleton;
 IF p_enabled THEN
  WITH moved AS (
   DELETE FROM public.bix_pending_network_bonuses b WHERE public.bix_active_bonus_access(b.user_id) AND public.bix_active_bonus_real_source(b.member_id,b.source_stake_id) RETURNING b.*
  )
  INSERT INTO public.bix_usdt_network_bonuses(user_id,member_id,source_stake_id,kind,level,bonus_date,base_usd,rate_pct,total_usd,usdt_amount,bix_amount,bix_price_usd,created_at)
  SELECT user_id,member_id,source_stake_id,kind,level,bonus_date,base_usd,rate_pct,total_usd,usdt_amount,bix_amount,bix_price_usd,created_at FROM moved ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS released=ROW_COUNT;
 END IF;
 RETURN jsonb_build_object('enabled',p_enabled,'released',released);
END $$;
REVOKE ALL ON FUNCTION public.bix_active_bonus_auto_set(boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bix_active_bonus_auto_set(boolean) TO authenticated;
COMMENT ON TABLE public.bix_active_bonus_control IS 'Owner 1 global real-source network bonus access only; never payment auto-approval or funding reclassification.';