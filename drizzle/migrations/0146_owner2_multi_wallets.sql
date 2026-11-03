ALTER TABLE public.bix_owner_deposit_wallets ADD COLUMN IF NOT EXISTS extra_wallets jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE OR REPLACE FUNCTION public.bix_owner_wallets_save_extra(p_wallets jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE w jsonb; out jsonb := '[]'::jsonb; i int := 0; pre text; net text; ast text; addr text; en boolean; md text;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'reviewer') THEN RAISE EXCEPTION 'Owner 2 access required'; END IF;
  IF jsonb_typeof(p_wallets) <> 'array' OR jsonb_array_length(p_wallets) > 10 THEN RAISE EXCEPTION 'Maximum 10 wallets'; END IF;
  pre := 'OX' || upper(substr(replace(auth.uid()::text,'-',''),1,5)) || '-';
  FOR w IN SELECT * FROM jsonb_array_elements(p_wallets) LOOP
    i := i + 1;
    net := w->>'network'; ast := coalesce(w->>'asset','USDT'); addr := trim(coalesce(w->>'address','')); en := coalesce((w->>'enabled')::boolean,false); md := coalesce(w->>'mode','both');
    IF net NOT IN ('BEP20','TRC20','ERC20') OR ast NOT IN ('USDT','USDC') OR md NOT IN ('both','flex','unique') OR length(coalesce(w->>'label','')) > 40 OR length(addr) > 120 THEN RAISE EXCEPTION 'Invalid wallet %', i; END IF;
    IF en AND ((net = 'TRC20' AND addr !~ '^T[1-9A-HJ-NP-Za-km-z]{33}$') OR (net <> 'TRC20' AND addr !~ '^0x[0-9a-fA-F]{40}$')) THEN RAISE EXCEPTION 'Wallet % address does not match %', i, net; END IF;
    out := out || jsonb_build_array(jsonb_build_object('code', pre || lpad(i::text,2,'0'), 'label', coalesce(w->>'label',''), 'network', net, 'asset', ast, 'address', addr, 'enabled', en, 'mode', md));
  END LOOP;
  INSERT INTO public.bix_owner_deposit_wallets(owner_id, code, extra_wallets, updated_at)
  VALUES (auth.uid(), 'OWN-' || upper(substr(replace(auth.uid()::text,'-',''),1,6)), out, now())
  ON CONFLICT (owner_id) DO UPDATE SET extra_wallets = EXCLUDED.extra_wallets, updated_at = now();
  RETURN out;
END $$;
REVOKE ALL ON FUNCTION public.bix_owner_wallets_save_extra(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bix_owner_wallets_save_extra(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_my_deposit_wallets()
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  WITH o AS (
    SELECT w.* FROM public.bix_owner_deposit_wallets w
    WHERE auth.uid() IS NOT NULL AND w.owner_id = COALESCE(
      (SELECT ur.user_id FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'reviewer' LIMIT 1),
      public.bix_deposit_owner(auth.uid()))
  ), rows AS (
    SELECT jsonb_build_object('code', code, 'label', label, 'network', network, 'asset', asset, 'address', address, 'enabled', true, 'mode', 'flex') j FROM o WHERE enabled AND address <> ''
    UNION ALL
    SELECT jsonb_build_object('code', unique_code, 'label', unique_label, 'network', unique_network, 'asset', unique_asset, 'address', unique_address, 'enabled', true, 'mode', 'unique') FROM o WHERE unique_enabled AND unique_address <> '' AND unique_code IS NOT NULL
    UNION ALL
    SELECT e FROM o, jsonb_array_elements(o.extra_wallets) e WHERE (e->>'enabled')::boolean AND coalesce(e->>'address','') <> ''
  )
  SELECT COALESCE(jsonb_agg(j), '[]'::jsonb) FROM rows;
$function$;