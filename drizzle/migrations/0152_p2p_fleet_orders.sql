CREATE TABLE public.bix_fleet_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  merchant text NOT NULL,
  price numeric NOT NULL,
  usdt numeric NOT NULL DEFAULT 0,
  bix numeric NOT NULL DEFAULT 0,
  wallet_code text NOT NULL,
  address text NOT NULL,
  tx_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  credited_at timestamptz
);
CREATE UNIQUE INDEX bix_fleet_orders_tx ON public.bix_fleet_orders (lower(tx_hash));
GRANT SELECT ON public.bix_fleet_orders TO authenticated;
GRANT ALL ON public.bix_fleet_orders TO service_role;
ALTER TABLE public.bix_fleet_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or owner1 reads fleet orders" ON public.bix_fleet_orders FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.bix_is_owner1());