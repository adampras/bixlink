import { useEffect, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { number, type Package } from '@/lib/bixlink';
import { initialDuration, packageApy, PACKAGE_DURATIONS } from '@/lib/package-options';

export function DurationPackageCard({ pkg, index, onStake }: { pkg: Package; index: number; onStake: (p: Package & { compound?: boolean }) => void }) {
  const [days, setDays] = useState(initialDuration(pkg));
  const apy = packageApy(pkg, days);
  const perSec = Number(pkg.price_usd) * apy / 100 / 365 / 86400;
  const [compound, setCompound] = useState(false);
  const [ticks, setTicks] = useState(0);
  useEffect(() => { const t = setInterval(() => setTicks(n => n + 1), 1000); return () => clearInterval(t); }, []);
  return <article className={`duration-package tier-tone-${index % 8}`} aria-label={`${pkg.id} package`}>
    <header className="duration-package-head">
      <div><p className="text-xs font-bold">Tier {String(index + 1).padStart(2, '0')}</p><h3 className="mt-1 text-2xl font-bold">{pkg.id}</h3></div>
      <strong className="duration-price">{number(pkg.price_usd, { maximumFractionDigits: 2 })} USDT</strong>
    </header>
    <div className="duration-package-body">
      <p className="duration-label">Choose duration</p>
      <div className="duration-options" role="group" aria-label={`${pkg.id} duration`}>
        {PACKAGE_DURATIONS.map(d => <Button key={d} variant="outline" aria-pressed={days === d} className="duration-option" onClick={() => setDays(d)}>{d}D</Button>)}
      </div>
      <button type="button" aria-pressed={compound} onClick={() => setCompound(c => !c)} className={`mt-3 flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-bold ${compound ? 'border-chart-2 bg-chart-2/10 text-chart-2' : 'border-border text-muted-foreground'}`}><span>Daily compound profit</span><span>{compound ? 'ON' : 'OFF'}</span></button>
      <div className="duration-package-action"><div><p className="duration-label">Projected rate</p><strong className="duration-apy">{number(apy / 12, { maximumFractionDigits: 2 })}% <small>/ month</small></strong><p className="numeric text-[11px] font-bold text-chart-2">+${perSec.toFixed(8)}/sec · ${(perSec * ticks).toFixed(6)}</p><p className="text-[10px] text-muted-foreground">{number(apy)}% / year · projection</p></div><Button className="duration-stake" onClick={() => onStake({ ...pkg, lock_days: days, apy, compound })}>Stake <ArrowUpRight size={18}/></Button></div>
    </div>
  </article>;
}