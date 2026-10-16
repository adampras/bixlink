import { createFileRoute, Link } from '@tanstack/react-router';
import { BixShell } from '@/components/BixShell';
import { Button } from '@/components/ui/button';
import { useMember, usePublicConfig } from '@/lib/useMember';
import { ArrowUpRight, Coins, Gauge, ShieldCheck, TrendingUp, Zap } from 'lucide-react';
import { ReactorVideo } from '@/components/ReactorVideo';
import { boosterMaximum } from '@/lib/booster-apy';
import { number } from '@/lib/bixlink';
import { BixStakePanel } from '@/components/BixStakePanel';

export const Route = createFileRoute('/boost')({ head: () => ({ meta: [{ title: 'BIXCOIN Boost APY — BIXLINK' }, { name: 'description', content: 'Increase BIXCOIN staking APY through higher volume and longer lock periods, up to 45%.' }, { property: 'og:title', content: 'BIXCOIN Boost APY — BIXLINK' }, { property: 'og:description', content: 'BIXCOIN staking tiers, passive and active profit, with a 70% BIX and 30% USDT profit split.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }), component: BoostPage });

function BoostPage() {
  const { data: cfg } = usePublicConfig();
  const { data: memberData } = useMember();
  const packages = cfg?.packages ?? [];
  const longestLock = packages.reduce((max, p) => Math.max(max, Number(p.lock_days) || 0), 0);
  const bixPrice = Number(cfg?.bixMarket.priceUsd ?? 0.84291);
  const maximum = boosterMaximum(cfg?.booster.maxApy);
  const boosterEnabled = cfg?.booster.enabled !== false;
  const activeStakes = (memberData?.stakes ?? []).filter(stake => stake.status === 'active');
  const activeValue = activeStakes.reduce((sum, stake) => sum + Number(stake.amount_usd), 0);
  const annualYield = activeStakes.reduce((sum, stake) => sum + Number(stake.amount_usd) * Number(stake.apy) / 100, 0);
  return <BixShell><main>

    <section className="booster-vault overflow-hidden border-b border-border">
      <div className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-10">
        <Link to="/presale" aria-label="Open Genesis presale staking" className="group mb-5 flex items-center gap-3 rounded-2xl border border-chart-3/40 bg-gradient-to-r from-card via-background to-card px-4 py-3 transition-colors hover:border-chart-3/80">
          <span className="relative flex size-2 shrink-0"><span className="absolute inline-flex size-full animate-ping rounded-full bg-chart-3 opacity-60"/><span className="relative inline-flex size-2 rounded-full bg-chart-3"/></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[9px] font-bold tracking-[0.28em] text-chart-3">LIMITED ALLOCATION</span>
            <span className="block truncate font-display text-sm font-black tracking-wide sm:text-base">GENESIS PRESALE STAKING</span>
            <span className="block truncate text-[10px] text-muted-foreground sm:text-xs">$500 – $70,000 · Hybrid, Dividend &amp; Founder</span>
          </span>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-chart-3/60 text-chart-3 transition-transform group-hover:translate-x-0.5"><ArrowUpRight size={16}/></span>
        </Link>
        <h1 className="section-title !mt-0 !text-3xl !tracking-normal sm:!text-5xl">BOOST YOUR <span>APY</span></h1>
        <div className="mt-5 grid min-w-0 gap-6 lg:grid-cols-2 lg:items-start lg:gap-10">
        <div className="min-w-0">
          <div aria-label="BIX yield engine" className="[&_.reactor-glass-stage]:!my-5 [&_.reactor-glass-stage]:!rounded-lg">
            <ReactorVideo maximum={maximum}/>
          </div>
          <dl className="grid grid-cols-3 gap-2 border-y border-border py-3 text-center">
            <div className="min-w-0"><dd className="numeric font-display text-lg font-bold text-chart-2">70%</dd><dt className="text-[10px] text-muted-foreground">Profit in BIX</dt></div>
            <div className="min-w-0"><dd className="numeric font-display text-lg font-bold text-chart-3">30%</dd><dt className="text-[10px] text-muted-foreground">Profit in USDT</dt></div>
            <div className="min-w-0"><dd className="numeric font-display text-lg font-bold text-primary">{maximum}%</dd><dt className="text-[10px] text-muted-foreground">Max / month</dt></div>
          </dl>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">Larger BIX positions and longer locks unlock 8%–{maximum}% per month. Existing contracts keep their recorded APY. Projections only; returns are not guaranteed.</p>
        </div>
        <div className="min-w-0"><BixStakePanel bixPrice={bixPrice}/></div>
        </div>

        <section className="booster-member-status mt-6">
          <div><span>YOUR BOOSTER</span><strong className={boosterEnabled && activeStakes.length ? 'text-chart-2' : 'text-muted-foreground'}>{boosterEnabled ? (activeStakes.length ? 'ACTIVE' : 'READY') : 'PAUSED'}</strong></div>
          <div><span>ACTIVE POSITIONS</span><strong className="numeric">{activeStakes.length}</strong></div>
          <div><span>STAKING VALUE</span><strong className="numeric">${number(activeValue, { maximumFractionDigits: 2 })}</strong></div>
          <div><span>ANNUAL PROJECTION</span><strong className="numeric">${number(annualYield, { maximumFractionDigits: 2 })}</strong></div>
        </section>

      </div>
    </section>

    <section className="mx-auto max-w-7xl px-5 py-14 md:px-8">
      <div className="eyebrow"><ShieldCheck size={14}/> HOW IT WORKS</div>
      <h2 className="section-title">BIXCOIN BOOSTER <span>IN 4 STEPS</span></h2>
      <div className="booster-steps mt-8">
        <article><b>01</b><h3>Choose a BIXCOIN package</h3><p>Select the staking value, APY and lock duration that match your plan. The package value is paid from your virtual USDT testing balance.</p></article>
        <article><b>02</b><h3>Stake activates instantly</h3><p>When your balance is sufficient, the position becomes active automatically. No owner approval is needed for staking.</p></article>
        <article><b>03</b><h3>Booster tracks every second</h3><p>Profit is projected from the package value × APY × elapsed time. Seventy percent is displayed as BIX and thirty percent as USDT at the internal reference.</p></article>
        <article><b>04</b><h3>Review in PROFIT</h3><p>Open the PROFIT menu to see every active position. Early unstaking ends the projection and applies the owner-configured penalty schedule.</p></article>
      </div>
      <div className="mt-7 flex flex-wrap gap-3"><Button asChild className="rounded-full"><Link to="/stake">Start BIXCOIN staking <ArrowUpRight/></Link></Button><Button asChild variant="outline" className="rounded-full"><Link to="/profit"><TrendingUp/> Open profit tracker</Link></Button></div>
    </section>

    <section className="mx-auto max-w-7xl border-t border-border px-5 py-14 md:px-8">
      <div className="eyebrow"><Gauge size={14}/> VOLUME + DURATION</div>
      <h2 className="section-title">BIX STAKING <span>TIERS</span></h2>
      <p className="mt-4 max-w-2xl text-sm text-muted-foreground">The package amount represents BIXCOIN staking value at the internal ${bixPrice.toFixed(6)} reference. Higher volume and longer lock periods unlock the next APY tier.</p>
      <Button asChild className="mt-8 rounded-full"><Link to="/boost-tiers"><Gauge/> View all {packages.length} tiers <ArrowUpRight/></Link></Button>
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
              <span>BIX / USDT split</span>
            </div>
          </div>
          <div className="boost-split-bar mt-5"><i/><i/></div>
          <div className="boost-legend mt-4">
            <div className="boost-legend-item"><span><i className="bg-primary"/> BIX portion</span><b className="numeric text-primary">70%</b></div>
            <div className="boost-legend-item"><span><i className="bg-chart-3"/> USDT portion</span><b className="numeric text-chart-3">30%</b></div>
            <div className="boost-legend-item"><span><i className="bg-chart-2"/> At current internal reference</span><b className="numeric">70% BIX</b></div>
          </div>
          <p className="terminal-disclosure"><ShieldCheck size={14}/> Active staking profit is projected automatically every minute. No automatic payout is performed and the split is a reference allocation, not an exchange.</p>
        </div>
        <div className="grid content-start gap-3">
          <div className="boost-fact"><Coins className="text-chart-2"/><div><b>Passive staking profit</b><p>Calculated from the approved package APY and lock duration.</p></div></div>
          <div className="boost-fact"><Zap className="text-primary"/><div><b>Active BIX profit</b><p>Seventy percent of recorded profit is allocated in BIX at the internal reference value.</p></div></div>
          <div className="boost-fact"><ShieldCheck className="text-chart-3"/><div><b>Automatic activation</b><p>Eligible stakes activate instantly from the available virtual USDT testing balance.</p></div></div>
        </div>
      </div>
    </section>

  </main></BixShell>;
}
