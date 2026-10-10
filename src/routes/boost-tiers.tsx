import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, ArrowUpRight, Gauge } from 'lucide-react';
import { BixShell } from '@/components/BixShell';
import { usePublicConfig } from '@/lib/useMember';
import { number } from '@/lib/bixlink';

export const Route = createFileRoute('/boost-tiers')({ head: () => ({ meta: [{ title: 'BIX Staking Tiers — BIXLINK' }, { name: 'description', content: 'All BIXCOIN staking tiers with volume, lock period and APY in one place.' }, { property: 'og:title', content: 'BIX Staking Tiers — BIXLINK' }, { property: 'og:description', content: 'Full BIXCOIN staking tier ladder.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }, { name: 'robots', content: 'noindex' }] }), component: BoostTiers });

function BoostTiers() {
  const { data: cfg } = usePublicConfig();
  const packages = cfg?.packages ?? [];
  const bixPrice = Number(cfg?.bixMarket.priceUsd ?? 0.1) || 0.1;
  return <BixShell><main className="mx-auto max-w-5xl px-5 py-10 pb-28 md:px-8">
    <Link to="/boost" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/50 px-3 py-1.5 text-xs font-bold text-chart-3"><ArrowLeft size={14}/> Back to BOOST</Link>
    <div className="eyebrow mt-6"><Gauge size={14}/> VOLUME + DURATION</div>
    <h1 className="section-title">BIX STAKING <span>TIERS</span></h1>
    <p className="mt-4 max-w-2xl text-sm text-muted-foreground">Values at the internal ${bixPrice.toFixed(6)} reference. APY is a display projection, not a guarantee.</p>
    {packages.length === 0 ? <div className="mt-8 space-y-3">{[0,1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl bg-card"/>)}</div> :
    <div className="boost-ladder mt-8">{packages.map((pkg, index) => <Link key={pkg.id} to="/stake" className="boost-tier">
      <span className="boost-tier-rank numeric">TIER {String(index + 1).padStart(2, '0')}</span>
      <div className="min-w-0"><h3 className="font-display text-lg font-black">{pkg.id}</h3><span className="numeric">{number(Number(pkg.price_usd) / bixPrice, { maximumFractionDigits: 2 })} BIX · {pkg.lock_days} days lock</span></div>
      <div className="boost-tier-meter"><div className="apy-meter"><i style={{ width: `${Math.min(100, (Number(pkg.apy) / 25) * 100)}%` }}/></div><span>APY tier ladder</span></div>
      <div className="boost-tier-apy"><b className="numeric">{pkg.apy}%</b><span>APY</span></div>
      <ArrowUpRight size={16}/>
    </Link>)}</div>}
  </main></BixShell>;
}
