import { Link } from '@tanstack/react-router';
import { ArrowUpRight, Crown, LockKeyhole, Sparkles, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { money, type Package } from '@/lib/bixlink';

export function PackageGrid({ packages, compact = false, onStake }: { packages: Package[]; compact?: boolean; onStake?: (pkg: Package) => void }) {
  return <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${compact ? 'xl:grid-cols-4' : 'lg:grid-cols-4'}`}>
    {packages.map((pkg, i) => { const popular = pkg.id === 'BUILDER'; const maxYield = pkg.id === 'LEGEND'; return <article className={`package-card accent-${i % 3} group ${maxYield ? 'package-card-featured' : ''}`} key={pkg.id}>
      <div className="flex min-h-6 items-center justify-between gap-2"><span className="numeric text-[11px] font-bold uppercase text-muted-foreground">Package {String(i + 1).padStart(2,'0')}</span>{popular ? <span className="package-label"><TrendingUp size={11}/> Popular</span> : maxYield ? <span className="package-label package-label-gold"><Crown size={11}/> Max yield</span> : <span className="text-muted-foreground"><Sparkles size={17}/></span>}</div>
      <div className="mt-5 flex items-baseline justify-between gap-2"><h3 className="font-display text-xl font-extrabold tracking-normal">{pkg.id}</h3></div>
      <p className="numeric mt-2 text-3xl font-black text-chart-3">{money(pkg.price_usd)}</p>
      <div className="mt-5 flex items-end justify-between border-t border-border pt-4"><div><span className="block text-[10px] uppercase text-muted-foreground">Annual yield</span><span className="text-2xl font-extrabold text-chart-2">{pkg.apy}% <small className="text-xs">APY</small></span></div><div className="text-right"><span className="block text-[10px] uppercase text-muted-foreground">Lock period</span><span className="flex items-center gap-1 text-sm font-bold"><LockKeyhole size={12}/>{pkg.lock_days} days</span></div></div>
      <div className="apy-meter mt-4" aria-label={`${pkg.apy}% of 25% maximum APY`}><i style={{ width: `${Math.min(100, pkg.apy / 25 * 100)}%` }}/></div>
      {onStake ? <Button className="mt-5 w-full rounded-full bg-chart-3 text-background hover:bg-chart-3/90" onClick={() => onStake(pkg)}>Stake <ArrowUpRight/></Button> : <Button asChild className="mt-5 w-full rounded-full bg-chart-3 text-background hover:bg-chart-3/90"><Link to="/stake">Stake <ArrowUpRight/></Link></Button>}
    </article>; })}
  </div>;
}
