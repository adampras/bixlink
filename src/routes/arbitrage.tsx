import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { BixShell } from '@/components/BixShell';
import { HighlightsHub } from '@/components/HighlightsHub';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/arbitrage')({
  head: () => ({ meta: [
    { title: 'BIXLINK Arbitrage & Trading Desk' },
    { name: 'description', content: 'Compare BIX price routes: Dev Buyback, member P2P order book and launch reference, with a spread calculator.' },
    { property: 'og:title', content: 'BIXLINK Arbitrage & Trading Desk' },
    { property: 'og:description', content: 'Spread scanner and calculator for BIX internal price routes.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  component: ArbitragePage,
});

const ROUTES = [
  { name: 'Dev Buyback Desk', price: 0.35, note: 'Locked floor · sell to developer' },
  { name: 'Member P2P Order Book', price: 0.425, note: 'Free market range $0.35 – $0.50' },
  { name: 'Launch Reference', price: 0.5, note: 'Owner-managed reference price' },
];

function ArbitragePage() {
  const [amount, setAmount] = useState(1000);
  const [buy, setBuy] = useState(0.38);
  const [sell, setSell] = useState(0.45);
  const spread = sell - buy;
  const profit = amount * spread;
  const pct = buy > 0 ? (spread / buy) * 100 : 0;
  return <BixShell><main className="mx-auto max-w-7xl px-5 py-6 md:px-8">
    <div className="mb-6"><HighlightsHub/></div>
    <p className="shop-eyebrow">INTERNAL TRADING DESK</p>
    <h1 className="mt-1 font-display text-3xl font-bold">Arbitrage <span className="text-chart-3">& Trading</span></h1>
    <p className="mt-1 mb-6 text-sm text-muted-foreground">Compare BIX price routes inside BIXLINK and calculate a spread before trading on the P2P desk.</p>
    <section className="grid gap-3 sm:grid-cols-3">
      {ROUTES.map(r => <div key={r.name} className="arb-card"><p className="text-[11px] font-bold text-muted-foreground">{r.name}</p><p className="mt-1 font-display text-2xl font-black text-chart-3">${r.price.toFixed(3)}</p><p className="mt-1 text-[11px] text-muted-foreground">{r.note}</p></div>)}
    </section>
    <section className="arb-card mt-6">
      <h2 className="font-display text-lg font-bold">Spread calculator</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="text-[11px] text-muted-foreground">Amount (BIX)<input className="form-input mt-1" type="number" min={1} max={100000} value={amount} onChange={e => setAmount(Number(e.target.value))}/></label>
        <label className="text-[11px] text-muted-foreground">Buy price (USDT)<input className="form-input mt-1" type="number" step="0.001" min={0.35} max={0.5} value={buy} onChange={e => setBuy(Number(e.target.value))}/></label>
        <label className="text-[11px] text-muted-foreground">Sell price (USDT)<input className="form-input mt-1" type="number" step="0.001" min={0.35} max={0.5} value={sell} onChange={e => setSell(Number(e.target.value))}/></label>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div><p className="text-[10px] text-muted-foreground">Spread</p><b>${spread.toFixed(3)}</b></div>
        <div><p className="text-[10px] text-muted-foreground">Est. result</p><b className={profit >= 0 ? 'text-chart-2' : 'text-destructive'}>{profit.toFixed(2)} USDT</b></div>
        <div><p className="text-[10px] text-muted-foreground">Margin</p><b>{pct.toFixed(1)}%</b></div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2"><Button asChild><Link to="/p2p">Open P2P Desk</Link></Button><Button asChild variant="outline"><Link to="/market">Market terminal</Link></Button></div>
    </section>
    <p className="mt-6 text-[11px] leading-5 text-muted-foreground">Risk disclosure: this is a calculator only. Prices shown are internal ledger references, not exchange quotes. Trades depend on real member offers in the P2P order book; spreads are not guaranteed and you may lose value.</p>
  </main></BixShell>;
}
