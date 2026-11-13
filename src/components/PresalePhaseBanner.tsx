import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { PHASE1, countdown, phaseState } from '@/lib/presale-phase';

export function PresalePhaseBanner() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const st = now ? phaseState(now) : 'upcoming';
  const cd = now ? countdown(st === 'upcoming' ? PHASE1.startsAt : PHASE1.endsAt, now) : [0, 0, 0, 0];
  return <section aria-label="Presale Phase 1" className="mx-auto my-6 w-full max-w-3xl px-4">
    <div className="relative overflow-hidden rounded-3xl border border-chart-3/40 bg-card/70 p-5 backdrop-blur">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold tracking-[0.3em] text-chart-3">PRESALE · PHASE 1</span>
        <span className="rounded-full border border-primary/50 px-2 py-0.5 text-[10px] font-bold text-primary">{st === 'upcoming' ? 'OPENS IN' : st === 'live' ? 'ENDS IN' : 'ENDED'}</span>
      </div>
      <div className="mt-2 flex items-end gap-2"><b className="numeric font-display text-4xl font-black text-foreground">${PHASE1.price.toFixed(2)}</b><span className="pb-1 text-xs text-muted-foreground">per BIX · equal to developer buyback</span></div>
      {st !== 'ended' && <div className="mt-3 grid max-w-xs grid-cols-4 gap-1.5">{cd.map((v, i) => <div key={i} className="rounded-xl border border-border bg-background/60 py-1.5 text-center"><b className="numeric block font-display text-lg">{String(v).padStart(2, '0')}</b><span className="text-[9px] text-muted-foreground">{['DAYS', 'HRS', 'MIN', 'SEC'][i]}</span></div>)}</div>}
      <ul className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px]">
        <li className="rounded-xl bg-background/50 p-2"><b className="block text-sm text-chart-3">$100–$1,000</b>One package</li>
        <li className="rounded-xl bg-background/50 p-2"><b className="block text-sm text-chart-3">4× BIX</b>$500 = 2,000 BIX</li>
        <li className="rounded-xl bg-background/50 p-2"><b className="block text-sm text-chart-3">1%/day</b>100-day vesting</li>
      </ul>
      <p className="mt-3 text-[11px] text-muted-foreground">14 Nov 2026 00:00 WIB – 14 Jan 2027 00:00 WIB. BIX is locked and released gradually; no guaranteed return.</p>
      <Link to="/presale" className="mt-4 flex items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-black text-primary-foreground">JOIN PRESALE <ArrowUpRight size={16}/></Link>
    </div>
  </section>;
}
