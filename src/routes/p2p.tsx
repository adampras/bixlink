import { ModuleGate } from '@/components/ModuleGate';
import { createFileRoute, Link } from '@tanstack/react-router';
import { BixShell } from '@/components/BixShell';
import { P2PDesk } from '@/components/P2PDesk';
import { useMember } from '@/lib/useMember';

export const Route = createFileRoute('/p2p')({
  head: () => ({ meta: [
    { title: 'BIXLINK P2P Desk — Member BIX Trading' },
    { name: 'description', content: 'Trade BIX with other BIXLINK members through an internal ledger order book.' },
    { property: 'og:title', content: 'BIXLINK P2P Desk' },
    { property: 'og:description', content: 'Member-to-member BIX order book with escrow in the internal ledger.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  component: () => <ModuleGate module="p2p"><P2PPage/></ModuleGate>,
});
function P2PPage() {
  const { user } = useMember();
  return <BixShell><main className="mx-auto max-w-7xl px-5 pt-4 pb-28 md:px-8">
    <div className="mb-3 flex items-end justify-between gap-3"><div><p className="shop-eyebrow">INTERNAL TRADING DESK</p><h1 className="font-display text-2xl font-bold leading-tight">P2P <span className="text-chart-3">BIX Market</span></h1></div><Link to="/arbitrage" className="shrink-0 text-[11px] font-bold text-chart-3 underline">Kalkulator spread →</Link></div>
    <P2PDesk userId={user?.id} />
  </main></BixShell>;
}
