ALTER TABLE public.bix_kyc_rewards ALTER COLUMN amount SET DEFAULT 20;
ALTER TABLE public.bix_kyc_rewards ADD COLUMN IF NOT EXISTS unlocked_at timestamptz;

CREATE OR REPLACE FUNCTION public.bix_kyc_try_unlock(p_user uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.bix_kyc_rewards;
BEGIN
  SELECT * INTO r FROM public.bix_kyc_rewards WHERE user_id = p_user AND locked FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.stakes WHERE user_id = p_user AND status = 'active' AND funded_vusdt = false AND amount_usd >= 100) THEN RETURN; END IF;
  UPDATE public.bix_kyc_rewards SET locked = false, unlocked_at = now() WHERE user_id = p_user;
  INSERT INTO public.bix_allocations(user_id, amount_bix, note, created_by) VALUES (p_user, r.amount, 'KYC welcome reward unlocked (active stake >= $100)', p_user);
END $$;
REVOKE ALL ON FUNCTION public.bix_kyc_try_unlock(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bix_kyc_unlock_trg() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.bix_kyc_try_unlock(NEW.user_id); RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.bix_kyc_unlock_trg() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER bix_kyc_unlock_on_stake AFTER INSERT OR UPDATE OF status ON public.stakes FOR EACH ROW WHEN (NEW.status = 'active') EXECUTE FUNCTION public.bix_kyc_unlock_trg();
CREATE TRIGGER bix_kyc_unlock_on_reward AFTER INSERT ON public.bix_kyc_rewards FOR EACH ROW EXECUTE FUNCTION public.bix_kyc_unlock_trg();

DO $$ DECLARE u uuid; BEGIN FOR u IN SELECT user_id FROM public.bix_kyc_rewards WHERE locked LOOP PERFORM public.bix_kyc_try_unlock(u); END LOOP; END $$;