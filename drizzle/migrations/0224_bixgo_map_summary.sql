ALTER TABLE public.bixgo_map_points ADD COLUMN claim_id uuid REFERENCES public.bixgo_map_claims(id);
CREATE OR REPLACE FUNCTION public.bixgo_map_claim() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE total numeric:=0; alloc uuid; claim uuid; BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
PERFORM pg_advisory_xact_lock(hashtext('bixgo_map_claim:'||auth.uid()::text));
PERFORM 1 FROM public.bixgo_map_points WHERE user_id=auth.uid() AND status IN ('approved','archived') AND claimed_at IS NULL FOR UPDATE;
SELECT coalesce(sum(reward_bix),0) INTO total FROM public.bixgo_map_points WHERE user_id=auth.uid() AND status IN ('approved','archived') AND claimed_at IS NULL;
IF total<=0 THEN RETURN jsonb_build_object('claimed',0); END IF;
INSERT INTO public.bix_allocations(user_id,amount_bix,note,created_by) VALUES(auth.uid(),total,'Marketing & Community: BIXGO map rewards',auth.uid()) RETURNING id INTO alloc;
INSERT INTO public.bixgo_map_claims(user_id,amount_bix,allocation_id) VALUES(auth.uid(),total,alloc) RETURNING id INTO claim;
UPDATE public.bixgo_map_points SET claimed_at=now(),claim_id=claim WHERE user_id=auth.uid() AND status IN ('approved','archived') AND claimed_at IS NULL;
RETURN jsonb_build_object('claimed',total); END $$;
CREATE FUNCTION public.bixgo_map_summary() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$ DECLARE result jsonb; BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
SELECT jsonb_build_object('available',coalesce(sum(reward_bix) FILTER(WHERE status IN ('approved','archived') AND claimed_at IS NULL),0),'pending',coalesce(sum(reward_bix) FILTER(WHERE status='pending'),0),'transferred',coalesce(sum(reward_bix) FILTER(WHERE claimed_at IS NOT NULL),0),'approved',count(*) FILTER(WHERE status IN ('approved','archived')),'submitted',count(*),'map_used',CASE WHEN public.bix_is_owner1() THEN (SELECT coalesce(sum(reward_bix),0) FROM public.bixgo_map_points WHERE status IN ('approved','archived')) ELSE 0 END,'pool_used',CASE WHEN public.bix_is_owner1() THEN public.bixgo_map_pool_used() ELSE 0 END) INTO result FROM public.bixgo_map_points WHERE user_id=auth.uid(); RETURN result; END $$;
REVOKE ALL ON FUNCTION public.bixgo_map_summary() FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.bixgo_map_summary() TO authenticated;
DROP POLICY map_photo_delete ON storage.objects;
CREATE POLICY map_photo_delete ON storage.objects FOR DELETE TO authenticated USING(bucket_id='bixgo-map' AND (storage.foldername(name))[1]=auth.uid()::text AND NOT EXISTS(SELECT 1 FROM public.bixgo_map_points p WHERE p.photo_path=storage.objects.name));
COMMENT ON COLUMN public.bixgo_map_points.allocation_id IS 'DEPRECATED: use claim_id to resolve the shared allocation through bixgo_map_claims.';