import { createFileRoute, Link } from '@tanstack/react-router';
import { BixShell } from '@/components/BixShell';
import { Button } from '@/components/ui/button';
import { usePublicConfig } from '@/lib/useMember';
import { ArrowUpRight, Coins, Gauge, ShieldCheck, Zap } from 'lucide-react';
import robotFox from '@/assets/booster-concept-fox.png';

export const Route = createFileRoute('/boost')({ head: () => ({ meta: [{ title: 'BIXCOIN Boost APY — BIXLINK' }, { name: 'description', content: 'Increase BIXCOIN staking APY through higher volume and longer lock periods, up to 25%.' }, { property: 'og:title', content: 'BIXCOIN Boost APY — BIXLINK' }, { property: 'og:description', content: 'BIXCOIN staking tiers, passive and active profit, with a 70% USDT and 30% BIX profit split.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }), component: BoostPage });

function BoostPage() {
  const { data: cfg } = usePublicConfig();
  const packages = cfg?.packages ?? [];
  const longestLock = packages.reduce((max, p) => Math.max(max, Number(p.lock_days) || 0), 0);
  return <BixShell><main>

    <section className="booster-vault overflow-hidden border-b border-border">
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
        <div className="terminal-supply"><ShieldCheck size={13}/> 21 JUTA BIX TOKEN</div>
        <div className="eyebrow mt-5"><Zap size={15} className="text-chart-2"/> BIXCOIN YIELD ENGINE</div>
        <h1 className="section-title">BOOST YOUR <span>APY</span></h1>
        <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">Stake more BIXCOIN for longer. Each package increases the fixed staking APY tier—from 8% up to 25%—for recorded passive and active staking profit.</p>
        <div className="boost-chips mt-6">
          <div className="booster-chip"><b className="text-chart-2">70%</b> profit in USDT</div>
          <div className="booster-chip"><b className="text-chart-3">30%</b> profit in BIX</div>
          <div className="booster-chip"><b className="text-primary">25%</b> maximum APY</div>
        </div>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button asChild className="rounded-full bg-chart-3 text-background"><Link to="/stake">Stake BIXCOIN <ArrowUpRight/></Link></Button>
          <Button asChild variant="outline" className="rounded-full border-chart-2 text-chart-2 hover:bg-chart-2/10"><Link to="/stake">View tier ladder</Link></Button>
        </div>

        <div className="boost-engine mt-8">
          <div className="boost-engine-head">
            <span className="boost-engine-live"><i/> YIELD ENGINE · LIVE READOUT</span>
            <strong>{cfg?.booster.enabled ? 'ENGINE ACTIVE' : 'ENGINE PAUSED'}</strong>
          </div>
          <div className="robot-stage">
            <div className="robot-core"/>
            <div className="robot-ring robot-ring-one"/>
            <div className="robot-ring robot-ring-two"/>
            <img src={robotFox} loading="lazy" width={1024} height={1024} alt="BIXLINK robotic fox guardian beside the APY reactor engine" className="robot-fox robot-fox--reactor"/>
            <div className="robot-status"><span className="pulse-dot"/> YIELD ENGINE {cfg?.booster.enabled ? 'ACTIVE' : 'PAUSED'}</div>
          </div>
          <div className="boost-readouts">
            <div className="boost-readout boost-readout--apy"><span>Maximum APY</span><strong>25.00%</strong></div>
            <div className="boost-readout boost-readout--split"><span>Profit split USDT / BIX</span><strong>70 / 30</strong></div>
            <div className="boost-readout boost-readout--lock"><span>Longest lock</span><strong>{longestLock} DAYS</strong></div>
          </div>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-5 py-14 md:px-8">
      <div className="eyebrow"><Gauge size={14}/> VOLUME + DURATION</div>
      <h2 className="section-title">BIX STAKING <span>TIERS</span></h2>
      <p className="mt-4 max-w-2xl text-sm text-muted-foreground">The package amount represents BIXCOIN staking value at the internal $0.10 reference. Higher volume and longer lock periods unlock the next APY tier.</p>
      <div className="boost-ladder mt-8">
        {packages.map((pkg, index) => (
          <Link key={pkg.id} to="/stake" className="boost-tier">
            <span className="boost-tier-rank numeric">TIER {String(index + 1).padStart(2, '0')}</span>
            <div className="min-w-0">
              <h3 className="font-display text-lg font-black">{pkg.id}</h3>
              <span className="numeric">{(Number(pkg.price_usd) / 0.1).toLocaleString()} BIX · {pkg.lock_days} days lock</span>
            </div>
            <div className="boost-tier-meter">
              <div className="apy-meter"><i style={{ width: `${Math.min(100, (Number(pkg.apy) / 25) * 100)}%` }}/></div>
              <span>APY tier ladder</span>
            </div>
            <div className="boost-tier-apy">
              <b className="numeric">{pkg.apy}%</b>
              <span>APY</span>
            </div>
            <ArrowUpRight size={16}/>
          </Link>
        ))}
      </div>
    </section>

    <section className="border-y border-border bg-card/30">
      <div className="mx-auto grid max-w-7xl gap-4 px-5 py-12 md:grid-cols-[1.25fr_1fr] md:px-8">
        <div className="terminal-market">
          <div className="terminal-market-head">
            <div>
              <span className="terminal-status"><i/> RECORDED ALLOCATION</span>
              <h2 className="mt-1">YIELD ALLOCATION</h2>
            </div>
            <div className="text-right">
              <strong>70 / 30</strong>
              <span>USDT / BIX split</span>
            </div>
          </div>
          <div className="boost-split-bar mt-5"><i/><i/></div>
          <div className="boost-legend mt-4">
            <div className="boost-legend-item"><span><i className="bg-chart-3"/> USDT portion</span><b className="numeric text-chart-3">70%</b></div>
            <div className="boost-legend-item"><span><i className="bg-primary"/> BIX portion</span><b className="numeric text-primary">30%</b></div>
            <div className="boost-legend-item"><span><i className="bg-chart-2"/> Paid at internal $0.10 reference</span><b className="numeric">30% BIX</b></div>
          </div>
          <p className="terminal-disclosure"><ShieldCheck size={14}/> Recorded staking profit is split at approval in the owner console. No automatic payout is performed and the split is a reference allocation, not an exchange.</p>
        </div>
        <div className="grid content-start gap-3">
          <div className="boost-fact"><Coins className="text-chart-2"/><div><b>Passive staking profit</b><p>Calculated from the approved package APY and lock duration.</p></div></div>
          <div className="boost-fact"><Zap className="text-primary"/><div><b>Active BIX profit</b><p>Thirty percent of recorded profit is allocated in BIX at the internal reference value.</p></div></div>
          <div className="boost-fact"><ShieldCheck className="text-chart-3"/><div><b>Admin validation</b><p>Stake activation and reward records remain pending until reviewed by the owner.</p></div></div>
        </div>
      </div>
    </section>

  </main></BixShell>;
}
