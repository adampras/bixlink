CREATE OR REPLACE FUNCTION public.bix_public_activity()
RETURNS TABLE(kind text, amount_usd numeric, dial text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select * from (
    select 'stake'::text, s.amount_usd, left(coalesce(p.whatsapp,''),4), s.created_at
      from stakes s left join profiles p on p.user_id = s.user_id
     where s.status in ('active','completed') and not exists (select 1 from bix_clone_accounts c where c.user_id = s.user_id)
    union all
    select 'presale'::text, o.package_usd, left(coalesce(p.whatsapp,''),4), o.created_at
      from bix_presale_orders o left join profiles p on p.user_id = o.user_id
     where not exists (select 1 from bix_clone_accounts c where c.user_id = o.user_id)
  ) x order by 4 desc limit 12
$$;
REVOKE ALL ON FUNCTION public.bix_public_activity() FROM public;
GRANT EXECUTE ON FUNCTION public.bix_public_activity() TO anon, authenticated, service_role;