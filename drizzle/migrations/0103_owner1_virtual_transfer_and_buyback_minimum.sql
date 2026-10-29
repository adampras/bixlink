CREATE OR REPLACE FUNCTION public.bix_vusdt_send(p_code text, p_amount numeric, p_note text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_enabled boolean; v_to uuid; v_to_code text; v_from_code text; v_bal numeric; v_id uuid;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 IF NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Only Owner 1 can transfer virtual USDT'; END IF;
 SELECT COALESCE((value->>'enabled')::boolean,false) INTO v_enabled FROM public.app_settings WHERE key='usdt_transfer';
 IF NOT COALESCE(v_enabled,false) THEN RAISE EXCEPTION 'Coming soon — transfer is not open yet'; END IF;
 IF p_amount IS NULL OR p_amount < 0.01 THEN RAISE EXCEPTION 'Minimum transfer is $0.01'; END IF;
 IF p_amount > 1000000 OR p_amount::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Amount too large'; END IF;
 SELECT user_id,code INTO v_to,v_to_code FROM public.referral_codes WHERE code=upper(trim(p_code));
 IF v_to IS NULL THEN RAISE EXCEPTION 'Recipient not found'; END IF;
 IF v_to=auth.uid() THEN RAISE EXCEPTION 'You cannot transfer to yourself'; END IF;
 SELECT code INTO v_from_code FROM public.referral_codes WHERE user_id=auth.uid();
 IF v_from_code IS NULL THEN RAISE EXCEPTION 'Your member code is not ready yet'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('vusdt'||auth.uid()::text));
 v_bal:=public.bix_vusdt_balance(auth.uid());
 IF COALESCE(v_bal,0)<p_amount THEN RAISE EXCEPTION 'Insufficient virtual USDT balance'; END IF;
 INSERT INTO public.vusdt_transfers(sender_id,recipient_id,sender_code,recipient_code,amount_usd,note)
 VALUES(auth.uid(),v_to,v_from_code,v_to_code,p_amount,NULLIF(left(trim(coalesce(p_note,'')),120),'')) RETURNING id INTO v_id;
 RETURN v_id;
END $$;
CREATE OR REPLACE FUNCTION public.bix_virtual_sender_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.bix_is_owner1() OR NEW.sender_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Only Owner 1 can transfer virtual USDT'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER bix_virtual_owner1_only BEFORE INSERT ON public.vusdt_transfers FOR EACH ROW EXECUTE FUNCTION public.bix_virtual_sender_guard();
CREATE OR REPLACE FUNCTION public.bix_buyback_minimum_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.channel='buyback' AND (TG_OP='INSERT' OR NEW.status IN ('pending','approved')) AND (NEW.amount_in IS NULL OR NEW.amount_in<500 OR NEW.amount_in::text IN ('NaN','Infinity','-Infinity')) THEN
 RAISE EXCEPTION 'Minimum developer buyback is 500 BIX';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER bix_buyback_minimum_500 BEFORE INSERT OR UPDATE ON public.swap_requests FOR EACH ROW EXECUTE FUNCTION public.bix_buyback_minimum_guard();
CREATE OR REPLACE FUNCTION public.bix_buyback_review(p_id uuid,p_approve boolean,p_note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT (public.bix_is_owner1() OR ((public.is_bix_admin() OR public.bix_reviewer_can('market')) AND EXISTS(SELECT 1 FROM auth.users WHERE id=auth.uid() AND email_confirmed_at IS NOT NULL))) THEN RAISE EXCEPTION 'Authorized verified owner only'; END IF;
 UPDATE public.swap_requests SET status=CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,reviewed_at=now() WHERE id=p_id AND channel='buyback' AND status='pending';
 IF NOT FOUND THEN RAISE EXCEPTION 'Request is no longer pending'; END IF;
 UPDATE public.bix_buyback_details SET reviewed_by=auth.uid(),review_note=left(p_note,200) WHERE swap_id=p_id;
END $$;