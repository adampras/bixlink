CREATE OR REPLACE FUNCTION public.bix_my_deposit_wallets()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object('code', w.code, 'label', w.label, 'network', w.network, 'asset', w.asset, 'address', w.address, 'enabled', true)), '[]'::jsonb)
  FROM public.bix_owner_deposit_wallets w
  WHERE auth.uid() IS NOT NULL AND w.enabled AND w.address <> ''
    AND w.owner_id = COALESCE(
      (SELECT ur.user_id FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'reviewer' LIMIT 1),
      public.bix_deposit_owner(auth.uid()));
$$;