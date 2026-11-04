import { useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DurationPackageCard } from '@/components/DurationPackageCard';
import { number, type Package } from '@/lib/bixlink';

/** Picks the largest open package whose price fits the chosen amount. */
export function fitPackage(packages: Package[], amount: number): Package | null {
  const open = packages.filter(p => p.enabled !== false && !p.retired).sort((a, b) => a.price_usd - b.price_usd);
  let pick: Package | null = null;
  for (const p of open) if (p.price_usd <= amount) pick = p;
  return pick ?? open[0] ?? null;
}

/** Simple package picker: tap a price chip or swipe the card left/right. */
export function StakeCalculator({ packages, onPick }: { packages: Package[]; onPick: (p: Package) => void }) {
  const list = useMemo(() => packages.filter(p => p.enabled !== false && !p.retired), [packages]);
  const [idx, setIdx] = useState(0);
  const startX = useRef<number | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  if (!list.length) return null;
  const i = Math.min(idx, list.length - 1);
  const go = (n: number) => {
    const next = (n + list.length) % list.length;
    setIdx(next);
    stripRef.current?.children[next]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };
  return <section aria-label="Select staking package" className="stake-pick">
    <div className="stake-pick-head"><span>SELECT PACKAGE</span><em>Tap amount or swipe card</em></div>
    <div ref={stripRef} role="tablist" aria-label="Package amount" className="stake-pick-chips">
      {list.map((p, n) => <button key={p.id} type="button" role="tab" aria-selected={n === i} onClick={() => go(n)} className="stake-pick-chip">
        <b className="numeric">${number(Number(p.price_usd), { maximumFractionDigits: 0 })}</b><small>{p.id}</small>
      </button>)}
    </div>
    <div className="stake-pick-stage"
      onTouchStart={e => { startX.current = e.touches[0]?.clientX ?? null; }}
      onTouchEnd={e => { const s = startX.current; const x = e.changedTouches[0]?.clientX; startX.current = null; if (s == null || x == null) return; const d = x - s; if (Math.abs(d) > 50) go(i + (d < 0 ? 1 : -1)); }}>
      <button type="button" aria-label="Paket sebelumnya" className="stake-pick-arrow is-left" onClick={() => go(i - 1)}><ChevronLeft size={18}/></button>
      <div className="auric-stake"><div className="auric-card is-active"><DurationPackageCard key={list[i]!.id} pkg={list[i]!} index={i} onStake={onPick}/></div></div>
      <button type="button" aria-label="Paket berikutnya" className="stake-pick-arrow is-right" onClick={() => go(i + 1)}><ChevronRight size={18}/></button>
    </div>
    <div className="stake-pick-dots" aria-hidden>{list.map((p, n) => <i key={p.id} className={n === i ? 'on' : ''}/>)}</div>
  </section>;
}
