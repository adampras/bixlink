CREATE TABLE public.bix_mining_rigs (
 id text PRIMARY KEY,
 name text NOT NULL,
 hashrate_th numeric NOT NULL CHECK (hashrate_th > 0),
 price_usd numeric NOT NULL CHECK (price_usd > 0),
 quota integer NOT NULL DEFAULT 0 CHECK (quota >= 0),
 reserved integer NOT NULL DEFAULT 0 CHECK (reserved >= 0),
 note text NOT NULL DEFAULT '',
 enabled boolean NOT NULL DEFAULT true,
 sort integer NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bix_mining_rigs TO anon, authenticated;
GRANT ALL ON public.bix_mining_rigs TO service_role;
ALTER TABLE public.bix_mining_rigs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads mining rigs" ON public.bix_mining_rigs FOR SELECT TO anon, authenticated USING (true);
INSERT INTO public.bix_mining_rigs(id,name,hashrate_th,price_usd,quota,note,sort) VALUES
 ('NANO','FOX RIG NANO',10,300,500,'Starter cloud rig',1),
 ('PRO','FOX RIG PRO',50,1500,200,'For active leaders',2),
 ('ASIC','QUANTUM FOX ASIC MASTER',250,10000,50,'Master Node certificate',3);

CREATE TABLE public.bix_mining_preorders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 rig_id text NOT NULL REFERENCES public.bix_mining_rigs(id),
 units integer NOT NULL CHECK (units BETWEEN 1 AND 10),
 price_usd numeric NOT NULL,
 hashrate_th numeric NOT NULL,
 status text NOT NULL DEFAULT 'pending',
 created_at timestamptz NOT NULL DEFAULT now(),
 reviewed_at timestamptz
);
GRANT SELECT ON public.bix_mining_preorders TO authenticated;
GRANT ALL ON public.bix_mining_preorders TO service_role;
ALTER TABLE public.bix_mining_preorders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own preorders" ON public.bix_mining_preorders FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_bix_admin());

CREATE OR REPLACE FUNCTION public.bix_is_owner1() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT public.is_bix_admin() AND EXISTS (SELECT 1 FROM auth.users WHERE id=auth.uid() AND lower(email)='bixdevpras@gmail.com' AND email_confirmed_at IS NOT NULL)
$$;

CREATE OR REPLACE FUNCTION public.bix_mining_preorder(p_rig text, p_units integer) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.bix_mining_rigs; v uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 IF p_units IS NULL OR p_units < 1 OR p_units > 10 THEN RAISE EXCEPTION 'Units must be 1-10'; END IF;
 IF (SELECT count(*) FROM public.bix_mining_preorders WHERE user_id=auth.uid() AND status='pending') >= 5 THEN RAISE EXCEPTION 'Too many pending pre-orders'; END IF;
 SELECT * INTO r FROM public.bix_mining_rigs WHERE id=p_rig FOR UPDATE;
 IF NOT FOUND OR NOT r.enabled THEN RAISE EXCEPTION 'Rig not available'; END IF;
 IF r.reserved + p_units > r.quota THEN RAISE EXCEPTION 'Not enough units left'; END IF;
 UPDATE public.bix_mining_rigs SET reserved = reserved + p_units WHERE id=p_rig;
 INSERT INTO public.bix_mining_preorders(user_id,rig_id,units,price_usd,hashrate_th) VALUES (auth.uid(),p_rig,p_units,r.price_usd*p_units,r.hashrate_th*p_units) RETURNING id INTO v;
 RETURN v;
END $$;

CREATE OR REPLACE FUNCTION public.bix_mining_rig_save(p_id text, p_name text, p_th numeric, p_price numeric, p_quota integer, p_note text, p_enabled boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 access required'; END IF;
 IF p_id !~ '^[A-Z0-9_]{2,20}$' OR length(coalesce(p_name,'')) NOT BETWEEN 2 AND 60 OR p_th <= 0 OR p_th > 1000000 OR p_price <= 0 OR p_price > 10000000 OR p_quota < 0 OR p_quota > 1000000 THEN RAISE EXCEPTION 'Invalid rig'; END IF;
 IF EXISTS (SELECT 1 FROM public.bix_mining_rigs WHERE id=p_id AND reserved > p_quota) THEN RAISE EXCEPTION 'Quota below reserved units'; END IF;
 INSERT INTO public.bix_mining_rigs(id,name,hashrate_th,price_usd,quota,note,enabled,sort)
 VALUES (p_id,p_name,p_th,p_price,p_quota,coalesce(p_note,''),p_enabled,(SELECT coalesce(max(sort),0)+1 FROM public.bix_mining_rigs))
 ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, hashrate_th=EXCLUDED.hashrate_th, price_usd=EXCLUDED.price_usd, quota=EXCLUDED.quota, note=EXCLUDED.note, enabled=EXCLUDED.enabled, updated_at=now();
END $$;

CREATE OR REPLACE FUNCTION public.bix_mining_preorder_review(p_id uuid, p_approve boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o public.bix_mining_preorders;
BEGIN
 IF NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 access required'; END IF;
 SELECT * INTO o FROM public.bix_mining_preorders WHERE id=p_id AND status='pending' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Pre-order not pending'; END IF;
 UPDATE public.bix_mining_preorders SET status = CASE WHEN p_approve THEN 'confirmed' ELSE 'rejected' END, reviewed_at=now() WHERE id=p_id;
 IF NOT p_approve THEN UPDATE public.bix_mining_rigs SET reserved = greatest(0, reserved - o.units) WHERE id=o.rig_id; END IF;
END $$;

REVOKE EXECUTE ON FUNCTION public.bix_mining_preorder(text,integer), public.bix_mining_rig_save(text,text,numeric,numeric,integer,text,boolean), public.bix_mining_preorder_review(uuid,boolean), public.bix_is_owner1() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.bix_mining_preorder(text,integer), public.bix_mining_rig_save(text,text,numeric,numeric,integer,text,boolean), public.bix_mining_preorder_review(uuid,boolean), public.bix_is_owner1() TO authenticated;