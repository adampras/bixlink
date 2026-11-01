DROP FUNCTION IF EXISTS public.bix_public_activity();
CREATE FUNCTION public.bix_public_activity()
RETURNS TABLE(kind text, amount_usd numeric, dial text, created_at timestamptz, member text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select x.kind, x.amt, left(coalesce(p.whatsapp,''),4), x.ts,
         case when length(coalesce(p.username,'')) >= 2 then left(p.username,1) || '***' || right(p.username,1) else 'M***' end
  from (
    select 'stake'::text kind, s.amount_usd amt, s.user_id uid, s.created_at ts from stakes s where s.status in ('active','completed')
    union all
    select 'deposit', t.amount_usd, t.user_id, t.created_at from wallet_transactions t where t.type='deposit' and t.status='approved'
  ) x left join profiles p on p.user_id = x.uid
  where x.amt > 0 and not exists (select 1 from bix_clone_accounts c where c.user_id = x.uid)
  order by x.ts desc limit 20
$$;
REVOKE ALL ON FUNCTION public.bix_public_activity() FROM public;
GRANT EXECUTE ON FUNCTION public.bix_public_activity() TO anon, authenticated, service_role;