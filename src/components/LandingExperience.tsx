import { Link } from '@tanstack/react-router';
import { ArrowRight, ArrowUpRight, Check, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PackageGrid } from '@/components/PackageGrid';
import { fallbackPackages, type Package } from '@/lib/bixlink';
import fox from '@/assets/bixlink-fox.png';

const milestones = [['Q1 2026','Launch'],['Q2 2026','Staking App Beta'],['Q3 2026','RWA Listing'],['Q4 2026','Ecosystem'],['Q1 2027','DAO'],['Q2 2027','21 JUTA MILESTONE']];

export function LandingExperience({ packages = fallbackPackages, booster = true, compact = false }: { packages?: Package[]; booster?: boolean; compact?: boolean }) {
  return <div>
    <section className="hero-section relative overflow-hidden border-b border-border">
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-primary/20 blur-[110px]"/>
      <div className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-chart-2/10 blur-[110px]"/>
      <div className={`relative mx-auto flex max-w-3xl flex-col items-center px-5 pb-14 pt-12 text-center ${compact ? 'md:pb-16 md:pt-14' : 'md:pb-20 md:pt-16'}`}>
        <div className="inline-flex items-center gap-2 rounded-full border border-chart-3/30 bg-chart-3/10 px-4 py-1.5 backdrop-blur-sm"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-chart-3"/><span className="text-[10px] font-bold uppercase tracking-[0.15em] text-chart-3">21 JUTA BIX TOKEN</span></div>
        <h1 className="mt-6 bg-gradient-to-b from-foreground via-chart-3 to-chart-3/60 bg-clip-text font-display text-6xl font-bold leading-[0.9] tracking-tighter text-transparent md:text-8xl">BIXLINK</h1>
        <div className="mt-3 flex flex-wrap justify-center gap-1.5 font-display text-[10px] font-medium uppercase tracking-[0.15em] md:text-xs"><span className="text-primary">STAKE BIXCOIN</span><span className="text-muted-foreground/50">•</span><span className="text-chart-2">EXCHANGE</span><span className="text-muted-foreground/50">•</span><span className="text-chart-3">DEFI</span><span className="text-muted-foreground/50">•</span><span className="text-foreground/80">RWA NARRATIVE</span></div>
        <div className={`relative flex items-center justify-center ${compact ? 'h-[240px] md:h-[300px]' : 'h-[260px] md:h-[340px]'}`}>
          <div className="hero-halo"/>
          <img src={fox} width={1024} height={1024} alt="BIXLINK blue fox mascot in a gold-trimmed tech jacket" className="hero-fox relative z-10 h-full w-auto object-contain"/>
          {booster && <div className="absolute -right-1 top-2 z-20 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary via-chart-2 to-chart-3 p-[2px] shadow-[0_0_20px_oklch(0.87_0.29_142/30%)] md:-right-6"><div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-background p-2 text-center"><span className="text-[8px] font-bold uppercase leading-tight text-foreground/80">APY Booster</span><span className="mt-1 font-display text-sm font-bold leading-none text-chart-2">UP TO 25%</span></div></div>}
        </div>
        <div className="z-10 mt-2 flex w-full max-w-sm flex-col gap-3">
          <Button asChild size="lg" className="w-full rounded-xl bg-chart-3 py-6 font-display text-sm font-bold uppercase tracking-wider text-background shadow-[0_8px_25px_-5px_oklch(0.88_0.19_95/50%)] transition-all hover:brightness-110 active:scale-[0.98]"><Link to="/auth">REGISTER / LOGIN <ArrowRight/></Link></Button>
          <Button asChild size="lg" variant="outline" className="w-full rounded-xl border-chart-2/50 bg-chart-2/5 py-6 font-display text-sm font-bold uppercase tracking-wider text-chart-2 transition-all hover:bg-chart-2/10 hover:text-chart-2 active:scale-[0.98]"><Link to="/whitepaper">WHITEPAPER <ArrowUpRight/></Link></Button>
        </div>
        <div className="z-10 mt-6 grid w-full grid-cols-3 gap-2">
          <div className="flex flex-col items-center rounded-xl border border-border/60 bg-card/60 p-3 shadow-lg backdrop-blur-md"><span className="mb-1 text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Supply</span><span className="font-display text-[13px] font-bold">21.000.000</span></div>
          <div className="relative flex flex-col items-center overflow-hidden rounded-xl border border-primary/30 bg-card/60 p-3 shadow-lg backdrop-blur-md"><div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent"/><span className="relative z-10 mb-1 text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Staking APY</span><span className="relative z-10 font-display text-[13px] font-bold text-primary">8% – 25%</span></div>
          <div className="flex flex-col items-center rounded-xl border border-border/60 bg-card/60 p-3 shadow-lg backdrop-blur-md"><span className="mb-1 text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Price</span><span className="font-display text-[13px] font-bold text-chart-2">$0.10</span></div>
        </div>
      </div>
    </section>
    <section className="mx-auto max-w-7xl px-5 py-14 md:px-8"><div className="mb-8"><div className="eyebrow">CHOOSE YOUR PATH</div><h2 className="section-title">8 STAKING <span>PACKAGES</span></h2></div><PackageGrid packages={packages}/></section>
    <section className="booster-band border-y border-border py-14"><div className="mx-auto grid max-w-7xl gap-8 px-5 md:grid-cols-2 md:px-8"><div><div className="eyebrow text-chart-2"><Zap size={15}/> REWARDS ECOSYSTEM</div><h2 className="section-title">APY BOOSTER <span className="text-chart-2">ACTIVE</span></h2><p className="mt-4 text-sm leading-7 text-muted-foreground">Up to 25% APY, 10% direct rewards, five matching-profit levels, and 5% RewardPlus for qualified weekly turnover.</p></div><div className="grid grid-cols-3 gap-3">{[12,6,3,2,1].map((rate, i) => <div className="metric-panel" key={rate}><span className="text-xs text-muted-foreground">LV{i+1}</span><strong className="block text-2xl text-chart-2">{rate}%</strong></div>)}</div></div><p className="mx-auto mt-7 max-w-7xl px-5 text-xs text-muted-foreground md:px-8"><Check size={14} className="mr-2 inline text-chart-2"/>Minimum 3 direct members for RewardPlus. Rewards are planned and require admin validation.</p></section>
    <section className="mx-auto max-w-7xl px-5 py-14 md:px-8"><div className="eyebrow">WHAT'S AHEAD</div><h2 className="section-title">THE <span>ROADMAP</span></h2><div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{milestones.map(([quarter,label], i) => <div className="roadmap-item" key={quarter}><span className="text-xs font-bold text-chart-2">0{i+1} / {quarter}</span><h3 className="mt-4 font-display text-xl font-bold">{label}</h3></div>)}</div></section>
  </div>;
}