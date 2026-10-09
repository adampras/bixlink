ALTER TABLE public.bix_nft_cards ADD COLUMN IF NOT EXISTS artwork_id text;
ALTER TABLE public.bix_nft_cards ADD COLUMN IF NOT EXISTS artwork_image_path text;
CREATE POLICY "Public NFT catalog settings" ON public.app_settings FOR SELECT TO anon, authenticated USING (key = 'nft_catalog');
CREATE POLICY "Published NFT catalog images" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'bix-content' AND EXISTS (SELECT 1 FROM public.app_settings s, jsonb_array_elements(s.value->'items') item WHERE s.key = 'nft_catalog' AND COALESCE((item->>'enabled')::boolean, true) AND item->>'imagePath' = name));
CREATE OR REPLACE FUNCTION public.bix_mint_stake_nft() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE config jsonb; chosen jsonb; ordinal integer; art text; image_path text;
BEGIN
 IF NEW.status = 'active' THEN
  SELECT value INTO config FROM public.app_settings WHERE key = 'nft_catalog';
  SELECT count(*)::integer INTO ordinal FROM public.packages WHERE NOT retired AND (price_usd < NEW.amount_usd OR (price_usd = NEW.amount_usd AND id < NEW.package_id));
  ordinal := ordinal * 5 + COALESCE(array_position(ARRAY[30,60,90,180,360],NEW.lock_days),1) - 1;
  IF config IS NOT NULL THEN
   SELECT item INTO chosen FROM jsonb_array_elements(config->'items') WITH ORDINALITY AS e(item,n) WHERE COALESCE((item->>'enabled')::boolean,true) ORDER BY n OFFSET (ordinal % GREATEST(1,(SELECT count(*) FROM jsonb_array_elements(config->'items') i WHERE COALESCE((i->>'enabled')::boolean,true)))) LIMIT 1;
   art := chosen->>'id'; image_path := chosen->>'imagePath';
  ELSE art := 'nft-' || lpad(((ordinal % 100)+1)::text,3,'0'); END IF;
  INSERT INTO public.bix_nft_cards(user_id,stake_id,package_id,tier,value_usd,lock_days,artwork_id,artwork_image_path) VALUES(NEW.user_id,NEW.id,NEW.package_id,public.bix_nft_tier(NEW.amount_usd,NEW.lock_days),NEW.amount_usd,NEW.lock_days,art,image_path) ON CONFLICT(stake_id) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
COMMENT ON COLUMN public.bix_nft_cards.artwork_id IS 'Presentation-only artwork snapshot; existing certificate values and buyback terms unchanged';