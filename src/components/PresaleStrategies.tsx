import { useState } from 'react';
import { Crown, Gem, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { number } from '@/lib/bixlink';
import { DEFAULT_STRATEGIES, genesisTier, strategyQuote, type PresaleStrategy, type StrategySettings } from '@/lib/presale-strategy';
import type { PresalePackage } from '@/lib/presale';
import poster from '@/assets/presale-rocket-dark-poster.jpg.asset.json';
import video from '@/assets/presale-rocket-dark.mp4.asset.json';

export function PresaleStrategies({ packages, settings, open, busy, onBuy }: { packages: PresalePackage[]; settings?: StrategySettings | undefined; open: boolean; busy: boolean; onBuy: (usd: number, s: PresaleStrategy) => void }) {
  const cfg = settings ?? DEFAULT_STRATEGIES;
  const [s, setS] = useState<PresaleStrategy>('hybrid');
  const [i, setI] = useState(0);
  const p = packages[i] ?? packages[0];
  if (!p) return null;
  const STRATS = [
    { id: 'hybrid' as const, name: 'Hybrid', tag: `${cfg.hybridBixPct}% BIX + ${100 - cfg.hybridBixPct}% USDT earning ${cfg.hybridDailyPct}%/day`, icon: Layers, fit: 'Daily USDT rotation' },
    { id: 'dividend' as const, name: 'Dividend', tag: `Full BIX + ${cfg.dividendDailyPct}%/day USDT dividend`, icon: Gem, fit: 'Steady capital recovery' },
    { id: 'founder' as const, name: 'Founder', tag: `Full BIX + ${cfg.founderBonusApy}% yearly bonus BIX`, icon: Crown, fit: 'Long-term holders' },
  ];
  const q = strategyQuote(s, p.usd, p.bix, p.releaseDays, cfg);
  const tier = genesisTier(p.usd);
  const row = (k: string, v: string) => <div className="flex justify-between border-b border-border py-2 text-sm"><span className="text-muted-foreground">{k}</span><b className="numeric">{v}</b></div>;
  const live = open && cfg.enabled;
  return <section className="mt-6 rounded-2xl border border-border bg-card/60 p-4 sm:p-6">
    <div className="flex items-center justify-between gap-2"><h2 className="font-display text-lg font-black">Choose your strategy</h2><span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${live ? 'border-chart-2 text-chart-2' : 'border-chart-3 text-chart-3'}`}>{live ? 'LIVE' : 'NOT OPEN YET'}</span></div>
    <div className="mt-3 grid grid-cols-3 gap-2">{STRATS.map(x => <button key={x.id} type="button" onClick={() => setS(x.id)} className={`rounded-xl border p-2 text-left transition ${s === x.id ? 'border-primary bg-primary/10' : 'border-border'}`}><x.icon size={16} className="text-primary"/><b className="mt-1 block text-xs">{x.name}</b><span className="block text-[10px] leading-tight text-muted-foreground">{x.fit}</span></button>)}</div>
    <div className="mt-3 flex flex-wrap gap-2">{packages.map((pk, j) => <button key={pk.usd} type="button" onClick={() => setI(j)} className={`numeric rounded-full border px-3 py-1 text-xs ${j === i ? 'border-primary text-primary' : 'border-border text-muted-foreground'}`}>${number(pk.usd)}</button>)}</div>
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <div>
        <p className="text-xs text-primary">{STRATS.find(x => x.id === s)!.tag}</p>
        {row('BIX allocation (locked)', `${number(q.bix)} BIX`)}
        {q.dailyUsd > 0 && row('USDT per day', `$${number(q.dailyUsd, { maximumFractionDigits: 2 })}`)}
        {q.dailyUsd > 0 && row(`USDT total · ${p.releaseDays} days`, `$${number(q.totalUsd, { maximumFractionDigits: 2 })}`)}
        {s === 'founder' && row('Bonus BIX included', `+${number(q.bonusBix)} BIX`)}
        {row('Release', `${p.releaseDays} days`)}
        {row('Genesis NFT', tier)}
        {s === 'hybrid' && <p className="mt-2 text-[11px] text-muted-foreground">The USDT half pays daily yield during the release period only. The principal is not refunded.</p>}
        {s === 'founder' && <p className="mt-2 text-[11px] text-muted-foreground">Founder perks: Auric Card whitelist priority and Founder badge.</p>}
        <Button className="mt-4 w-full rounded-full" disabled={!live || busy} onClick={() => onBuy(p.usd, s)}>{busy ? 'Processing…' : `Buy $${number(p.usd)} · ${s}`}</Button>
      </div>
      <figure className="relative overflow-hidden rounded-2xl border border-primary/40 bg-background">
        <video autoPlay muted loop playsInline preload="metadata" poster={poster.url} className="aspect-[4/3] w-full object-contain"><source src={video.url} type="video/mp4"/></video>
        <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background to-transparent p-3">
          <span className="text-[10px] font-bold tracking-widest text-chart-3">GENESIS NODE · {s.toUpperCase()}</span>
          <b className="block font-display text-lg">{tier}</b>
          <span className="numeric text-xs text-muted-foreground">#GEN-•••• · ${number(p.usd)} · {number(q.bix)} BIX</span>
        </figcaption>
      </figure>
    </div>
    <p className="mt-3 text-[11px] text-muted-foreground">USDT dividends are added to your wallet automatically once per full day. BIX stays locked and is released over the period. No guarantee of profit.</p>
  </section>;
}

export function GenesisCertificate({ usd, serial, strategy, bix }: { usd: number; serial?: number | undefined; strategy?: string | undefined; bix: number }) {
  return <figure className="relative overflow-hidden rounded-2xl border border-primary/40 bg-background">
    <video autoPlay muted loop playsInline preload="metadata" poster={poster.url} className="aspect-[4/3] w-full object-contain"><source src={video.url} type="video/mp4"/></video>
    <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background to-transparent p-3">
      <span className="text-[10px] font-bold tracking-widest text-chart-3">GENESIS NODE · {(strategy ?? 'standard').toUpperCase()}</span>
      <b className="block font-display text-base">{genesisTier(usd)}</b>
      <span className="numeric text-xs text-muted-foreground">#GEN-{String(serial ?? 0).padStart(4, '0')} · ${number(usd)} · {number(bix)} BIX</span>
    </figcaption>
  </figure>;
}
