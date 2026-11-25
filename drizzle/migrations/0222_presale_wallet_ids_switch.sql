ALTER TABLE public.bix_presale_wallet_ids ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.bix_presale_owner1_wallets() RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE cur uuid := auth.uid(); seen uuid[] := ARRAY[]::uuid[]; i int := 0;
BEGIN
  WHILE cur IS NOT NULL AND NOT cur = ANY(seen) AND i < 60 LOOP
    IF EXISTS (SELECT 1 FROM public.bix_presale_wallet_ids WHERE user_id = cur) THEN
      RETURN (SELECT active FROM public.bix_presale_wallet_ids WHERE user_id = cur);
    END IF;
    seen := seen || cur; i := i + 1;
    SELECT referred_by INTO cur FROM public.referral_codes WHERE user_id = cur;
  END LOOP;
  RETURN false;
END $$;

CREATE OR REPLACE FUNCTION public.bix_deposit_owner(p_user uuid)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE cur uuid := p_user; nxt uuid; seen uuid[] := ARRAY[]::uuid[]; i int := 0;
BEGIN
  LOOP
    IF EXISTS (SELECT 1 FROM public.bix_deposit_owner1_lock WHERE user_id = cur AND active) THEN RETURN NULL; END IF;
    IF EXISTS (SELECT 1 FROM public.bix_presale_wallet_ids WHERE user_id = cur AND active) THEN RETURN NULL; END IF;
    IF EXISTS (SELECT 1 FROM public.bix_design_whitelist WHERE user_id = cur) THEN RETURN NULL; END IF;
    SELECT referred_by INTO nxt FROM public.referral_codes WHERE user_id = cur;
    IF nxt IS NOT NULL AND public.bix_quota_overflow(nxt, cur) THEN RETURN NULL; END IF;
    cur := nxt;
    i := i + 1;
    EXIT WHEN cur IS NULL OR cur = ANY(seen) OR i > 60;
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = cur AND role = 'reviewer') THEN RETURN cur; END IF;
    seen := seen || cur;
  END LOOP;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.bix_deposit_owner(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bix_presale_wallet_ids_list() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN IF NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 only'; END IF;
RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('user_id', w.user_id, 'code', r.code, 'name', p.username, 'active', w.active) ORDER BY w.created_at DESC)
  FROM public.bix_presale_wallet_ids w LEFT JOIN public.referral_codes r ON r.user_id = w.user_id LEFT JOIN public.profiles p ON p.user_id = w.user_id), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.bix_presale_wallet_ids_switch(p_user uuid, p_active boolean) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN IF NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 only'; END IF;
UPDATE public.bix_presale_wallet_ids SET active = p_active WHERE user_id = p_user;
IF NOT FOUND THEN RAISE EXCEPTION 'ID not in list'; END IF;
RETURN public.bix_presale_wallet_ids_list(); END $$;
REVOKE ALL ON FUNCTION public.bix_presale_wallet_ids_switch(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_presale_wallet_ids_switch(uuid, boolean) TO authenticated;