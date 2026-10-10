import { useState } from 'react';
import { Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { number } from '@/lib/bixlink';
import { DEFAULT_STRATEGIES, strategyQuote, type PresaleStrategy, type StrategySettings } from '@/lib/presale-strategy';
import type { SovereignConfig } from '@/lib/presale';
import core from '@/assets/sovereign-core.jpg';

export function SovereignAllocation({ cfg, claimed, settings, open, busy, onBuy }: { cfg: SovereignConfig; claimed: number; settings?: StrategySettings | undefined; open: boolean; busy: boolean; onBuy: (usd: number, s: PresaleStrategy) => void }) {
  const st = settings ?? DEFAULT_STRATEGIES;
  const [s, setS] = useState<PresaleStrategy>('founder');
  const q = strategyQuote(s, cfg.usd, cfg.bix, cfg.releaseDays, st);
  const left = Math.max(0, cfg.slots - claimed);
  const live = open && st.enabled && cfg.enabled && left > 0;
  return <section className="mt-6 overflow-hidden rounded-2xl border border-chart-3/60 bg-card/70 shadow-[0_0_40px_-12px_var(--chart-3)]">
    <div className="grid md:grid-cols-2">
      <div className="relative">
        <img src={core} alt="Sovereign Singularity Core reactor" width={1024} height={1024} loading="lazy" className="aspect-square w-full object-cover"/>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background to-transparent p-4">
          <span className="text-[10px] font-bold tracking-[0.3em] text-chart-3">OMEGA GENESIS · {s.toUpperCase()}</span>
          <b className="block font-display text-xl">Sovereign Singularity Core</b>
          <span className="numeric text-xs text-muted-foreground">#SOV-{String(Math.min(claimed + 1, cfg.slots)).padStart(2, '0')}/{cfg.slots} · ${number(cfg.usd)}</span>
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="eyebrow text-chart-3"><Crown size={14}/> INSTITUTIONAL & SOVEREIGN</span>
          <span className="numeric rounded-full border border-chart-3 px-2 py-0.5 text-[10px] font-bold text-chart-3">{claimed} / {cfg.slots} CLAIMED</span>
        </div>
        <h2 className="mt-2 font-display text-2xl font-black">${number(cfg.usd)} Sovereign allocation</h2>
        <p className="mt-1 text-xs text-muted-foreground">Only {cfg.slots} certificates worldwide. Closes permanently when all slots are claimed.</p>
        <div className="mt-3 grid grid-cols-3 gap-2">{(['hybrid', 'dividend', 'founder'] as const).map(id => <button key={id} type="button" onClick={() => setS(id)} className={`rounded-xl border p-2 text-xs font-bold capitalize ${s === id ? 'border-chart-3 bg-chart-3/10 text-chart-3' : 'border-border'}`}>{id}</button>)}</div>
        <dl className="mt-3 text-sm">
          <div className="flex justify-between border-b border-border py-2"><dt className="text-muted-foreground">BIX allocation (locked)</dt><dd className="numeric font-bold">{number(q.bix)} BIX</dd></div>
          {q.dailyUsd > 0 && <div className="flex justify-between border-b border-border py-2"><dt className="text-muted-foreground">USDT per day</dt><dd className="numeric font-bold">${number(q.dailyUsd, { maximumFractionDigits: 2 })}</dd></div>}
          {q.bonusBix > 0 && <div className="flex justify-between border-b border-border py-2"><dt className="text-muted-foreground">Bonus BIX included</dt><dd className="numeric font-bold">+{number(q.bonusBix)} BIX</dd></div>}
          <div className="flex justify-between border-b border-border py-2"><dt className="text-muted-foreground">Release</dt><dd className="numeric font-bold">{cfg.releaseDays} days</dd></div>
        </dl>
        <ul className="mt-3 space-y-1 text-[11px] text-muted-foreground">
          <li>• Sovereign Founder certificate with permanent serial</li>
          <li>• Physical sapphire acrylic plaque (arranged with the team after purchase)</li>
          <li>• Private concierge contact with the development team</li>
        </ul>
        <Button className="mt-4 w-full rounded-full" disabled={!live || busy} onClick={() => onBuy(cfg.usd, s)}>{left === 0 ? 'All slots claimed' : busy ? 'Processing…' : live ? `Claim Sovereign slot · ${s}` : 'Not open yet'}</Button>
        <p className="mt-2 text-[10px] text-muted-foreground">BIX stays locked and is released over the period. Internal ledger record, not an on-chain token yet. No guarantee of profit.</p>
      </div>
    </div>
  </section>;
}
