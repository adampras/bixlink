import { createFileRoute, Link } from '@tanstack/react-router';
import { ModuleGate } from '@/components/ModuleGate';
import { BixShell } from '@/components/BixShell';
import { P2PDesk } from '@/components/P2PDesk';
import { useMember, usePublicConfig } from '@/lib/useMember';

export const Route = createFileRoute('/trade')({
  head: () => ({ meta: [
    { title: 'BIXLINK Trade Terminal — BIX/USDT Internal Market' },
    { name: 'description', content: 'Professional BIX/USDT terminal on the BIXLINK internal ledger order book.' },
    { property: 'og:title', content: 'BIXLINK Trade Terminal' },
    { property: 'og:description', content: 'Internal BIX/USDT order book for BIXLINK members — not an exchange listing.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  component: () => <ModuleGate module="trade"><TradePage/></ModuleGate>,
});

function TradePage() {
  const { user } = useMember();
  const { data: cfg } = usePublicConfig();
  const ref = Number(cfg?.bixMarket.priceUsd ?? 0);
  return <BixShell><main className="mx-auto max-w-7xl px-5 py-6 md:px-8">
    <div className="mb-2 flex items-center justify-between gap-2">
      <h1 className="font-display text-xl font-bold leading-none">BIX <span className="text-muted-foreground">/</span> <span className="text-chart-3">USDT</span></h1>
      <div className="flex gap-1.5"><Link to="/quantum-exchange" className="trade-chip">QUANTUM · SOON</Link><Link to="/mining" className="trade-chip">MINING · SOON</Link></div>
    </div>
    <P2PDesk userId={user?.id} refPrice={ref} />
    <p className="mt-3 text-[10px] text-muted-foreground">Internal market — not an exchange listing. Trades settle in the BIXLINK internal ledger between members.</p>
  </main></BixShell>;
}
