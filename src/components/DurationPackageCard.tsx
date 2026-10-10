import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { number, type Package } from '@/lib/bixlink';
import { initialDuration, packageApy, PACKAGE_DURATIONS } from '@/lib/package-options';
import { dailyRate, monthlyRate, nftTier, nftSignature, NFT_ART, NFT_NAME } from '@/lib/nft';
import type { CSSProperties } from 'react';
import { NftCard } from '@/components/NftCard';
import { packageArtwork } from '@/lib/nft-catalog';
import { useNftCatalog } from '@/lib/useNftCatalog';
import { createPortal } from 'react-dom';

export function DurationPackageCard({ pkg, index, onStake }: { pkg: Package; index: number; onStake: (p: Package & { compound?: boolean }) => void }) {
  const [days, setDays] = useState(initialDuration(pkg));
  const [picked, setPicked] = useState(false);
  const [popup, setPopup] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const apy = packageApy(pkg, days);
  const price = Number(pkg.price_usd);
  const perSec = price * apy / 100 / 365 / 86400;
  const perDay = price * dailyRate(apy) / 100;
  const [compound, setCompound] = useState(false);
  const [ticks, setTicks] = useState(0);
  useEffect(() => { const t = setInterval(() => setTicks(n => n + 1), 1000); return () => { clearInterval(t); if (timer.current) clearTimeout(timer.current); }; }, []);
  const tier = nftTier(price, days);
  const catalog = useNftCatalog();
  const art = packageArtwork(catalog.data ?? [], index, days, price);
  const choose = (d: number) => {
    setDays(d); setPicked(true); setPopup(true);
    if (timer.current) clearTimeout(timer.current);
  };
  return <article className={`duration-package tier-tone-${index % 8}`} aria-label={`${pkg.id} package`}>
    <header className="duration-package-head">
      <div><p className="text-xs font-bold">Tier {String(index + 1).padStart(2, '0')}</p><h3 className="mt-1 text-2xl font-bold">{pkg.id}</h3></div>
      <strong className="duration-price">{number(price, { maximumFractionDigits: 2 })} USDT</strong>
    </header>
    <div className="duration-package-body">
      <p className="duration-label">Choose duration</p>
      <div className="duration-options" role="group" aria-label={`${pkg.id} duration`}>
        {PACKAGE_DURATIONS.map(d => <Button key={d} variant="outline" aria-pressed={days === d} className="duration-option" onClick={() => choose(d)}>{d}D</Button>)}
      </div>
      <div className="mt-3 rounded-xl border border-chart-2/40 bg-chart-2/10 px-3 py-2"><p className="text-[10px] font-bold uppercase text-chart-2">Daily profit</p><p className="numeric mt-1 text-lg font-bold">+{number(dailyRate(apy), { maximumFractionDigits: 3 })}% <small className="text-xs text-muted-foreground">/ day</small> · <span className="text-chart-2">${number(perDay, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}</span> <small className="text-xs text-muted-foreground">/ day</small></p></div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs"><div className="rounded-xl border border-border px-3 py-2"><p className="text-[10px] text-muted-foreground">Monthly profit</p><b className="numeric block">{number(monthlyRate(apy), { maximumFractionDigits: 2 })}% · ${number(perDay * 30, { maximumFractionDigits: 2 })}</b></div><div className="rounded-xl border border-border px-3 py-2"><p className="text-[10px] text-muted-foreground">Total ({days} days)</p><b className="numeric block text-chart-3">${number(perDay * days, { maximumFractionDigits: 2 })}</b></div></div>
      {(() => { const sig = nftSignature(price, days); return <button type="button" className="nft-mini" style={{ '--nft-hue': `${sig.hue}deg`, '--nft-boost': String(0.9 + sig.power * 0.06) } as CSSProperties} onClick={() => setPopup(true)} aria-label="Preview NFT certificate"><img src={NFT_ART[tier]} alt="" loading="lazy"/><span className="text-xs"><b className="block text-chart-3">{NFT_NAME[tier]}</b><span className="numeric text-muted-foreground">{tier} · Grade {sig.grade} · {days}D</span><span className="block text-[10px] text-muted-foreground">Tap to view certificate</span></span></button>; })()}
      <label className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>Daily compound profit</span><input type="checkbox" checked={compound} onChange={e => setCompound(e.target.checked)}/></label>
      <div className="duration-package-action"><div><p className="text-[10px] text-muted-foreground">Projection, not guaranteed</p></div><Button className="duration-stake" onClick={() => { setPopup(false); onStake({ ...pkg, lock_days: days, apy, compound }); }}>Join {number(price, { maximumFractionDigits: 2 })} USDT <ArrowUpRight size={18}/></Button></div>
    </div>
    {popup && createPortal(<div className="nft-pop" role="dialog" aria-modal="true" aria-label="Package NFT preview" onClick={() => { setPopup(false); if (timer.current) clearTimeout(timer.current); }}>
      <div className="relative" onClick={e => e.stopPropagation()}><Button variant="outline" size="icon" className="absolute -right-3 -top-3 z-10" aria-label="Close NFT preview" onClick={() => { setPopup(false); if (timer.current) clearTimeout(timer.current); }}><X/></Button><NftCard tier={tier} packageId={pkg.id} valueUsd={price} days={days} artworkId={art?.id} imagePath={art?.imagePath} compact/></div>
      <p className="nft-pop-note">{art?.name ?? 'Reactor NFT'} · {pkg.id} · {days}D. In-app certificate. Press Join to continue.</p>
    </div>, document.body)}
  </article>;
}
