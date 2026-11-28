ALTER TABLE public.stakes ADD COLUMN IF NOT EXISTS attributed_owner1 boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.bix_stake_attribution_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.attributed_owner1 := public.bix_growth_excluded(NEW.user_id) AND public.bix_deposit_owner(NEW.user_id) IS NULL;
  ELSE
    NEW.attributed_owner1 := OLD.attributed_owner1;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.bix_stake_attribution_guard() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS stakes_01_owner1_attribution ON public.stakes;
CREATE TRIGGER stakes_01_owner1_attribution BEFORE INSERT OR UPDATE ON public.stakes FOR EACH ROW EXECUTE FUNCTION public.bix_stake_attribution_guard();

CREATE OR REPLACE FUNCTION public.bix_team_sales_usd(p_user uuid) RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
WITH RECURSIVE tree AS (
 SELECT r.user_id,ARRAY[p_user,r.user_id] AS path FROM public.referral_codes r WHERE r.referred_by=p_user AND r.user_id<>p_user
 UNION ALL SELECT r.user_id,t.path||r.user_id FROM public.referral_codes r JOIN tree t ON r.referred_by=t.user_id WHERE NOT r.user_id=ANY(t.path)
)
SELECT COALESCE(SUM(s.amount_usd),0) FROM public.stakes s WHERE s.status='active' AND s.user_id IN (SELECT DISTINCT user_id FROM tree)
 AND NOT EXISTS(SELECT 1 FROM public.bix_clone_accounts c WHERE c.user_id=s.user_id)
 AND NOT (s.attributed_owner1 AND EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id=p_user AND ur.role='reviewer'));
$$;
REVOKE ALL ON FUNCTION public.bix_team_sales_usd(uuid) FROM PUBLIC,anon,authenticated;