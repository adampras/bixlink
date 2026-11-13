CREATE TABLE public.bix_presale_wallet_ids (user_id uuid PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.bix_presale_wallet_ids TO service_role;
ALTER TABLE public.bix_presale_wallet_ids ENABLE ROW LEVEL SECURITY;

-- True when the caller or any upline is listed (presale wallets only; deposits and referral tree untouched).
CREATE OR REPLACE FUNCTION public.bix_presale_owner1_wallets() RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE cur uuid := auth.uid(); seen uuid[] := ARRAY[]::uuid[]; i int := 0;
BEGIN
  WHILE cur IS NOT NULL AND NOT cur = ANY(seen) AND i < 60 LOOP
    IF EXISTS (SELECT 1 FROM public.bix_presale_wallet_ids WHERE user_id = cur) THEN RETURN true; END IF;
    seen := seen || cur; i := i + 1;
    SELECT referred_by INTO cur FROM public.referral_codes WHERE user_id = cur;
  END LOOP;
  RETURN false;
END $$;
REVOKE ALL ON FUNCTION public.bix_presale_owner1_wallets() FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION public.bix_presale_owner1_wallets() TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_presale_wallet_ids_list() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN IF NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 only'; END IF;
RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('user_id', w.user_id, 'code', r.code, 'name', p.username) ORDER BY w.created_at DESC)
  FROM public.bix_presale_wallet_ids w LEFT JOIN public.referral_codes r ON r.user_id = w.user_id LEFT JOIN public.profiles p ON p.user_id = w.user_id), '[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.bix_presale_wallet_ids_list() FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION public.bix_presale_wallet_ids_list() TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_presale_wallet_ids_set(p_query text, p_on boolean) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid; q text := upper(trim(regexp_replace(COALESCE(p_query,''),'^@','')));
BEGIN IF NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 only'; END IF;
SELECT r.user_id INTO v FROM public.referral_codes r LEFT JOIN public.profiles p ON p.user_id=r.user_id
 WHERE upper(r.code)=q OR upper(r.code)='BIX-'||q OR upper(COALESCE(p.username,''))=q OR r.user_id::text=lower(q) LIMIT 1;
IF v IS NULL THEN RAISE EXCEPTION 'ID not found'; END IF;
IF p_on THEN INSERT INTO public.bix_presale_wallet_ids(user_id) VALUES(v) ON CONFLICT DO NOTHING; ELSE DELETE FROM public.bix_presale_wallet_ids WHERE user_id=v; END IF;
RETURN public.bix_presale_wallet_ids_list(); END $$;
REVOKE ALL ON FUNCTION public.bix_presale_wallet_ids_set(text, boolean) FROM PUBLIC, anon; GRANT EXECUTE ON FUNCTION public.bix_presale_wallet_ids_set(text, boolean) TO authenticated;