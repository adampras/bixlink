import { createFileRoute } from '@tanstack/react-router';
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
    <section className="rounded-2xl border border-chart-3/40 bg-card/70 p-4 backdrop-blur-xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.25em] text-chart-3">Trade Terminal</p><h1 className="mt-1 font-display text-3xl font-bold">BIX <span className="text-muted-foreground">/</span> USDT</h1></div>
        <div className="text-right"><span className="text-[10px] uppercase text-muted-foreground">Harga referensi owner</span><b className="numeric block text-2xl text-chart-2">${ref.toFixed(6)}</b></div>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">Pasar internal — bukan listing exchange. Transaksi diselesaikan di ledger internal BIXLINK antar member.</p>
    </section>
    <div className="mt-5"><P2PDesk userId={user?.id} /></div>
  </main></BixShell>;
}
