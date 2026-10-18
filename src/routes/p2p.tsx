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
  component: P2PPage,
});
function P2PPage() {
  const { user } = useMember();
  return <BixShell><main className="mx-auto max-w-7xl px-5 py-6 md:px-8">
    <p className="shop-eyebrow">INTERNAL TRADING DESK</p>
    <h1 className="mt-1 font-display text-3xl font-bold">P2P <span className="text-chart-3">BIX Market</span></h1>
    <p className="mt-1 mb-6 text-sm text-muted-foreground">Post offers or take existing ones — settled instantly between members.</p>
    <Link to="/arbitrage" className="mb-4 inline-block text-xs font-bold text-chart-3 underline">Arbitrage & spread calculator →</Link>
    <P2PDesk userId={user?.id} />
  </main></BixShell>;
}
