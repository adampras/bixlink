import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { number, type Package } from '@/lib/bixlink';
import { initialDuration, packageApy, PACKAGE_DURATIONS } from '@/lib/package-options';

export function DurationPackageCard({ pkg, index, onStake }: { pkg: Package; index: number; onStake: (p: Package) => void }) {
  const [days, setDays] = useState(initialDuration(pkg));
  const apy = packageApy(pkg, days);
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
      <div className="duration-package-action"><div><p className="duration-label">Projected APY</p><strong className="duration-apy">{number(apy)}% <small>APY</small></strong></div><Button className="duration-stake" onClick={() => onStake({ ...pkg, lock_days: days, apy })}>Stake <ArrowUpRight size={18}/></Button></div>
    </div>
  </article>;
}