CREATE TABLE public.bix_zoom_config (id int PRIMARY KEY DEFAULT 1 CHECK (id=1), enabled boolean NOT NULL DEFAULT true, title text NOT NULL DEFAULT 'BIXLINK Global Convention Room', url text, schedule text, reward_bix numeric NOT NULL DEFAULT 0 CHECK (reward_bix>=0 AND reward_bix<=10000), terms text NOT NULL DEFAULT '', passcode text, session_key text NOT NULL DEFAULT 'S1', updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.bix_zoom_config TO service_role;
ALTER TABLE public.bix_zoom_config ENABLE ROW LEVEL SECURITY;
INSERT INTO public.bix_zoom_config(id) VALUES (1);

CREATE TABLE public.bix_zoom_claims (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, session_key text NOT NULL, amount_bix numeric NOT NULL, status text NOT NULL DEFAULT 'pending', created_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz, reviewed_by uuid, UNIQUE(user_id, session_key));
GRANT SELECT ON public.bix_zoom_claims TO authenticated;
GRANT ALL ON public.bix_zoom_claims TO service_role;
ALTER TABLE public.bix_zoom_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin read zoom claims" ON public.bix_zoom_claims FOR SELECT TO authenticated USING (auth.uid()=user_id OR public.is_bix_admin());

CREATE OR REPLACE FUNCTION public.bix_zoom_public() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT jsonb_build_object('enabled',enabled,'title',title,'url',url,'schedule',schedule,'rewardBix',reward_bix,'terms',terms,'sessionKey',session_key,
 'claimed', CASE WHEN auth.uid() IS NULL THEN NULL ELSE (SELECT status FROM public.bix_zoom_claims c WHERE c.user_id=auth.uid() AND c.session_key=z.session_key) END)
FROM public.bix_zoom_config z WHERE id=1 $$;

CREATE OR REPLACE FUNCTION public.bix_zoom_admin() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN IF NOT public.is_bix_admin() THEN RAISE EXCEPTION 'Owner access required'; END IF;
RETURN (SELECT to_jsonb(z) FROM public.bix_zoom_config z WHERE id=1); END $$;

CREATE OR REPLACE FUNCTION public.bix_zoom_save(p jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN IF NOT public.is_bix_admin() THEN RAISE EXCEPTION 'Owner access required'; END IF;
IF COALESCE(p->>'url','')<>'' AND p->>'url' NOT LIKE 'https://%' THEN RAISE EXCEPTION 'Link must start with https://'; END IF;
UPDATE public.bix_zoom_config SET enabled=COALESCE((p->>'enabled')::boolean,true), title=left(COALESCE(NULLIF(p->>'title',''),'BIXZOOM Room'),80), url=NULLIF(p->>'url',''), schedule=left(NULLIF(p->>'schedule',''),120), reward_bix=COALESCE((p->>'rewardBix')::numeric,0), terms=left(COALESCE(p->>'terms',''),2000), passcode=NULLIF(trim(p->>'passcode'),''), session_key=left(COALESCE(NULLIF(trim(p->>'sessionKey'),''),'S1'),40), updated_at=now() WHERE id=1;
END $$;

CREATE OR REPLACE FUNCTION public.bix_zoom_claim(p_code text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE z public.bix_zoom_config%ROWTYPE; v uuid;
BEGIN IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
SELECT * INTO z FROM public.bix_zoom_config WHERE id=1;
IF NOT z.enabled OR z.reward_bix<=0 OR z.passcode IS NULL THEN RAISE EXCEPTION 'No reward session is open'; END IF;
IF lower(trim(p_code))<>lower(z.passcode) THEN RAISE EXCEPTION 'Wrong attendance code'; END IF;
INSERT INTO public.bix_zoom_claims(user_id,session_key,amount_bix) VALUES (auth.uid(),z.session_key,z.reward_bix) ON CONFLICT DO NOTHING RETURNING id INTO v;
IF v IS NULL THEN RAISE EXCEPTION 'Already claimed for this session'; END IF;
RETURN v; END $$;

CREATE OR REPLACE FUNCTION public.bix_zoom_review(p_claim uuid, p_approve boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.bix_zoom_claims%ROWTYPE; v_owner uuid; v_balance numeric;
BEGIN IF auth.uid() IS NULL OR NOT public.is_bix_admin() THEN RAISE EXCEPTION 'Owner access required'; END IF;
SELECT * INTO b FROM public.bix_zoom_claims WHERE id=p_claim AND status='pending' FOR UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'Claim already reviewed'; END IF;
IF p_approve THEN
 PERFORM pg_advisory_xact_lock(hashtext('bix'||auth.uid()::text));
 SELECT owner_id,balance_bix INTO v_owner,v_balance FROM public.owner_bix_vault WHERE owner_id=auth.uid() FOR UPDATE;
 IF v_owner IS NULL OR v_balance<b.amount_bix THEN RAISE EXCEPTION 'Insufficient owner BIX reserve'; END IF;
 UPDATE public.owner_bix_vault SET balance_bix=balance_bix-b.amount_bix,updated_at=now() WHERE owner_id=v_owner;
 INSERT INTO public.bix_allocations(user_id,amount_bix,note,created_by) VALUES (b.user_id,b.amount_bix,'BIXZOOM reward '||b.session_key,v_owner);
END IF;
UPDATE public.bix_zoom_claims SET status=CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,reviewed_at=now(),reviewed_by=auth.uid() WHERE id=b.id;
END $$;

REVOKE ALL ON FUNCTION public.bix_zoom_public(), public.bix_zoom_admin(), public.bix_zoom_save(jsonb), public.bix_zoom_claim(text), public.bix_zoom_review(uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bix_zoom_public() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bix_zoom_admin(), public.bix_zoom_save(jsonb), public.bix_zoom_claim(text), public.bix_zoom_review(uuid,boolean) TO authenticated;