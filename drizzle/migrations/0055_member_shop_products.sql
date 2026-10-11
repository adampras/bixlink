CREATE TABLE public.bix_member_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 80),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 600),
  price_usd numeric NOT NULL CHECK (price_usd >= 0 AND price_usd <= 1000000),
  image_url text CHECK (image_url IS NULL OR image_url ~ '^(https://|data:image/)'),
  studio text NOT NULL DEFAULT 'obsidian' CHECK (studio IN ('obsidian','white','gold')),
  order_url text CHECK (order_url IS NULL OR order_url ~ '^https://'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bix_member_products TO authenticated;
GRANT SELECT ON public.bix_member_products TO anon;
GRANT ALL ON public.bix_member_products TO service_role;
ALTER TABLE public.bix_member_products ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.bix_member_shop_slots(p_user uuid)
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE cfg jsonb; staked numeric; slots int := 0; t jsonb;
BEGIN
  SELECT value INTO cfg FROM app_settings WHERE key = 'member_shop';
  cfg := coalesce(cfg, '{"enabled":true,"tiers":[{"min":100,"slots":2},{"min":500,"slots":5},{"min":1000,"slots":10},{"min":5000,"slots":25},{"min":10000,"slots":100}]}'::jsonb);
  IF coalesce((cfg->>'enabled')::boolean, true) = false THEN RETURN 0; END IF;
  IF cfg->'overrides' ? p_user::text THEN RETURN (cfg->'overrides'->>p_user::text)::int; END IF;
  SELECT coalesce(sum(amount_usd),0) INTO staked FROM stakes WHERE user_id = p_user AND status = 'active';
  FOR t IN SELECT * FROM jsonb_array_elements(coalesce(cfg->'tiers','[]'::jsonb)) LOOP
    IF staked >= (t->>'min')::numeric THEN slots := greatest(slots, (t->>'slots')::int); END IF;
  END LOOP;
  RETURN slots;
END $$;
GRANT EXECUTE ON FUNCTION public.bix_member_shop_slots(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.bix_member_products_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_bix_admin() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.user_id := auth.uid(); NEW.status := 'pending'; NEW.reviewed_at := NULL;
    IF (SELECT count(*) FROM bix_member_products WHERE user_id = auth.uid() AND status <> 'rejected') >= public.bix_member_shop_slots(auth.uid()) THEN
      RAISE EXCEPTION 'Product slot limit reached for your staking level';
    END IF;
  ELSE
    NEW.user_id := OLD.user_id; NEW.status := 'pending'; NEW.reviewed_at := NULL;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER bix_member_products_guard BEFORE INSERT OR UPDATE ON public.bix_member_products FOR EACH ROW EXECUTE FUNCTION public.bix_member_products_guard();

CREATE POLICY "Approved products are public" ON public.bix_member_products FOR SELECT TO anon, authenticated USING (status = 'approved');
CREATE POLICY "Owners see own products" ON public.bix_member_products FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_bix_admin());
CREATE POLICY "Members add own products" ON public.bix_member_products FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.is_bix_admin());
CREATE POLICY "Members edit own products" ON public.bix_member_products FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_bix_admin()) WITH CHECK (user_id = auth.uid() OR public.is_bix_admin());
CREATE POLICY "Members delete own products" ON public.bix_member_products FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_bix_admin());