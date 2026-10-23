CREATE OR REPLACE FUNCTION public.bix_grant_welcome(p_user uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_amt numeric;
BEGIN
  IF p_user IS NULL THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user AND email_confirmed_at IS NOT NULL) THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.bix_clone_accounts WHERE user_id = p_user) THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.bix_quest_claims WHERE user_id = p_user AND quest_key = 'welcome') THEN RETURN; END IF;
  v_amt := GREATEST(COALESCE((public.bix_arena_config()->'rewards'->>'welcome')::numeric, 100), 0);
  IF v_amt <= 0 THEN RETURN; END IF;
  INSERT INTO public.bix_quest_claims(user_id, quest_key, period_key, amount_vbix) VALUES (p_user, 'welcome', 'once', v_amt);
END $$;
REVOKE ALL ON FUNCTION public.bix_grant_welcome(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.bix_welcome_trigger() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL THEN
    BEGIN PERFORM public.bix_grant_welcome(NEW.id); EXCEPTION WHEN OTHERS THEN NULL; END;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS bix_welcome_on_confirm ON auth.users;
CREATE TRIGGER bix_welcome_on_confirm AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW EXECUTE FUNCTION public.bix_welcome_trigger();

DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT u.id FROM auth.users u WHERE u.email_confirmed_at IS NOT NULL LOOP
    BEGIN PERFORM public.bix_grant_welcome(r.id); EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;
END $$;