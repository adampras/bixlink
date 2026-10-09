import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { number, type Package } from '@/lib/bixlink';
import { initialDuration, packageApy, PACKAGE_DURATIONS } from '@/lib/package-options';
import { dailyRate, monthlyRate, nftTier, NFT_NAME } from '@/lib/nft';
import { NftCard } from '@/components/NftCard';

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
  const choose = (d: number) => {
    setDays(d); setPicked(true); setPopup(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPopup(false), 2800);
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
      {picked && <div className="mt-3 flex items-center justify-between rounded-xl border border-chart-2/40 bg-chart-2/10 px-3 py-2 text-xs"><span className="font-bold text-chart-2">Daily profit</span><span className="numeric font-bold">{number(dailyRate(apy), { maximumFractionDigits: 3 })}% · ${perDay.toFixed(4)} / day</span></div>}
      <button type="button" aria-pressed={compound} onClick={() => setCompound(c => !c)} className={`mt-3 flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-bold ${compound ? 'border-chart-2 bg-chart-2/10 text-chart-2' : 'border-border text-muted-foreground'}`}><span>Daily compound profit</span><span>{compound ? 'ON' : 'OFF'}</span></button>
      <p className="mt-3 text-[11px] text-muted-foreground">NFT card: <b className="text-chart-3">{tier} · {NFT_NAME[tier]}</b></p>
      <div className="duration-package-action"><div><p className="duration-label">Monthly APY</p><strong className="duration-apy">{number(monthlyRate(apy), { maximumFractionDigits: 2 })}% <small>/ month</small></strong><p className="numeric text-[11px] font-bold text-chart-2">+${perSec.toFixed(8)}/sec · ${(perSec * ticks).toFixed(6)}</p><p className="text-[10px] text-muted-foreground">Projection, not guaranteed</p></div><Button className="duration-stake" onClick={() => onStake({ ...pkg, lock_days: days, apy, compound })}>Stake <ArrowUpRight size={18}/></Button></div>
    </div>
    {popup && <div className="nft-pop" role="status" onClick={() => setPopup(false)}>
      <NftCard tier={tier} packageId={pkg.id} valueUsd={price} days={days} compact/>
      <p className="nft-pop-note">Join {pkg.id} · {days}D to mint this reactor NFT. Its value returns your package at contract end.</p>
    </div>}
  </article>;
}
