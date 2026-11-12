CREATE TABLE public.bix_stake_tier_bonus (
  user_id uuid PRIMARY KEY,
  tier_usd numeric NOT NULL,
  paid_bix numeric NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bix_stake_tier_bonus TO authenticated;
GRANT ALL ON public.bix_stake_tier_bonus TO service_role;
ALTER TABLE public.bix_stake_tier_bonus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tier bonus own read" ON public.bix_stake_tier_bonus FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_bix_admin());

CREATE OR REPLACE FUNCTION public.bix_stake_tier_award(p_user uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_max numeric; v_tier numeric; v_bix numeric; v_paid numeric;
BEGIN
  SELECT COALESCE(MAX(amount_usd),0) INTO v_max FROM public.stakes WHERE user_id = p_user AND status = 'active' AND funded_vusdt = false;
  IF v_max >= 1000 THEN v_tier := 1000; v_bix := 100; ELSIF v_max >= 500 THEN v_tier := 500; v_bix := 50; ELSE RETURN; END IF;
  SELECT paid_bix INTO v_paid FROM public.bix_stake_tier_bonus WHERE user_id = p_user FOR UPDATE;
  v_paid := COALESCE(v_paid, 0);
  IF v_bix <= v_paid THEN RETURN; END IF;
  INSERT INTO public.bix_allocations(user_id, amount_bix, note, created_by) VALUES (p_user, v_bix - v_paid, 'Stake tier bonus $' || v_tier, p_user);
  INSERT INTO public.bix_stake_tier_bonus(user_id, tier_usd, paid_bix) VALUES (p_user, v_tier, v_bix)
    ON CONFLICT (user_id) DO UPDATE SET tier_usd = EXCLUDED.tier_usd, paid_bix = EXCLUDED.paid_bix, updated_at = now();
END $$;
REVOKE ALL ON FUNCTION public.bix_stake_tier_award(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bix_stake_tier_trg() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.bix_stake_tier_award(NEW.user_id); RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.bix_stake_tier_trg() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER bix_stake_tier_on_stake AFTER INSERT OR UPDATE OF status ON public.stakes FOR EACH ROW WHEN (NEW.status = 'active') EXECUTE FUNCTION public.bix_stake_tier_trg();