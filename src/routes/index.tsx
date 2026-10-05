import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight, ArrowUpRight, Check, Coins, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BixShell } from '@/components/BixShell';
import { PackageGrid } from '@/components/PackageGrid';
import { fallbackPackages } from '@/lib/bixlink';
import fox from '@/assets/bixlink-fox.png';

export const Route = createFileRoute('/')({
  head: () => ({ meta: [{ title: 'BIXLINK — BIXCOIN Staking' }, { name: 'description', content: 'Explore BIXLINK BIXCOIN staking packages, referral rewards and the RWA roadmap.' }, { property: 'og:title', content: 'BIXLINK — BIXCOIN Staking' }, { property: 'og:description', content: 'Eight BIXLINK staking packages and an RWA ecosystem vision.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  component: Home,
});
const milestones = [['Q1 2026','Launch'],['Q2 2026','Staking App Beta'],['Q3 2026','RWA Listing'],['Q4 2026','Ecosystem'],['Q1 2027','DAO'],['Q2 2027','21 JUTA MILESTONE']];
function Home() {
  return <BixShell><main>
    <section className="hero-section relative overflow-hidden border-b border-border"><div className="hero-grid mx-auto grid max-w-7xl items-center gap-4 px-5 pb-12 pt-9 md:grid-cols-[1fr_0.9fr] md:px-8 md:pb-20 md:pt-16">
      <div className="relative z-10 order-2 text-center md:order-1 md:text-left"><div className="eyebrow"><span className="inline-block h-2 w-2 rounded-full bg-chart-2"/> THE NEXT ERA OF BIXCOIN</div>
        <h1 className="brand-hero mt-5 font-display text-6xl font-black md:text-8xl">BIXLINK</h1>
        <p className="mt-4 font-display text-xl font-bold uppercase leading-tight md:text-3xl">RWA NARRATIVE <span className="text-primary">STAKING</span> <span className="text-chart-2">TRICOLOR</span></p>
        <p className="mx-auto mt-5 max-w-lg text-sm leading-7 text-muted-foreground md:mx-0">STAKE BIXCOIN • EXCHANGE • DEFI • RWA NARRATIVE</p>
        <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-chart-3/40 bg-card px-4 py-2 text-xs font-bold text-chart-3"><Coins size={15}/> 21 JUTA BIX TOKEN <span className="text-muted-foreground">• Powered by BIXCOIN</span></div>
        <div className="mt-8 flex flex-wrap justify-center gap-3 md:justify-start"><Button asChild size="lg" className="rounded-full bg-chart-3 px-7 font-bold text-background hover:bg-chart-3/90"><Link to="/dashboard">START STAKING NOW <ArrowRight/></Link></Button><Button asChild size="lg" variant="outline" className="rounded-full border-chart-2 bg-transparent px-7 font-bold text-chart-2 hover:bg-chart-2/10 hover:text-chart-2"><a href="#roadmap">WHITEPAPER <ArrowUpRight/></a></Button></div>
      </div>
      <div className="relative order-1 flex h-[260px] items-center justify-center md:order-2 md:h-[440px]"><div className="hero-halo"/><img src={fox} width={1024} height={1024} alt="BIXLINK blue fox mascot in a gold-trimmed tech jacket" className="hero-fox relative z-10 h-full w-auto object-contain"/><div className="absolute bottom-2 right-0 z-20 rounded-2xl border border-primary/60 bg-card px-4 py-3 shadow-xl"><span className="block text-[10px] font-bold text-muted-foreground">APY BOOSTER</span><span className="text-2xl font-black text-chart-2">UP TO 25%</span></div></div>
    </div></section>
    <section className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24"><div className="mb-8 flex flex-col justify-between gap-3 md:flex-row md:items-end"><div><div className="eyebrow">CHOOSE YOUR PATH</div><h2 className="section-title">8 STAKING <span>PACKAGES</span></h2></div><p className="max-w-sm text-sm text-muted-foreground">From your first stake to legendary status. Find your place in the BIXLINK ecosystem.</p></div><PackageGrid packages={fallbackPackages}/></section>
    <section className="booster-band border-y border-border py-16"><div className="mx-auto grid max-w-7xl gap-10 px-5 md:grid-cols-2 md:items-center md:px-8"><div><div className="eyebrow text-chart-2"><Zap size={15}/> REWARDS ECOSYSTEM</div><h2 className="section-title">APY BOOSTER <span className="text-chart-2">ACTIVE</span></h2><p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">Earn up to 25% APY on eligible packages. Direct referral rewards and five matching-profit levels extend the ecosystem.</p><div className="mt-7 flex items-end gap-2 text-chart-2"><strong className="text-7xl font-black">25%</strong><span className="pb-3 text-sm font-bold">MAX APY<br/>BOOST</span></div></div><div className="grid grid-cols-2 gap-3"><div className="metric-panel col-span-2"><span className="text-xs text-muted-foreground">Direct referral</span><strong className="block text-3xl text-chart-3">10% instantly</strong></div>{[12,6,3,2,1].map((rate, i) => <div className="metric-panel" key={i}><span className="text-xs text-muted-foreground">LEVEL {i + 1}</span><strong className="block text-2xl text-chart-2">{rate}%</strong></div>)}<div className="metric-panel"><span className="text-xs text-muted-foreground">REWARDPLUS</span><strong className="block text-2xl text-chart-3">5%</strong></div></div></div><p className="mx-auto mt-7 max-w-7xl px-5 text-xs text-muted-foreground md:px-8"><Check size={14} className="mr-2 inline text-chart-2"/>RewardPlus is based on qualified weekly turnover with at least 3 direct members. Referral code example: BIX-267564.</p></section>
    <section id="roadmap" className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24"><div className="eyebrow">WHAT'S AHEAD</div><h2 className="section-title">THE <span>ROADMAP</span></h2><div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{milestones.map(([quarter,label], i) => <div className="roadmap-item" key={quarter}><span className="text-xs font-bold text-chart-2">0{i+1} / {quarter}</span><h3 className="mt-4 font-display text-xl font-bold">{label}</h3></div>)}</div></section>
  </main></BixShell>;
}
