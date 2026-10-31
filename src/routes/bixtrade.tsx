import { useEffect, useMemo, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { BixShell } from '@/components/BixShell';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { BIXTRADE_PAIRS, BIXTRADE_VENUES, projectBixtrade, readBixtrade, type BixtradeSettings } from '@/lib/bixtrade';
import { Activity, Construction, Cpu, Zap } from 'lucide-react';

export const Route = createFileRoute('/bixtrade')({
  head: () => ({ meta: [
    { title: 'BIXTrade Arbitrage Bot — BIXLINK' },
    { name: 'description', content: 'Cross-exchange arbitrage scanner on BTC, ETH, SOL and BNB USDT pairs with owner-managed projection ranges.' },
    { property: 'og:title', content: 'BIXTrade Arbitrage Bot — BIXLINK' },
    { property: 'og:description', content: 'Major-pair cross-exchange spread scanner and projection calculator.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  component: BixtradePage,
});

type Row = { pair: string; buy: string; sell: string; bid: number; ask: number; spread: number; net: number; ms: number };
const FEE = 0.1; // two taker legs ≈ 0.10%

function BixtradePage() {
  const [cfg, setCfg] = useState<BixtradeSettings | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [tick, setTick] = useState(0);
  const [amount, setAmount] = useState(1000);
  const [days, setDays] = useState(30);

  useEffect(() => { void supabase.from('app_settings').select('value').eq('key', 'bixtrade').maybeSingle().then(({ data }) => setCfg(readBixtrade(data?.value))); }, []);
  useEffect(() => {
    if (!cfg?.enabled) return;
    const load = () => fetch(`https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(JSON.stringify(BIXTRADE_PAIRS))}`)
      .then(r => r.json()).then((list: { symbol: string; price: string }[]) => Array.isArray(list) && setPrices(Object.fromEntries(list.map(x => [x.symbol, Number(x.price)])))).catch(() => {});
    load(); const a = setInterval(load, 8000); const b = setInterval(() => setTick(t => t + 1), 1500);
    return () => { clearInterval(a); clearInterval(b); };
  }, [cfg?.enabled]);

  const rows = useMemo<Row[]>(() => BIXTRADE_PAIRS.map((pair, i) => {
    const p = prices[pair]; if (!p) return null;
    const seed = Math.sin((tick + 1) * (i + 3) * 1.37);
    const spread = 0.15 + Math.abs(seed) * 0.33; // 0.15%–0.48% route spread (simulated)
    const v = (tick + i) % BIXTRADE_VENUES.length;
    return { pair: pair.replace('USDT', '/USDT'), buy: BIXTRADE_VENUES[v], sell: BIXTRADE_VENUES[(v + 1 + i) % BIXTRADE_VENUES.length], ask: p, bid: p * (1 + spread / 100), spread, net: spread - FEE, ms: 12 + Math.round(Math.abs(seed) * 30) };
  }).filter(Boolean) as Row[], [prices, tick]);

  if (!cfg) return <BixShell><main className="mx-auto max-w-5xl px-5 py-16 text-center text-sm text-muted-foreground">Loading BIXTrade…</main></BixShell>;
  if (!cfg.enabled) return <BixShell><main className="mx-auto max-w-xl px-5 py-16">
    <section className="arb-card text-center">
      <Construction className="mx-auto text-chart-3" size={42}/>
      <p className="shop-eyebrow mt-4">BIXTRADE ARBITRAGE BOT</p>
      <h1 className="mt-1 font-display text-2xl font-bold">Under Reconstruction</h1>
      <p className="mt-2 text-sm text-muted-foreground">{cfg.notice || 'The arbitrage engine is being upgraded and liquidity routes are re-syncing. Please check back soon.'}</p>
      <Button asChild className="mt-5"><Link to="/dashboard">Back to dashboard</Link></Button>
    </section>
  </main></BixShell>;

  const proj = projectBixtrade(cfg, amount, days);
  return <BixShell><main className="mx-auto max-w-6xl px-5 py-6 md:px-8">
    <p className="shop-eyebrow">QUANT ARBITRAGE ENGINE</p>
    <h1 className="mt-1 font-display text-3xl font-bold">BIX<span className="text-chart-3">Trade</span> Bot</h1>
    <p className="mt-1 mb-5 text-sm text-muted-foreground">Cross-exchange spread scanner on the world's most liquid USDT pairs. Reference prices are live Binance quotes.</p>
    <section className="grid grid-cols-3 gap-3">
      {[[Cpu, 'Engine', 'Online'], [Activity, 'Win rate', `${cfg.winRate}%`], [Zap, 'Daily range', `${cfg.minDailyPct}–${cfg.maxDailyPct}%`]].map(([I, l, v]) => { const Icon = I as typeof Cpu; return <div key={l as string} className="arb-card"><Icon size={16} className="text-chart-3"/><p className="mt-1 text-[10px] text-muted-foreground">{l as string}</p><b className="text-sm">{v as string}</b></div>; })}
    </section>
    <section className="arb-card mt-4 overflow-x-auto">
      <h2 className="font-display text-lg font-bold">Live spread scanner</h2>
      <table className="mt-3 w-full min-w-[560px] text-left text-xs">
        <thead className="text-muted-foreground"><tr>{['Pair', 'Buy @', 'Sell @', 'Ask', 'Bid', 'Spread', 'Net after fees', 'Latency'].map(h => <th key={h} className="py-2 pr-2">{h}</th>)}</tr></thead>
        <tbody>{rows.map(r => <tr key={r.pair} className="border-t border-border">
          <td className="py-2 pr-2 font-bold">{r.pair}</td><td className="pr-2">{r.buy}</td><td className="pr-2">{r.sell}</td>
          <td className="pr-2 font-mono">{r.ask.toFixed(2)}</td><td className="pr-2 font-mono">{r.bid.toFixed(2)}</td>
          <td className="pr-2 text-chart-3">{r.spread.toFixed(2)}%</td><td className={`pr-2 ${r.net > 0 ? 'text-chart-2' : 'text-destructive'}`}>{r.net.toFixed(2)}%</td><td>{r.ms}ms</td>
        </tr>)}</tbody>
      </table>
      {!rows.length && <p className="py-6 text-center text-muted-foreground">Connecting to market feed…</p>}
    </section>
    <section className="arb-card mt-4">
      <h2 className="font-display text-lg font-bold">Projection calculator</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-[11px] text-muted-foreground">Allocation (USDT, {cfg.minAlloc}–{cfg.maxAlloc})<input className="form-input mt-1" type="number" min={cfg.minAlloc} max={cfg.maxAlloc} value={amount} onChange={e => setAmount(Number(e.target.value))}/></label>
        <label className="text-[11px] text-muted-foreground">Cycle (days)<select className="form-input mt-1" value={days} onChange={e => setDays(Number(e.target.value))}>{[1, 7, 30, 90].map(d => <option key={d} value={d}>{d} days</option>)}</select></label>
      </div>
      <p className="mt-4 text-sm">Projected result: <b className="text-chart-2">{proj.low.toFixed(2)} – {proj.high.toFixed(2)} USDT</b> on {proj.amount} USDT</p>
      <div className="mt-4"><Button asChild><Link to="/stake">Open staking packages</Link></Button></div>
    </section>
    <p className="mt-6 text-[11px] leading-5 text-muted-foreground">Risk disclosure: scanner routes and spreads are a display simulation built on live reference prices; BIXTrade does not place orders on external exchanges. Projection ranges are set by the owner, are not guaranteed, and nothing here is added to your balance.</p>
  </main></BixShell>;
}
