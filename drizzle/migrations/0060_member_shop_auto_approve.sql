ALTER TABLE public.bix_member_products ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'General';
ALTER TABLE public.bix_member_products ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;
ALTER TABLE public.bix_member_products ADD COLUMN IF NOT EXISTS review_note text;
ALTER TABLE public.bix_member_products ADD COLUMN IF NOT EXISTS seller_tier text NOT NULL DEFAULT 'Bronze';

CREATE OR REPLACE FUNCTION public.bix_merchant_tier(p_user uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN s >= 10000 THEN 'Sovereign' WHEN s >= 1000 THEN 'Gold' WHEN s >= 500 THEN 'Silver' ELSE 'Bronze' END
  FROM (SELECT coalesce(sum(amount_usd),0) s FROM stakes WHERE user_id = p_user AND status = 'active') x
$$;
GRANT EXECUTE ON FUNCTION public.bix_merchant_tier(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_member_products_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cfg jsonb; auto boolean; maxp numeric; note text := NULL;
  banned text[] := ARRAY['guaranteed profit','investasi','investment','return','narkoba','drugs','weapon','senjata','casino','judi','gambling','replica','palsu','fake'];
  w text;
BEGIN
  IF public.is_bix_admin() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.user_id := auth.uid();
    IF (SELECT count(*) FROM bix_member_products WHERE user_id = auth.uid() AND status <> 'rejected') >= public.bix_member_shop_slots(auth.uid()) THEN
      RAISE EXCEPTION 'Product slot limit reached for your staking level';
    END IF;
  ELSE
    NEW.user_id := OLD.user_id;
  END IF;
  NEW.reviewed_at := NULL;
  NEW.seller_tier := public.bix_merchant_tier(NEW.user_id);
  SELECT value INTO cfg FROM app_settings WHERE key = 'member_shop';
  auto := coalesce((cfg->>'autoApprove')::boolean, true);
  maxp := coalesce((cfg->>'autoMaxPrice')::numeric, 5000);
  IF NEW.terms_accepted_at IS NULL THEN note := 'Seller terms not accepted';
  ELSIF length(trim(NEW.title)) < 3 THEN note := 'Product name too short';
  ELSIF length(trim(NEW.description)) < 20 THEN note := 'Description must be at least 20 characters';
  ELSIF NEW.image_url IS NULL THEN note := 'Product photo required';
  ELSIF NEW.price_usd < 1 OR NEW.price_usd > maxp THEN note := 'Price outside the automatic approval range';
  ELSIF NEW.order_url IS NOT NULL AND NEW.order_url !~ '^https://' THEN note := 'Order link must use https';
  END IF;
  IF note IS NULL THEN
    FOREACH w IN ARRAY banned LOOP
      IF lower(NEW.title || ' ' || NEW.description) LIKE '%' || w || '%' THEN note := 'Contains restricted wording: ' || w; EXIT; END IF;
    END LOOP;
  END IF;
  IF auto AND note IS NULL THEN NEW.status := 'approved'; NEW.reviewed_at := now(); NEW.review_note := 'Auto-approved';
  ELSE NEW.status := 'pending'; NEW.review_note := coalesce(note, 'Manual review'); END IF;
  RETURN NEW;
END $$;