CREATE TABLE public.bix_mining_conversions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, amount_vbix numeric NOT NULL CHECK(amount_vbix > 0), amount_bix numeric NOT NULL CHECK(amount_bix > 0 AND amount_bix <= 100), vbix_per_bix numeric NOT NULL CHECK(vbix_per_bix > 0), allocation_id uuid NOT NULL REFERENCES public.bix_allocations(id), created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bix_mining_conversions TO authenticated;
GRANT ALL ON public.bix_mining_conversions TO service_role;
ALTER TABLE public.bix_mining_conversions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own mining conversions or owner" ON public.bix_mining_conversions FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.is_bix_admin());
CREATE POLICY "Public splash settings" ON public.app_settings FOR SELECT TO anon,authenticated USING(key='splash');
CREATE POLICY "Member conversion settings" ON public.app_settings FOR SELECT TO authenticated USING(key='mining_conversion');
CREATE OR REPLACE FUNCTION public.bix_mining_conversion_status() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE cfg jsonb; consumed numeric; credited numeric; pool_used numeric; bal numeric;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT value INTO cfg FROM public.app_settings WHERE key='mining_conversion';
 SELECT COALESCE(sum(amount_vbix),0),COALESCE(sum(amount_bix),0) INTO consumed,credited FROM public.bix_mining_conversions WHERE user_id=auth.uid();
 SELECT COALESCE(sum(amount_bix),0) INTO pool_used FROM public.bix_mining_conversions;
 SELECT bix_balance INTO bal FROM public.bix_asset_balances(auth.uid());
 RETURN jsonb_build_object('enabled',COALESCE((cfg->>'enabled')::boolean,false),'vbixPerBix',(cfg->>'vbixPerBix')::numeric,'consumedVbix',consumed,'convertedBix',credited,'poolUsed',pool_used,'bixBalance',bal);
END $$;
CREATE OR REPLACE FUNCTION public.bix_mining_convert() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cfg jsonb; rate numeric; available numeric; consumed numeric; credited numeric; pool_used numeric; amount numeric; allocation uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'Verifikasi email diperlukan'; END IF;
 IF EXISTS(SELECT 1 FROM public.bix_clone_accounts WHERE user_id=auth.uid()) THEN RAISE EXCEPTION 'Not available for this account'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('bix_mining_marketing_pool'));
 SELECT value INTO cfg FROM public.app_settings WHERE key='mining_conversion' FOR UPDATE;
 IF NOT COALESCE((cfg->>'enabled')::boolean,false) THEN RAISE EXCEPTION 'Konversi vBIX sedang ditutup'; END IF;
 rate := (cfg->>'vbixPerBix')::numeric;
 IF rate IS NULL OR rate <= 0 OR rate > 1000000000 OR rate::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Nilai konversi belum ditentukan'; END IF;
 PERFORM public.bix_mining_settle();
 SELECT COALESCE(sum(amount_vbix),0),COALESCE(sum(amount_bix),0) INTO consumed,credited FROM public.bix_mining_conversions WHERE user_id=auth.uid();
 SELECT COALESCE(sum(amount_bix),0) INTO pool_used FROM public.bix_mining_conversions;
 SELECT COALESCE(sum(amount_vbix),0)-consumed INTO available FROM public.bix_vbix_ledger WHERE user_id=auth.uid();
 amount := trunc(GREATEST(0,LEAST(available/rate,100-credited,1000000-pool_used)),6);
 IF amount <= 0 THEN RAISE EXCEPTION 'Saldo vBIX belum cukup atau batas konversi tercapai'; END IF;
 INSERT INTO public.bix_allocations(user_id,amount_bix,note,created_by) VALUES(auth.uid(),amount,'Marketing & Community: vBIX conversion',auth.uid()) RETURNING id INTO allocation;
 INSERT INTO public.bix_mining_conversions(user_id,amount_vbix,amount_bix,vbix_per_bix,allocation_id) VALUES(auth.uid(),amount*rate,amount,rate,allocation);
 RETURN public.bix_mining_conversion_status();
END $$;
REVOKE ALL ON FUNCTION public.bix_mining_conversion_status(),public.bix_mining_convert() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bix_mining_conversion_status(),public.bix_mining_convert() TO authenticated;