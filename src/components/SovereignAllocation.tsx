import { useEffect, useRef, useState } from 'react';
import { Crown, ShieldCheck, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { number } from '@/lib/bixlink';
import { DEFAULT_STRATEGIES, strategyQuote, type PresaleStrategy, type StrategySettings } from '@/lib/presale-strategy';
import type { SovereignConfig } from '@/lib/presale';
import core from '@/assets/sovereign-core.jpg';
import coreVideo from '@/assets/sovereign-core.mp4.asset.json';

function SovereignVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [sound, setSound] = useState(false);
  useEffect(() => { if (ref.current) { ref.current.muted = !sound; ref.current.volume = 0.35; } }, [sound]);
  return <>
    <video ref={ref} autoPlay muted loop playsInline preload="metadata" poster={core} aria-label="Sovereign Singularity Core reactor" className="aspect-square w-full object-cover"><source src={coreVideo.url} type="video/mp4"/></video>
    <Button variant="outline" size="icon" className="absolute right-3 top-3 rounded-full bg-background/60" aria-label={sound ? 'Mute' : 'Play soft sound'} onClick={() => setSound(v => !v)}>{sound ? <Volume2 size={15}/> : <VolumeX size={15}/>}</Button>
  </>;
}

/** Digital sapphire plaque certificate for a Sovereign holder. */
export function SovereignPlaque({ serial, slots = 21, strategy, bix, holder }: { serial: number; slots?: number; strategy?: string; bix: number; holder?: string }) {
  const id = `SOV-${String(serial).padStart(2, '0')}/${slots}`;
  return <figure className="relative overflow-hidden rounded-2xl border border-chart-3/70 bg-gradient-to-br from-card via-background to-card p-5 shadow-[0_0_40px_-14px_var(--chart-3)]">
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-primary/10 to-transparent"/>
    <div className="relative flex items-center justify-between"><span className="text-[10px] font-bold tracking-[0.3em] text-chart-3">OMEGA GENESIS</span><ShieldCheck size={18} className="text-chart-3"/></div>
    <b className="relative mt-3 block font-display text-xl">Sovereign Founder</b>
    <p className="relative text-xs text-muted-foreground">Sovereign Singularity Core · Protocol Architect</p>
    <p className="numeric relative mt-4 font-display text-3xl font-black text-chart-3">#{id}</p>
    <dl className="relative mt-3 grid grid-cols-2 gap-2 text-[11px]">
      <div><dt className="text-muted-foreground">Strategy</dt><dd className="font-bold capitalize">{strategy ?? 'founder'}</dd></div>
      <div><dt className="text-muted-foreground">BIX allocation</dt><dd className="numeric font-bold">{number(bix)}</dd></div>
      {holder && <div className="col-span-2"><dt className="text-muted-foreground">Holder</dt><dd className="font-bold">{holder}</dd></div>}
    </dl>
    <p className="relative mt-3 text-[10px] text-muted-foreground">In-app certificate. Physical sapphire plaque is arranged manually with the team.</p>
  </figure>;
}

export function SovereignAllocation({ cfg, claimed, settings, open, busy, onBuy }: { cfg: SovereignConfig; claimed: number; settings?: StrategySettings | undefined; open: boolean; busy: boolean; onBuy: (usd: number, s: PresaleStrategy) => void }) {
  const st = settings ?? DEFAULT_STRATEGIES;
  const [s, setS] = useState<PresaleStrategy>('founder');
  const q = strategyQuote(s, cfg.usd, cfg.bix, cfg.releaseDays, st);
  const left = Math.max(0, cfg.slots - claimed);
  const live = open && st.enabled && cfg.enabled && left > 0;
  return <section className="mt-6 overflow-hidden rounded-2xl border border-chart-3/60 bg-card/70 shadow-[0_0_40px_-12px_var(--chart-3)]">
    <div className="grid md:grid-cols-2">
      <div className="relative">
        <SovereignVideo/>
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
        <div className="mt-4"><SovereignPlaque serial={Math.min(claimed + 1, cfg.slots)} slots={cfg.slots} strategy={s} bix={q.bix}/></div>
        <Button className="mt-4 w-full rounded-full" disabled={!live || busy} onClick={() => onBuy(cfg.usd, s)}>{left === 0 ? 'All slots claimed' : busy ? 'Processing…' : live ? `Claim Sovereign slot · ${s}` : 'Not open yet'}</Button>
        <p className="mt-2 text-[10px] text-muted-foreground">BIX stays locked and is released over the period. Internal ledger record, not an on-chain token yet. No guarantee of profit.</p>
      </div>
    </div>
  </section>;
}
