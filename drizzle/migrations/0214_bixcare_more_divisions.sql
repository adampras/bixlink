ALTER TABLE public.bixcare_outlets DROP CONSTRAINT bixcare_outlets_division_check;
ALTER TABLE public.bixcare_outlets ADD CONSTRAINT bixcare_outlets_division_check CHECK (division = ANY (ARRAY['auto','wash','laundry','rent','salon','clinic','catering']));
CREATE OR REPLACE FUNCTION public.bixcare_config() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT jsonb_build_object('rates', jsonb_build_object('auto',0.02,'rent',0.02,'wash',0.03,'laundry',0.03,'salon',0.03,'clinic',0.02,'catering',0.03),'min_gas_bix',20,'ref_share',0.2,'idr_per_usd',16000,'bix_usd',0.5)
    || COALESCE((SELECT value FROM public.app_settings WHERE key='bixcare'),'{}'::jsonb)
$$;