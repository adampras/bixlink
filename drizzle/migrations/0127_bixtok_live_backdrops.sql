ALTER TABLE public.bixtok_lives ADD COLUMN IF NOT EXISTS cam_off boolean NOT NULL DEFAULT false, ADD COLUMN IF NOT EXISTS backdrop text;
ALTER TABLE public.bixtok_config ADD COLUMN IF NOT EXISTS live_backdrops jsonb NOT NULL DEFAULT '[]'::jsonb, ADD COLUMN IF NOT EXISTS backdrops_enabled boolean NOT NULL DEFAULT true;
CREATE OR REPLACE FUNCTION public.bixtok_live_backdrop(p_live uuid, p_cam_off boolean, p_backdrop text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF p_backdrop IS NOT NULL AND length(p_backdrop) > 300 THEN RAISE EXCEPTION 'Backdrop too long'; END IF;
  UPDATE public.bixtok_lives SET cam_off = coalesce(p_cam_off,false), backdrop = p_backdrop WHERE id = p_live AND status = 'live' AND (host_id = auth.uid() OR public.is_bix_admin());
  IF NOT FOUND THEN RAISE EXCEPTION 'Only the host can change the background'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.bixtok_live_backdrop(uuid,boolean,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bixtok_live_backdrop(uuid,boolean,text) TO authenticated;