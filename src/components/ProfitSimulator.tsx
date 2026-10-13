import { useState } from 'react';
import { Calculator } from 'lucide-react';
import { strategyQuote, DEFAULT_STRATEGIES, type PresaleStrategy, type StrategySettings } from '@/lib/presale-strategy';
import { number } from '@/lib/bixlink';

const SCENARIOS = [0.5, 0.84, 1.5, 3];

export function ProfitSimulator({ price = 0.5, days = 180, settings = DEFAULT_STRATEGIES }: { price?: number; days?: number; settings?: StrategySettings }) {
  const [usd, setUsd] = useState(1000); const [s, setS] = useState<PresaleStrategy>('hybrid');
  const q = strategyQuote(s, usd, usd / (price || 0.5), days, settings);
  return <section className="mt-8 rounded-2xl border border-chart-3/30 bg-card/60 p-5">
    <div className="eyebrow"><Calculator size={14}/> INVESTOR SIMULATOR</div>
    <h2 className="mt-1 font-display text-xl font-black">Portfolio simulation</h2>
    <label className="mt-4 block text-xs text-muted-foreground">Capital: <b className="numeric text-foreground">${number(usd)}</b>
      <input type="range" min={500} max={100000} step={500} value={usd} onChange={e => setUsd(Number(e.target.value))} className="mt-2 w-full accent-[var(--chart-3)]"/></label>
    <div className="mt-3 flex gap-2">{(['hybrid', 'dividend', 'founder'] as const).map(k => <button key={k} type="button" onClick={() => setS(k)} className={`flex-1 rounded-full border px-3 py-1.5 text-xs font-bold capitalize ${s === k ? 'border-chart-3 bg-chart-3 text-background' : 'border-border text-muted-foreground'}`}>{k}</button>)}</div>
    <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
      <div className="rounded-lg border border-border p-2"><dd className="numeric font-bold text-primary">{number(q.bix)}</dd><dt className="text-[10px] text-muted-foreground">BIX locked</dt></div>
      <div className="rounded-lg border border-border p-2"><dd className="numeric font-bold text-chart-2">${number(q.dailyUsd, { maximumFractionDigits: 2 })}</dd><dt className="text-[10px] text-muted-foreground">USDT / day</dt></div>
      <div className="rounded-lg border border-border p-2"><dd className="numeric font-bold text-chart-2">${number(q.totalUsd)}</dd><dt className="text-[10px] text-muted-foreground">USDT {days}d</dt></div>
    </dl>
    <div className="mt-4 space-y-1.5">{SCENARIOS.map(p => <div key={p} className="flex justify-between border-b border-border/50 pb-1 text-xs"><span className="text-muted-foreground">If BIX = ${p.toFixed(2)}</span><b className="numeric">${number(q.bix * p + q.totalUsd)}</b></div>)}</div>
    <p className="mt-3 text-[10px] text-muted-foreground">Display simulation using internal reference prices — not a guarantee of market value or profit. BIX is not yet listed.</p>
  </section>;
}
