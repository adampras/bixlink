import { Link } from '@tanstack/react-router';
import { ArrowUpRight, LockKeyhole, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { money, type Package } from '@/lib/bixlink';

export function PackageGrid({ packages, compact = false, onStake }: { packages: Package[]; compact?: boolean; onStake?: (pkg: Package) => void }) {
  return <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${compact ? 'xl:grid-cols-4' : 'lg:grid-cols-4'}`}>
    {packages.map((pkg, i) => <article className={`package-card accent-${i % 3} group`} key={pkg.id}>
      <div className="flex items-center justify-between"><span className="text-[11px] font-bold uppercase text-muted-foreground">Package {String(i + 1).padStart(2,'0')}</span><span className="text-muted-foreground"><Sparkles size={17}/></span></div>
      <div className="mt-5 flex items-baseline justify-between gap-2"><h3 className="font-display text-xl font-extrabold tracking-normal">{pkg.id}</h3>{pkg.id === 'LEGEND' && <span className="rounded-full border border-chart-3 px-2 py-1 text-[10px] font-bold text-chart-3">BOOSTER</span>}</div>
      <p className="mt-2 text-3xl font-black text-chart-3">{money(pkg.price_usd)}</p>
      <div className="mt-5 flex items-end justify-between border-t border-border pt-4"><div><span className="block text-[10px] uppercase text-muted-foreground">Annual yield</span><span className="text-2xl font-extrabold text-chart-2">{pkg.apy}% <small className="text-xs">APY</small></span></div><div className="text-right"><span className="block text-[10px] uppercase text-muted-foreground">Lock period</span><span className="flex items-center gap-1 text-sm font-bold"><LockKeyhole size={12}/>{pkg.lock_days} days</span></div></div>
      {onStake ? <Button className="mt-5 w-full rounded-full bg-chart-3 text-background hover:bg-chart-3/90" onClick={() => onStake(pkg)}>Stake <ArrowUpRight/></Button> : <Button asChild className="mt-5 w-full rounded-full bg-chart-3 text-background hover:bg-chart-3/90"><Link to="/dashboard">Stake <ArrowUpRight/></Link></Button>}
    </article>)}
  </div>;
}
