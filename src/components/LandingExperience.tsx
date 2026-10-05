import { Link } from '@tanstack/react-router';
import { ArrowRight, ArrowUpRight, Check, Coins, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PackageGrid } from '@/components/PackageGrid';
import { fallbackPackages, type Package } from '@/lib/bixlink';
import fox from '@/assets/bixlink-fox.png';

const milestones = [['Q1 2026','Launch'],['Q2 2026','Staking App Beta'],['Q3 2026','RWA Listing'],['Q4 2026','Ecosystem'],['Q1 2027','DAO'],['Q2 2027','21 JUTA MILESTONE']];

export function LandingExperience({ packages = fallbackPackages, booster = true, compact = false }: { packages?: Package[]; booster?: boolean; compact?: boolean }) {
  return <div>
    <section className="hero-section relative overflow-hidden border-b border-border"><div className={`hero-grid mx-auto grid max-w-7xl items-center gap-4 px-5 pb-12 pt-9 md:grid-cols-[1fr_0.9fr] md:px-8 ${compact ? 'md:pb-14 md:pt-10' : 'md:pb-20 md:pt-16'}`}>
      <div className="relative z-10 order-2 text-center md:order-1 md:text-left"><div className="eyebrow"><span className="inline-block h-2 w-2 rounded-full bg-chart-2"/> THE NEXT ERA OF BIXCOIN</div>
        <h1 className="brand-hero mt-5 font-display text-6xl font-black md:text-8xl">BIXLINK</h1>
        <p className="mt-4 font-display text-xl font-bold uppercase leading-tight md:text-3xl">RWA NARRATIVE <span className="text-primary">STAKING</span> <span className="text-chart-2">TRICOLOR</span></p>
        <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-muted-foreground md:mx-0">STAKE BIXCOIN • EXCHANGE • DEFI • RWA NARRATIVE</p>
        <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-chart-3/40 bg-card px-4 py-2 text-xs font-bold text-chart-3"><Coins size={15}/> 21 JUTA BIX TOKEN <span className="text-muted-foreground">• Powered by BIXCOIN</span></div>
        <div className="mt-8 flex flex-wrap justify-center gap-3 md:justify-start"><Button asChild size="lg" className="rounded-full bg-chart-3 px-7 font-bold text-background hover:bg-chart-3/90"><Link to="/auth">REGISTER / LOGIN <ArrowRight/></Link></Button><Button asChild size="lg" variant="outline" className="rounded-full border-chart-2 bg-transparent px-7 font-bold text-chart-2 hover:bg-chart-2/10 hover:text-chart-2"><Link to="/whitepaper">WHITEPAPER <ArrowUpRight/></Link></Button></div>
      </div>
      <div className={`relative order-1 flex items-center justify-center md:order-2 ${compact ? 'h-[230px] md:h-[360px]' : 'h-[260px] md:h-[440px]'}`}><div className="hero-halo"/><img src={fox} width={1024} height={1024} alt="BIXLINK blue fox mascot in a gold-trimmed tech jacket" className="hero-fox relative z-10 h-full w-auto object-contain"/>{booster && <div className="absolute bottom-2 right-0 z-20 rounded-2xl border border-primary/60 bg-card px-4 py-3 shadow-xl"><span className="block text-[10px] font-bold text-muted-foreground">APY BOOSTER</span><span className="text-2xl font-black text-chart-2">UP TO 25%</span></div>}</div>
    </div></section>
    <section className="mx-auto max-w-7xl px-5 py-14 md:px-8"><div className="mb-8"><div className="eyebrow">CHOOSE YOUR PATH</div><h2 className="section-title">8 STAKING <span>PACKAGES</span></h2></div><PackageGrid packages={packages}/></section>
    <section className="booster-band border-y border-border py-14"><div className="mx-auto grid max-w-7xl gap-8 px-5 md:grid-cols-2 md:px-8"><div><div className="eyebrow text-chart-2"><Zap size={15}/> REWARDS ECOSYSTEM</div><h2 className="section-title">APY BOOSTER <span className="text-chart-2">ACTIVE</span></h2><p className="mt-4 text-sm leading-7 text-muted-foreground">Up to 25% APY, 10% direct rewards, five matching-profit levels, and 5% RewardPlus for qualified weekly turnover.</p></div><div className="grid grid-cols-3 gap-3">{[12,6,3,2,1].map((rate, i) => <div className="metric-panel" key={rate}><span className="text-xs text-muted-foreground">LV{i+1}</span><strong className="block text-2xl text-chart-2">{rate}%</strong></div>)}</div></div><p className="mx-auto mt-7 max-w-7xl px-5 text-xs text-muted-foreground md:px-8"><Check size={14} className="mr-2 inline text-chart-2"/>Minimum 3 direct members for RewardPlus. Rewards are planned and require admin validation.</p></section>
    <section className="mx-auto max-w-7xl px-5 py-14 md:px-8"><div className="eyebrow">WHAT'S AHEAD</div><h2 className="section-title">THE <span>ROADMAP</span></h2><div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{milestones.map(([quarter,label], i) => <div className="roadmap-item" key={quarter}><span className="text-xs font-bold text-chart-2">0{i+1} / {quarter}</span><h3 className="mt-4 font-display text-xl font-bold">{label}</h3></div>)}</div></section>
  </div>;
}