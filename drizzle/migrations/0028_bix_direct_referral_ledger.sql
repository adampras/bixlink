CREATE TABLE public.bix_referral_bonuses (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), stake_id uuid NOT NULL UNIQUE REFERENCES public.bix_stakes(id), referrer_id uuid NOT NULL, member_id uuid NOT NULL, amount_bix numeric NOT NULL CHECK(amount_bix>0), rate_pct numeric NOT NULL CHECK(rate_pct>0 AND rate_pct<=100), status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')), created_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz, reviewed_by uuid);
GRANT SELECT ON public.bix_referral_bonuses TO authenticated;
GRANT ALL ON public.bix_referral_bonuses TO service_role;
ALTER TABLE public.bix_referral_bonuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or owner BIX bonus read" ON public.bix_referral_bonuses FOR SELECT TO authenticated USING(referrer_id=auth.uid() OR public.is_bix_admin());
CREATE INDEX bix_referral_bonuses_referrer_idx ON public.bix_referral_bonuses(referrer_id);
CREATE OR REPLACE FUNCTION public.bix_stake_bix(p_amount numeric,p_days int) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_bal numeric; new_id uuid; sponsor uuid; cfg jsonb; pct numeric;
BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
IF p_days IS NULL OR p_days NOT IN (30,90,180,360,540) THEN RAISE EXCEPTION 'Invalid lock period'; END IF;
IF p_amount IS NULL OR p_amount::text IN ('NaN','Infinity','-Infinity') OR p_amount<10 THEN RAISE EXCEPTION 'Minimum stake is 10 BIX'; END IF;
PERFORM pg_advisory_xact_lock(hashtext('bix'||auth.uid()::text));
SELECT bix_balance INTO v_bal FROM public.bix_asset_balances(auth.uid());
IF COALESCE(v_bal,0)<p_amount THEN RAISE EXCEPTION 'Insufficient BIX balance'; END IF;
INSERT INTO public.bix_stakes(user_id,amount_bix,apy,lock_days) VALUES(auth.uid(),p_amount,public.bix_stake_apy(p_amount,p_days),p_days) RETURNING id INTO new_id;
SELECT referred_by INTO sponsor FROM public.referral_codes WHERE user_id=auth.uid();
SELECT value INTO cfg FROM public.app_settings WHERE key='referrals';
pct:=LEAST(100,GREATEST(0,COALESCE((cfg->>'bixDirectPct')::numeric,(cfg->>'direct')::numeric,10)));
IF sponsor IS NOT NULL AND sponsor<>auth.uid() AND COALESCE((cfg->>'bixDirectEnabled')::boolean,true) AND pct>0 THEN
INSERT INTO public.bix_referral_bonuses(stake_id,referrer_id,member_id,amount_bix,rate_pct) VALUES(new_id,sponsor,auth.uid(),round(p_amount*pct/100,6),pct);
END IF;
RETURN new_id;
END $$;
REVOKE ALL ON FUNCTION public.bix_stake_bix(numeric,int) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bix_stake_bix(numeric,int) TO authenticated;
CREATE OR REPLACE FUNCTION public.bix_review_referral_bonus(p_bonus uuid,p_approve boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE b public.bix_referral_bonuses%ROWTYPE; v_owner uuid; v_balance numeric;
BEGIN
IF auth.uid() IS NULL OR NOT public.is_bix_admin() THEN RAISE EXCEPTION 'Owner access required'; END IF;
SELECT * INTO b FROM public.bix_referral_bonuses WHERE id=p_bonus AND status='pending' FOR UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'Bonus already reviewed or unavailable'; END IF;
IF p_approve THEN
IF NOT EXISTS(SELECT 1 FROM public.bix_stakes WHERE id=b.stake_id AND status IN ('active','completed')) THEN RAISE EXCEPTION 'Stake was unstaked early; reject this bonus'; END IF;
PERFORM pg_advisory_xact_lock(hashtext('bix'||auth.uid()::text));
SELECT owner_id,balance_bix INTO v_owner,v_balance FROM public.owner_bix_vault WHERE owner_id=auth.uid() FOR UPDATE;
IF v_owner IS NULL THEN RAISE EXCEPTION 'Owner reserve unavailable'; END IF;
IF v_balance<b.amount_bix OR COALESCE((SELECT bix_balance FROM public.bix_asset_balances(v_owner)),0)<b.amount_bix THEN RAISE EXCEPTION 'Insufficient owner BIX reserve'; END IF;
UPDATE public.owner_bix_vault SET balance_bix=balance_bix-b.amount_bix,updated_at=now() WHERE owner_id=v_owner;
END IF;
UPDATE public.bix_referral_bonuses SET status=CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,reviewed_at=now(),reviewed_by=auth.uid() WHERE id=b.id;
END $$;
REVOKE ALL ON FUNCTION public.bix_review_referral_bonus(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bix_review_referral_bonus(uuid,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.bix_asset_balances(p_user uuid) RETURNS TABLE(usdt_balance numeric,bix_balance numeric) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
SELECT CASE WHEN p_user=auth.uid() OR public.is_bix_admin() OR auth.uid() IS NULL AND current_user='postgres' THEN GREATEST(0,public.bix_wallet_balance(p_user)+COALESCE((SELECT SUM(CASE WHEN direction='BIX_TO_USDT' AND status='approved' THEN amount_out WHEN direction='USDT_TO_BIX' AND status IN ('pending','approved') THEN -amount_in ELSE 0 END) FROM public.swap_requests WHERE user_id=p_user),0)) ELSE NULL END,
CASE WHEN p_user=auth.uid() OR public.is_bix_admin() OR auth.uid() IS NULL AND current_user='postgres' THEN GREATEST(0,
COALESCE((SELECT SUM(CASE WHEN direction='USDT_TO_BIX' AND status='approved' THEN amount_out WHEN direction='BIX_TO_USDT' AND status IN ('pending','approved') THEN -amount_in ELSE 0 END) FROM public.swap_requests WHERE user_id=p_user),0)
+COALESCE((SELECT SUM(CASE WHEN recipient_id=p_user THEN amount_bix ELSE -amount_bix END) FROM public.bix_transfers WHERE status='completed' AND(sender_id=p_user OR recipient_id=p_user)),0)
+COALESCE((SELECT SUM(amount_bix) FROM public.bix_allocations WHERE user_id=p_user),0)
+COALESCE((SELECT balance_bix FROM public.owner_bix_vault WHERE owner_id=p_user AND EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_user AND role='admin')),0)
+COALESCE((SELECT SUM(amount_bix) FROM public.bix_referral_bonuses WHERE referrer_id=p_user AND status='approved'),0)
-COALESCE((SELECT SUM(CASE WHEN status='active' THEN amount_bix ELSE penalty_bix END) FROM public.bix_stakes WHERE user_id=p_user),0)) ELSE NULL END;
$$;
CREATE OR REPLACE FUNCTION public.bix_network_bix_metrics() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
WITH RECURSIVE tree AS (
SELECT r.user_id,r.referred_by,ARRAY[auth.uid(),r.user_id] AS path FROM public.referral_codes r WHERE r.referred_by=auth.uid() AND r.user_id<>auth.uid()
UNION ALL SELECT r.user_id,r.referred_by,t.path||r.user_id FROM public.referral_codes r JOIN tree t ON r.referred_by=t.user_id WHERE NOT r.user_id=ANY(t.path)
), summary AS (
SELECT s.user_id,sum(s.amount_bix) AS stake_bix,COALESCE(sum(s.amount_bix) FILTER(WHERE s.created_at>=(date_trunc('week',now() AT TIME ZONE 'Asia/Makassar') AT TIME ZONE 'Asia/Makassar')),0) AS weekly_bix FROM public.bix_stakes s WHERE s.status='active' GROUP BY s.user_id
), rows AS (
SELECT t.user_id,COALESCE(s.stake_bix,0) AS stake_bix,COALESCE(s.weekly_bix,0) AS weekly_bix,
COALESCE((SELECT sum(ds.stake_bix) FROM tree d JOIN summary ds ON ds.user_id=d.user_id WHERE d.path @> ARRAY[t.user_id]),0) AS turnover_bix,
COALESCE((SELECT sum(b.amount_bix) FROM public.bix_referral_bonuses b WHERE b.referrer_id=auth.uid() AND b.member_id=t.user_id AND b.status='approved'),0) AS direct_bonus_bix,
COALESCE((SELECT sum(b.amount_bix) FROM public.bix_referral_bonuses b WHERE b.referrer_id=auth.uid() AND b.member_id=t.user_id AND b.status='pending'),0) AS pending_bonus_bix
FROM tree t LEFT JOIN summary s ON s.user_id=t.user_id
)
SELECT COALESCE(jsonb_agg(to_jsonb(rows)),'[]'::jsonb) FROM rows;
$$;
REVOKE ALL ON FUNCTION public.bix_network_bix_metrics() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.bix_network_bix_metrics() TO authenticated;
COMMENT ON TABLE public.bix_referral_bonuses IS 'One direct bonus per BIX stake, owner-reviewed and funded from existing reserve. No projected APY settlement.';