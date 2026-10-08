CREATE OR REPLACE FUNCTION public.bix_reviewer_update_setting(p_key text, p_value jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_value jsonb; next_value jsonb; m jsonb; n numeric;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='reviewer') THEN RAISE EXCEPTION 'Owner 2 access required'; END IF;
  IF p_key NOT IN ('bix_market','referrals') OR jsonb_typeof(p_value) <> 'object' THEN RAISE EXCEPTION 'Setting unavailable'; END IF;
  SELECT value INTO current_value FROM public.app_settings WHERE key=p_key FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Setting unavailable'; END IF;
  IF p_key='bix_market' THEN
    IF EXISTS (SELECT 1 FROM jsonb_object_keys(p_value) k WHERE k NOT IN ('priceUsd','movement')) THEN RAISE EXCEPTION 'Invalid market fields'; END IF;
    IF jsonb_typeof(p_value->'priceUsd') IS DISTINCT FROM 'number' OR (p_value->>'priceUsd')::numeric <= 0 OR (p_value->>'priceUsd')::numeric > 1000000 THEN RAISE EXCEPTION 'Invalid reference price'; END IF;
    m := p_value->'movement';
    IF m IS NOT NULL AND m <> 'null'::jsonb THEN
      IF jsonb_typeof(m) <> 'object' OR jsonb_typeof(m->'enabled') IS DISTINCT FROM 'boolean' OR jsonb_typeof(m->'lower') IS DISTINCT FROM 'number' OR jsonb_typeof(m->'upper') IS DISTINCT FROM 'number' OR jsonb_typeof(m->'intervalSeconds') IS DISTINCT FROM 'number' OR jsonb_typeof(m->'intensity') IS DISTINCT FROM 'number' OR jsonb_typeof(m->'base') IS DISTINCT FROM 'number' OR jsonb_typeof(m->'startedAt') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Invalid movement'; END IF;
      IF (m->>'lower')::numeric <= 0 OR (m->>'upper')::numeric > 1000000 OR (m->>'upper')::numeric <= (m->>'lower')::numeric OR (m->>'intervalSeconds')::numeric NOT BETWEEN 2 AND 300 OR (m->>'intensity')::numeric NOT BETWEEN 1 AND 100 OR COALESCE(m->>'bias','') NOT IN ('balanced','up','down') OR (m->>'base')::numeric NOT BETWEEN (m->>'lower')::numeric AND (m->>'upper')::numeric THEN RAISE EXCEPTION 'Invalid movement limits'; END IF;
    END IF;
  ELSE
    IF EXISTS (SELECT 1 FROM jsonb_object_keys(p_value) k WHERE k NOT IN ('direct','levels','rewardPlus','minimumDirect','splitUsdt','splitBix','bixDirectPct','bixDirectEnabled')) THEN RAISE EXCEPTION 'Invalid referral fields'; END IF;
    IF jsonb_typeof(p_value->'levels') IS DISTINCT FROM 'array' OR jsonb_array_length(p_value->'levels') <> 5 THEN RAISE EXCEPTION 'Five referral levels required'; END IF;
    FOR n IN SELECT value::numeric FROM jsonb_array_elements_text(p_value->'levels') LOOP IF n NOT BETWEEN 0 AND 100 THEN RAISE EXCEPTION 'Invalid referral rate'; END IF; END LOOP;
    IF jsonb_typeof(p_value->'direct') IS DISTINCT FROM 'number' OR jsonb_typeof(p_value->'rewardPlus') IS DISTINCT FROM 'number' OR jsonb_typeof(p_value->'minimumDirect') IS DISTINCT FROM 'number' OR jsonb_typeof(p_value->'splitUsdt') IS DISTINCT FROM 'number' OR jsonb_typeof(p_value->'splitBix') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Invalid referral values'; END IF;
    IF (p_value->>'direct')::numeric NOT BETWEEN 0 AND 100 OR (p_value->>'rewardPlus')::numeric NOT BETWEEN 0 AND 100 OR (p_value->>'minimumDirect')::numeric < 1 OR (p_value->>'minimumDirect')::numeric <> trunc((p_value->>'minimumDirect')::numeric) OR (p_value->>'splitUsdt')::numeric NOT BETWEEN 0 AND 100 OR (p_value->>'splitBix')::numeric NOT BETWEEN 0 AND 100 OR (p_value->>'splitUsdt')::numeric + (p_value->>'splitBix')::numeric <> 100 THEN RAISE EXCEPTION 'Invalid referral limits'; END IF;
    IF p_value ? 'bixDirectPct' AND (jsonb_typeof(p_value->'bixDirectPct') <> 'number' OR (p_value->>'bixDirectPct')::numeric NOT BETWEEN 0 AND 100) THEN RAISE EXCEPTION 'Invalid BIX referral rate'; END IF;
    IF p_value ? 'bixDirectEnabled' AND jsonb_typeof(p_value->'bixDirectEnabled') <> 'boolean' THEN RAISE EXCEPTION 'Invalid BIX referral switch'; END IF;
  END IF;
  next_value := current_value || p_value;
  UPDATE public.app_settings SET value=next_value WHERE key=p_key;
END;
$$;
REVOKE ALL ON FUNCTION public.bix_reviewer_update_setting(text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_reviewer_update_setting(text,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_reviewer_save_wallet(p_wallet jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_value jsonb; wallet_index integer; network_name text; wallet_address text;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='reviewer') THEN RAISE EXCEPTION 'Owner 2 access required'; END IF;
  IF jsonb_typeof(p_wallet) <> 'object' OR COALESCE(p_wallet->>'code','') <> 'WLT-01' OR EXISTS (SELECT 1 FROM jsonb_object_keys(p_wallet) k WHERE k NOT IN ('code','label','network','address','enabled')) THEN RAISE EXCEPTION 'Only WLT-01 can be edited'; END IF;
  IF jsonb_typeof(p_wallet->'label') IS DISTINCT FROM 'string' OR length(p_wallet->>'label') > 40 OR jsonb_typeof(p_wallet->'address') IS DISTINCT FROM 'string' OR length(p_wallet->>'address') > 120 OR jsonb_typeof(p_wallet->'enabled') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Invalid wallet'; END IF;
  network_name := p_wallet->>'network'; wallet_address := p_wallet->>'address';
  IF COALESCE(network_name,'') NOT IN ('BEP20','TRC20','ERC20') THEN RAISE EXCEPTION 'Invalid network'; END IF;
  IF (p_wallet->>'enabled')::boolean AND ((network_name='TRC20' AND wallet_address !~ '^T[1-9A-HJ-NP-Za-km-z]{33}$') OR (network_name <> 'TRC20' AND wallet_address !~ '^0x[0-9a-fA-F]{40}$')) THEN RAISE EXCEPTION 'Address does not match network'; END IF;
  SELECT value INTO current_value FROM public.app_settings WHERE key='deposit_wallets' FOR UPDATE;
  SELECT ordinality::integer-1 INTO wallet_index FROM jsonb_array_elements(current_value->'wallets') WITH ORDINALITY w WHERE w.value->>'code'='WLT-01';
  IF wallet_index IS NULL THEN RAISE EXCEPTION 'WLT-01 unavailable'; END IF;
  UPDATE public.app_settings SET value=jsonb_set(current_value, ARRAY['wallets',wallet_index::text],p_wallet,false) WHERE key='deposit_wallets';
END;
$$;
REVOKE ALL ON FUNCTION public.bix_reviewer_save_wallet(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_reviewer_save_wallet(jsonb) TO authenticated;