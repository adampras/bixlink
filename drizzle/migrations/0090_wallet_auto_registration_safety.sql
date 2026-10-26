ALTER TABLE public.bix_wallet_challenges ADD COLUMN IF NOT EXISTS referral_code text;
CREATE OR REPLACE FUNCTION public.bix_has_real_verified_email(p_user uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM auth.users WHERE id=p_user AND email_confirmed_at IS NOT NULL AND lower(email) NOT LIKE '%@wallet.bixlink.invalid') $$;
REVOKE ALL ON FUNCTION public.bix_has_real_verified_email(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bix_has_real_verified_email(uuid) TO service_role;
DO $$ DECLARE f record; body text; BEGIN
 FOR f IN SELECT oid FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('bix_grant_welcome','bix_mining_start','bix_mining_convert','bix_quest_claim') LOOP
  body := pg_get_functiondef(f.oid);
  body := replace(body, 'email_confirmed_at IS NOT NULL', 'email_confirmed_at IS NOT NULL AND lower(email) NOT LIKE ''%@wallet.bixlink.invalid''');
  EXECUTE body;
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.bix_provision_wallet_member(p_user uuid, p_address text, p_referral text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE existing_user uuid; sponsor uuid; member_code text; attempt integer;
BEGIN
 IF p_address !~ '^0x[0-9a-f]{40}$' THEN RAISE EXCEPTION 'Invalid wallet address'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext('wallet-member:' || p_address));
 SELECT user_id INTO existing_user FROM public.bix_wallet_identities WHERE address=p_address;
 IF existing_user IS NOT NULL AND existing_user <> p_user THEN RAISE EXCEPTION 'Wallet belongs to another account'; END IF;
 IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id=p_user AND lower(email)=p_address || '@wallet.bixlink.invalid' AND raw_app_meta_data->>'wallet_address'=p_address) THEN RAISE EXCEPTION 'Wallet account identity mismatch'; END IF;
 INSERT INTO public.profiles(user_id,full_name,username) VALUES(p_user,p_address,p_address) ON CONFLICT(user_id) DO NOTHING;
 IF NOT EXISTS(SELECT 1 FROM public.referral_codes WHERE user_id=p_user) THEN
  IF p_referral IS NOT NULL THEN SELECT user_id INTO sponsor FROM public.referral_codes WHERE code=upper(p_referral) AND user_id<>p_user; END IF;
  FOR attempt IN 1..20 LOOP
   member_code := 'BIX-' || (100000 + floor(random()*900000)::integer)::text;
   BEGIN
    INSERT INTO public.referral_codes(user_id,code,referred_by) VALUES(p_user,member_code,sponsor);
    EXIT;
   EXCEPTION WHEN unique_violation THEN
    IF EXISTS(SELECT 1 FROM public.referral_codes WHERE user_id=p_user) THEN EXIT; END IF;
    IF attempt=20 THEN RAISE EXCEPTION 'Could not generate member code'; END IF;
   END;
  END LOOP;
 END IF;
 INSERT INTO public.bix_wallet_identities(address,user_id,chain_id) VALUES(p_address,p_user,56) ON CONFLICT(address) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.bix_provision_wallet_member(uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bix_provision_wallet_member(uuid,text,text) TO service_role;
COMMENT ON FUNCTION public.bix_provision_wallet_member(uuid,text,text) IS 'Atomic profile, referral and wallet mapping after server signature verification; no funds or roles granted.';