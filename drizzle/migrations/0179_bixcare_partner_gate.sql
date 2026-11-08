CREATE OR REPLACE FUNCTION public.bixcare_partner_gate()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE cfg jsonb; v_promo boolean; v_min numeric; v_staked numeric := 0;
BEGIN
  SELECT value INTO cfg FROM app_settings WHERE key='bixcare_partner_gate';
  v_promo := COALESCE((cfg->>'promo_free')::boolean, true);
  v_min := COALESCE((cfg->>'min_stake_usd')::numeric, 100);
  IF auth.uid() IS NOT NULL THEN
    SELECT COALESCE(sum(amount_usd),0) INTO v_staked FROM stakes WHERE user_id=auth.uid() AND status='active';
  END IF;
  RETURN jsonb_build_object('promo_free',v_promo,'min_stake_usd',v_min,'staked_usd',v_staked,
    'allowed', v_promo OR v_staked >= v_min OR public.bix_is_owner1());
END $$;
GRANT EXECUTE ON FUNCTION public.bixcare_partner_gate() TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.bixcare_set_partner_gate(p_promo boolean, p_min numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.bix_is_owner1() THEN RAISE EXCEPTION 'Owner 1 only'; END IF;
  IF p_min < 0 OR p_min > 1000000 THEN RAISE EXCEPTION 'Invalid minimum'; END IF;
  INSERT INTO app_settings(key,value) VALUES ('bixcare_partner_gate', jsonb_build_object('promo_free',p_promo,'min_stake_usd',p_min))
  ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value;
END $$;
REVOKE ALL ON FUNCTION public.bixcare_set_partner_gate(boolean,numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bixcare_set_partner_gate(boolean,numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.bixcare_outlet_gate_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT ((public.bixcare_partner_gate())->>'allowed')::boolean THEN
    RAISE EXCEPTION 'Pendaftaran mitra BIXCARE membutuhkan paket staking aktif minimal $%', (public.bixcare_partner_gate())->>'min_stake_usd';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS bixcare_outlet_gate_guard ON public.bixcare_outlets;
CREATE TRIGGER bixcare_outlet_gate_guard BEFORE INSERT ON public.bixcare_outlets FOR EACH ROW EXECUTE FUNCTION public.bixcare_outlet_gate_guard();