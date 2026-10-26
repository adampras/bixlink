ALTER TABLE public.swap_requests ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'swap';
CREATE OR REPLACE FUNCTION public.bix_auto_approve_swap() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN IF NEW.channel = 'buyback' THEN NEW.status := 'pending'; RETURN NEW; END IF;
NEW.status := 'approved'; NEW.reviewed_at := now(); RETURN NEW; END $$;

CREATE TABLE public.bix_buyback_details (
  swap_id uuid PRIMARY KEY REFERENCES public.swap_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  contact_method text NOT NULL CHECK (contact_method IN ('email','telegram','whatsapp')),
  contact_value text NOT NULL,
  source jsonb NOT NULL DEFAULT '{}'::jsonb,
  review_note text,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bix_buyback_details TO authenticated;
GRANT ALL ON public.bix_buyback_details TO service_role;
ALTER TABLE public.bix_buyback_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or owner reads buyback" ON public.bix_buyback_details FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_bix_admin() OR public.bix_reviewer_can('market'));

CREATE OR REPLACE FUNCTION public.bix_buyback_source(p_user uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
SELECT jsonb_build_object(
 'staking_profit', COALESCE((SELECT SUM(amount_bix) FROM bix_stake_profit_withdrawals WHERE user_id=p_user AND asset='BIX'),0),
 'network_bonus', COALESCE((SELECT SUM(bix_amount) FROM bix_usdt_network_bonuses WHERE user_id=p_user),0)
   + COALESCE((SELECT SUM(amount_bix) FROM bix_referral_bonuses WHERE referrer_id=p_user AND status='approved'),0),
 'vip_reward', COALESCE((SELECT SUM(amount_bix) FROM bix_vip_rewards WHERE user_id=p_user AND status='approved'),0),
 'swap_bought', COALESCE((SELECT SUM(amount_out) FROM swap_requests WHERE user_id=p_user AND direction='USDT_TO_BIX' AND status='approved'),0),
 'allocation', COALESCE((SELECT SUM(amount_bix) FROM bix_allocations WHERE user_id=p_user),0),
 'transfer_in', COALESCE((SELECT SUM(amount_bix) FROM bix_transfers WHERE recipient_id=p_user AND status='completed'),0),
 'p2p_net', public.bix_p2p_bix_delta(p_user),
 'real_deposit_usd', COALESCE((SELECT SUM(amount_usd) FROM wallet_transactions WHERE user_id=p_user AND type='deposit' AND status='approved' AND tx_hash IS NOT NULL),0),
 'is_clone', EXISTS(SELECT 1 FROM bix_clone_accounts WHERE user_id=p_user)
) $$;
REVOKE ALL ON FUNCTION public.bix_buyback_source(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bix_buyback_request(p_amount numeric, p_method text, p_contact text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid := auth.uid(); v_bal numeric; v_id uuid;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 IF p_amount IS NULL OR p_amount < 1 OR p_amount > 1000000 THEN RAISE EXCEPTION 'Amount must be 1 – 1,000,000 BIX'; END IF;
 IF p_method NOT IN ('email','telegram','whatsapp') OR length(trim(coalesce(p_contact,''))) < 3 OR length(p_contact) > 120 THEN RAISE EXCEPTION 'Choose a confirmation contact'; END IF;
 IF (SELECT count(*) FROM swap_requests WHERE user_id=v_user AND channel='buyback' AND status='pending') >= 3 THEN RAISE EXCEPTION 'You already have 3 pending buyback requests'; END IF;
 SELECT bix_balance INTO v_bal FROM public.bix_asset_balances(v_user);
 IF COALESCE(v_bal,0) < p_amount THEN RAISE EXCEPTION 'Insufficient BIX balance'; END IF;
 INSERT INTO swap_requests(user_id, direction, amount_in, amount_out, price_usd, status, channel)
 VALUES (v_user, 'BIX_TO_USDT', p_amount, round(p_amount*0.25, 6), 0.25, 'pending', 'buyback') RETURNING id INTO v_id;
 INSERT INTO bix_buyback_details(swap_id, user_id, contact_method, contact_value, source)
 VALUES (v_id, v_user, p_method, trim(p_contact), public.bix_buyback_source(v_user));
 RETURN v_id;
END $$;
GRANT EXECUTE ON FUNCTION public.bix_buyback_request(numeric, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_buyback_review(p_id uuid, p_approve boolean, p_note text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NOT (public.is_bix_admin() OR public.bix_reviewer_can('market')) THEN RAISE EXCEPTION 'Owner only'; END IF;
 UPDATE swap_requests SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END, reviewed_at = now()
  WHERE id=p_id AND channel='buyback' AND status='pending';
 IF NOT FOUND THEN RAISE EXCEPTION 'Request is no longer pending'; END IF;
 UPDATE bix_buyback_details SET reviewed_by = auth.uid(), review_note = left(p_note, 200) WHERE swap_id = p_id;
END $$;
GRANT EXECUTE ON FUNCTION public.bix_buyback_review(uuid, boolean, text) TO authenticated;