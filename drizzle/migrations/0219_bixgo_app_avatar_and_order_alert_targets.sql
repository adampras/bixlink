ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bixgo_avatar_path text;

CREATE OR REPLACE FUNCTION public.bix_profile_set_app_avatar(p_app text, p_path text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF p_path IS NOT NULL AND (p_path NOT LIKE auth.uid()::text || '/%' OR length(p_path) > 200) THEN RAISE EXCEPTION 'Invalid photo'; END IF;
  IF p_app = 'bixtok' THEN UPDATE profiles SET bixtok_avatar_path = p_path WHERE user_id = auth.uid();
  ELSIF p_app = 'bixcall' THEN UPDATE profiles SET bixcall_avatar_path = p_path WHERE user_id = auth.uid();
  ELSIF p_app = 'bixgo' THEN UPDATE profiles SET bixgo_avatar_path = p_path WHERE user_id = auth.uid();
  ELSE RAISE EXCEPTION 'Invalid app'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.bix_profile_card(p_user uuid)
 RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object('user_id', p.user_id, 'name', coalesce(nullif(p.username,''), p.full_name, 'Member'), 'avatar_path', p.avatar_path,
    'bixtok_avatar_path', p.bixtok_avatar_path, 'bixcall_avatar_path', p.bixcall_avatar_path, 'bixgo_avatar_path', p.bixgo_avatar_path, 'status_text', p.status_text,
    'story', CASE WHEN EXISTS (SELECT 1 FROM bix_stories s WHERE s.user_id = p.user_id AND s.expires_at > now()) AND bix_story_can_view(auth.uid(), p.user_id)
      THEN CASE WHEN EXISTS (SELECT 1 FROM bix_stories s WHERE s.user_id = p.user_id AND s.expires_at > now() AND NOT EXISTS (SELECT 1 FROM bix_story_views v WHERE v.story_id = s.id AND v.viewer_id = auth.uid())) AND p.user_id <> auth.uid() THEN 'new' ELSE 'seen' END
      ELSE NULL END)
  FROM profiles p WHERE p.user_id = p_user AND auth.uid() IS NOT NULL;
$function$;

CREATE OR REPLACE FUNCTION public.bixgo_trip_driver(p_id uuid)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE d uuid;
BEGIN
 SELECT driver_user_id INTO d FROM public.bixgo_bookings WHERE id=p_id AND (user_id=auth.uid() OR driver_user_id=auth.uid() OR public.bix_is_owner1());
 IF d IS NULL THEN RETURN NULL; END IF;
 RETURN (SELECT jsonb_build_object('name',l.full_name,'vehicle_model',l.vehicle_model,'plate',l.plate,'license_id',l.id,'approved',l.status='approved','avatar_path',coalesce(p.bixgo_avatar_path,p.avatar_path),'rating',(SELECT round(avg(rating)::numeric,2) FROM public.bixgo_bookings WHERE driver_user_id=d AND rating IS NOT NULL),'rating_count',(SELECT count(rating) FROM public.bixgo_bookings WHERE driver_user_id=d AND rating IS NOT NULL)) FROM public.bixgo_driver_licenses l LEFT JOIN public.profiles p ON p.user_id=l.user_id WHERE l.user_id=d);
END $function$;

CREATE OR REPLACE FUNCTION public.bixgo_order_alert_targets(p_booking uuid)
RETURNS TABLE(user_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT l.user_id FROM public.bixgo_bookings b
  JOIN public.bixgo_driver_licenses l ON l.status='approved' AND l.online AND l.user_id<>b.user_id
  JOIN public.bixgo_dispatch_positions pos ON pos.user_id=l.user_id
  WHERE b.id=p_booking AND b.status='pending' AND b.driver_user_id IS NULL
    AND (b.service IN ('ride','car') OR (b.service IN ('food','send','mart') AND l.vehicle_type='moto'))
    AND public.bixgo_dispatch_matches(pos.lat,pos.lng,pos.updated_at,l.vehicle_type,l.city,b.pickup_lat,b.pickup_lng,b.city)
  LIMIT 30;
$$;
REVOKE ALL ON FUNCTION public.bixgo_order_alert_targets(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bixgo_order_alert_targets(uuid) TO service_role;