import { useQueryClient } from '@tanstack/react-query';
import { AdminBixMarket } from '@/components/AdminBixMarket';
import { usePublicConfig } from '@/lib/useMember';

/** Reference price + display-only chart simulation, fed from the shared public config. */
export function AdminMarketTab({ onMessage }: { onMessage: (message: string) => void }) {
  const { data: cfg } = usePublicConfig();
  const qc = useQueryClient();
  if (!cfg) return <p className="mt-6">Loading…</p>;
  if (!cfg.isAdmin) return <p className="mt-6 text-muted-foreground">Owner access only.</p>;
  return <AdminBixMarket initialPrice={Number(cfg.bixMarket.priceUsd)} initialMovement={cfg.bixMarket.movement} onMessage={onMessage} onSaved={async () => { await qc.invalidateQueries({ queryKey: ['bix-public-config'] }); }}/>;
}
