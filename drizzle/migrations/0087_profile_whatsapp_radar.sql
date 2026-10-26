ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whatsapp text;
UPDATE public.profiles p SET whatsapp = u.raw_user_meta_data->>'whatsapp' FROM auth.users u WHERE u.id=p.user_id AND p.whatsapp IS NULL AND (u.raw_user_meta_data->>'whatsapp') ~ '^\+[0-9]{7,16}$';
CREATE OR REPLACE FUNCTION public.bix_profile_whatsapp_fill() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.whatsapp IS NULL THEN
    SELECT u.raw_user_meta_data->>'whatsapp' INTO NEW.whatsapp FROM auth.users u WHERE u.id=NEW.user_id;
  END IF;
  IF NEW.whatsapp IS NOT NULL AND NEW.whatsapp !~ '^\+[0-9]{7,16}$' THEN NEW.whatsapp := NULL; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS bix_profile_whatsapp_fill ON public.profiles;
CREATE TRIGGER bix_profile_whatsapp_fill BEFORE INSERT OR UPDATE OF whatsapp ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.bix_profile_whatsapp_fill();
CREATE OR REPLACE FUNCTION public.bix_growth_radar()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$ DECLARE result jsonb; BEGIN IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF; IF public.bix_growth_excluded(auth.uid()) OR EXISTS(SELECT 1 FROM public.bix_growth_control WHERE NOT radar_enabled) THEN RETURN '[]'::jsonb; END IF; SELECT COALESCE(jsonb_agg(x),'[]'::jsonb) INTO result FROM (SELECT r.code, p.full_name AS name, p.whatsapp, p.created_at AS joined_at, d.deposit_usd, s.last_activity, COALESCE(l.support_kind,'member') AS kind, COALESCE(l.virtual_usd*l.turnover_multiple,0) AS target, t.turnover FROM public.referral_codes r JOIN public.profiles p ON p.user_id=r.user_id LEFT JOIN public.bix_leaders l ON l.user_id=r.user_id AND l.status='approved' LEFT JOIN LATERAL (SELECT COALESCE(sum(amount_usd),0) deposit_usd FROM public.wallet_transactions WHERE user_id=r.user_id AND type='deposit' AND status='approved' AND verified_at IS NOT NULL AND tx_hash IS NOT NULL) d ON true LEFT JOIN LATERAL (SELECT GREATEST(p.created_at, max(created_at)) AS last_activity FROM public.wallet_transactions WHERE user_id=r.user_id) s ON true LEFT JOIN LATERAL (SELECT COALESCE(sum(st.amount_usd),0) turnover FROM public.stakes st JOIN public.referral_codes rc ON rc.user_id=st.user_id WHERE rc.referred_by=r.user_id AND st.status='active' AND NOT EXISTS(SELECT 1 FROM public.bix_clone_accounts b WHERE b.user_id=st.user_id)) t ON true WHERE r.referred_by=auth.uid() AND NOT public.bix_growth_excluded(r.user_id) AND NOT EXISTS(SELECT 1 FROM public.bix_clone_accounts b WHERE b.user_id=r.user_id) ORDER BY p.created_at DESC) x; RETURN result; END $function$;