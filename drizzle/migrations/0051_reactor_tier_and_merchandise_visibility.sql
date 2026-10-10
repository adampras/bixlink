CREATE POLICY "Public merchandise catalog" ON public.app_settings FOR SELECT TO anon, authenticated USING (key = 'merchandise_catalog');
CREATE OR REPLACE FUNCTION public.bix_mint_stake_nft() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE config jsonb; chosen jsonb; ordinal integer; card_tier text; art text;
BEGIN
 IF NEW.status = 'active' THEN
  card_tier := public.bix_nft_tier(NEW.amount_usd,NEW.lock_days);
  SELECT value INTO config FROM public.app_settings WHERE key = 'nft_catalog';
  SELECT count(*)::integer INTO ordinal FROM public.packages WHERE NOT retired AND (price_usd < NEW.amount_usd OR (price_usd = NEW.amount_usd AND id < NEW.package_id));
  IF config IS NOT NULL THEN
   SELECT item INTO chosen FROM jsonb_array_elements(config->'items') WITH ORDINALITY AS e(item,n) WHERE item->>'theme' = 'REACTOR' AND item->>'tier' = card_tier AND COALESCE((item->>'enabled')::boolean,false) ORDER BY n OFFSET (ordinal % GREATEST(1,(SELECT count(*) FROM jsonb_array_elements(config->'items') i WHERE i->>'theme' = 'REACTOR' AND i->>'tier' = card_tier AND COALESCE((i->>'enabled')::boolean,false)))) LIMIT 1;
  ELSE art := 'glass-' || lower(card_tier); END IF;
  INSERT INTO public.bix_nft_cards(user_id,stake_id,package_id,tier,value_usd,lock_days,artwork_id,artwork_image_path) VALUES(NEW.user_id,NEW.id,NEW.package_id,card_tier,NEW.amount_usd,NEW.lock_days,COALESCE(chosen->>'id',art),chosen->>'imagePath') ON CONFLICT(stake_id) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;