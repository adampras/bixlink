CREATE TABLE public.bix_vip_rewards (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, level int NOT NULL CHECK(level BETWEEN 1 AND 10), target_usd numeric NOT NULL, team_sales_usd numeric NOT NULL, amount_bix numeric NOT NULL CHECK(amount_bix>0), status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')), created_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz, reviewed_by uuid, UNIQUE(user_id,level));
GRANT SELECT ON public.bix_vip_rewards TO authenticated;
GRANT ALL ON public.bix_vip_rewards TO service_role;
ALTER TABLE public.bix_vip_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or owner VIP read" ON public.bix_vip_rewards FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.is_bix_admin());

CREATE OR REPLACE FUNCTION public.bix_vip_tiers() RETURNS TABLE(level int,target_usd numeric,reward_bix numeric) LANGUAGE sql IMMUTABLE AS $$
SELECT * FROM (VALUES (1,5000::numeric,1000::numeric),(2,10000,2500),(3,30000,10000),(4,50000,15000),(5,100000,20000),(6,200000,25000),(7,300000,50000),(8,500000,100000),(9,1000000,200000),(10,5000000,500000)) t(level,target_usd,reward_bix);
$$;

CREATE OR REPLACE FUNCTION public.bix_team_sales_usd(p_user uuid) RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
WITH RECURSIVE tree AS (
 SELECT r.user_id,ARRAY[p_user,r.user_id] AS path FROM public.referral_codes r WHERE r.referred_by=p_user AND r.user_id<>p_user
 UNION ALL SELECT r.user_id,t.path||r.user_id FROM public.referral_codes r JOIN tree t ON r.referred_by=t.user_id WHERE NOT r.user_id=ANY(t.path)
)
SELECT COALESCE(SUM(s.amount_usd),0) FROM public.stakes s WHERE s.status='active' AND s.user_id IN (SELECT DISTINCT user_id FROM tree)
 AND NOT EXISTS(SELECT 1 FROM public.bix_clone_accounts c WHERE c.user_id=s.user_id);
$$;
REVOKE ALL ON FUNCTION public.bix_team_sales_usd(uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.bix_vip_status() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_sales numeric;
BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
v_sales := public.bix_team_sales_usd(auth.uid());
RETURN jsonb_build_object('teamSalesUsd',v_sales,'tiers',(SELECT jsonb_agg(jsonb_build_object('level',t.level,'targetUsd',t.target_usd,'rewardBix',t.reward_bix,'qualified',v_sales>=t.target_usd,'status',r.status) ORDER BY t.level) FROM public.bix_vip_tiers() t LEFT JOIN public.bix_vip_rewards r ON r.user_id=auth.uid() AND r.level=t.level));
END $$;
REVOKE ALL ON FUNCTION public.bix_vip_status() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bix_vip_status() TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_claim_vip(p_level int) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE t record; v_sales numeric; new_id uuid;
BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
SELECT * INTO t FROM public.bix_vip_tiers() x WHERE x.level=p_level;
IF NOT FOUND THEN RAISE EXCEPTION 'Invalid VIP level'; END IF;
IF EXISTS(SELECT 1 FROM public.bix_vip_rewards WHERE user_id=auth.uid() AND level=p_level AND status IN ('pending','approved')) THEN RAISE EXCEPTION 'VIP reward already claimed'; END IF;
v_sales := public.bix_team_sales_usd(auth.uid());
IF v_sales<t.target_usd THEN RAISE EXCEPTION 'Team sales target not reached'; END IF;
INSERT INTO public.bix_vip_rewards(user_id,level,target_usd,team_sales_usd,amount_bix) VALUES(auth.uid(),p_level,t.target_usd,v_sales,t.reward_bix)
 ON CONFLICT(user_id,level) DO UPDATE SET status='pending',team_sales_usd=EXCLUDED.team_sales_usd,created_at=now(),reviewed_at=NULL,reviewed_by=NULL WHERE bix_vip_rewards.status='rejected'
 RETURNING id INTO new_id;
IF new_id IS NULL THEN RAISE EXCEPTION 'VIP reward already claimed'; END IF;
RETURN new_id;
END $$;
REVOKE ALL ON FUNCTION public.bix_claim_vip(int) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bix_claim_vip(int) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_review_vip(p_reward uuid,p_approve boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE b public.bix_vip_rewards%ROWTYPE; v_owner uuid; v_balance numeric;
BEGIN
IF auth.uid() IS NULL OR NOT public.is_bix_admin() THEN RAISE EXCEPTION 'Owner access required'; END IF;
SELECT * INTO b FROM public.bix_vip_rewards WHERE id=p_reward AND status='pending' FOR UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'Reward already reviewed or unavailable'; END IF;
IF p_approve THEN
PERFORM pg_advisory_xact_lock(hashtext('bix'||auth.uid()::text));
SELECT owner_id,balance_bix INTO v_owner,v_balance FROM public.owner_bix_vault WHERE owner_id=auth.uid() FOR UPDATE;
IF v_owner IS NULL THEN RAISE EXCEPTION 'Owner reserve unavailable'; END IF;
IF v_balance<b.amount_bix OR COALESCE((SELECT bix_balance FROM public.bix_asset_balances(v_owner)),0)<b.amount_bix THEN RAISE EXCEPTION 'Insufficient owner BIX reserve'; END IF;
UPDATE public.owner_bix_vault SET balance_bix=balance_bix-b.amount_bix,updated_at=now() WHERE owner_id=v_owner;
END IF;
UPDATE public.bix_vip_rewards SET status=CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,reviewed_at=now(),reviewed_by=auth.uid() WHERE id=b.id;
END $$;
REVOKE ALL ON FUNCTION public.bix_review_vip(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bix_review_vip(uuid,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_asset_balances(p_user uuid) RETURNS TABLE(usdt_balance numeric,bix_balance numeric) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
SELECT CASE WHEN p_user=auth.uid() OR public.is_bix_admin() OR auth.uid() IS NULL AND current_user='postgres' THEN GREATEST(0,public.bix_wallet_balance(p_user)+COALESCE((SELECT SUM(CASE WHEN direction='BIX_TO_USDT' AND status='approved' THEN amount_out WHEN direction='USDT_TO_BIX' AND status IN ('pending','approved') THEN -amount_in ELSE 0 END) FROM public.swap_requests WHERE user_id=p_user),0)) ELSE NULL END,
CASE WHEN p_user=auth.uid() OR public.is_bix_admin() OR auth.uid() IS NULL AND current_user='postgres' THEN GREATEST(0,
COALESCE((SELECT SUM(CASE WHEN direction='USDT_TO_BIX' AND status='approved' THEN amount_out WHEN direction='BIX_TO_USDT' AND status IN ('pending','approved') THEN -amount_in ELSE 0 END) FROM public.swap_requests WHERE user_id=p_user),0)
+COALESCE((SELECT SUM(CASE WHEN recipient_id=p_user THEN amount_bix ELSE -amount_bix END) FROM public.bix_transfers WHERE status='completed' AND(sender_id=p_user OR recipient_id=p_user)),0)
+COALESCE((SELECT SUM(amount_bix) FROM public.bix_allocations WHERE user_id=p_user),0)
+COALESCE((SELECT balance_bix FROM public.owner_bix_vault WHERE owner_id=p_user AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_user AND role='admin')),0)
+COALESCE((SELECT SUM(amount_bix) FROM public.bix_referral_bonuses WHERE referrer_id=p_user AND status='approved'),0)
+COALESCE((SELECT SUM(amount_bix) FROM public.bix_vip_rewards WHERE user_id=p_user AND status='approved'),0)
-COALESCE((SELECT SUM(CASE WHEN status='active' THEN amount_bix ELSE penalty_bix END) FROM public.bix_stakes WHERE user_id=p_user),0)) ELSE NULL END;
$$;