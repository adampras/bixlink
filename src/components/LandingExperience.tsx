import { Link } from '@tanstack/react-router';
import { ArrowRight, ArrowUpRight, Building2, CircleDollarSign, Globe2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LandingNarrative } from '@/components/LandingNarrative';
import { fallbackPackages, type Package } from '@/lib/bixlink';
import fox from '@/assets/bixlink-fox.png';

import { ContentImage } from '@/components/ContentImage';
import { IncomeCategoryCard } from '@/components/IncomeCategoryCard';
import { RoadmapCard } from '@/components/RoadmapCard';
import { ContentLink } from '@/components/ContentLink';
import { TokenomicsCard } from '@/components/TokenomicsCard';
import { defaultLandingContent, defaultRoadmap, defaultSpaces, type LandingContent } from '@/lib/landing-content';
export { defaultLandingContent, type LandingContent } from '@/lib/landing-content';

export function LandingExperience({ packages = fallbackPackages, booster = true, compact = false, bixPrice = 0.84291, content = defaultLandingContent }: { packages?: Package[]; booster?: boolean; compact?: boolean; bixPrice?: number; content?: LandingContent }) {
  return <div>
    <section className="hero-section relative overflow-hidden border-b border-border">
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-primary/20 blur-[110px]"/>
      <div className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-chart-2/10 blur-[110px]"/>
      <div className={`relative mx-auto flex max-w-3xl flex-col items-center px-5 pb-14 pt-12 text-center ${compact ? 'md:pb-16 md:pt-14' : 'md:pb-20 md:pt-16'}`}>
        <div className="inline-flex items-center gap-2 rounded-full border border-chart-3/30 bg-chart-3/10 px-4 py-1.5 backdrop-blur-sm"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-chart-3"/><span className="text-[10px] font-bold uppercase tracking-[0.15em] text-chart-3">21 MILLION BIX TOKEN</span></div>
        <h1 className="mt-6 bg-gradient-to-b from-foreground via-chart-3 to-chart-3/60 bg-clip-text font-display text-6xl font-bold leading-[0.9] tracking-tighter text-transparent md:text-8xl">BIXLINK</h1>
        <div className="mt-3 flex flex-wrap justify-center gap-1.5 font-display text-[10px] font-medium uppercase tracking-[0.15em] md:text-xs"><span className="text-primary">STAKE BIXCOIN</span><span className="text-muted-foreground/50">•</span><span className="text-chart-2">EXCHANGE</span><span className="text-muted-foreground/50">•</span><span className="text-chart-3">DEFI</span><span className="text-muted-foreground/50">•</span><span className="text-foreground/80">RWA NARRATIVE</span></div>
        <div className={`relative flex items-center justify-center ${compact ? 'h-[240px] md:h-[300px]' : 'h-[260px] md:h-[340px]'}`}>
          <div className="hero-halo"/>
          <img src={fox} width={1024} height={1024} alt="BIXLINK blue fox mascot in a gold-trimmed tech jacket" className="hero-fox relative z-10 h-full w-auto object-contain"/>
          {booster && <div className="absolute -right-1 top-2 z-20 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-primary via-chart-2 to-chart-3 p-[2px] shadow-[0_0_20px_oklch(0.87_0.29_142/30%)] md:-right-6"><div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-background p-2 text-center"><span className="text-[8px] font-bold uppercase leading-tight text-foreground/80">APY Booster</span><span className="mt-1 font-display text-sm font-bold leading-none text-chart-2">UP TO 25%</span></div></div>}
        </div>
        <div className="z-10 mt-6 grid w-full grid-cols-3 gap-2">
          <div className="flex flex-col items-center rounded-xl border border-border/60 bg-card/60 p-3 shadow-lg backdrop-blur-md"><span className="mb-1 text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Supply</span><span className="font-display text-[13px] font-bold">21.000.000</span></div>
          <div className="relative flex flex-col items-center overflow-hidden rounded-xl border border-primary/30 bg-card/60 p-3 shadow-lg backdrop-blur-md"><div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent"/><span className="relative z-10 mb-1 text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Staking APY</span><span className="relative z-10 font-display text-[13px] font-bold text-primary">8% – 25%</span></div>
          <div className="flex flex-col items-center rounded-xl border border-border/60 bg-card/60 p-3 shadow-lg backdrop-blur-md"><span className="mb-1 text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Reference</span><span className="numeric font-display text-[13px] font-bold text-chart-2">${bixPrice.toFixed(6)}</span></div>
        </div>
      </div>
    </section>
    <LandingNarrative content={content}/>
    <section className="landing-ecosystem border-y border-border"><div className="mx-auto max-w-7xl px-5 py-14 md:px-8"><div className="eyebrow">THE BIXLINK ADVANTAGE</div><h2 className="section-title">PREMIUM <span>ECOSYSTEM</span></h2><div className="mt-8 grid gap-5 lg:grid-cols-2"><article className="ecosystem-column"><header><span className="ecosystem-icon text-primary"><Globe2/></span><div><small>CONNECTED UTILITY</small><h3>Ecosystem core</h3></div></header><div className="ecosystem-list">{content.ecosystem.map((item, index) => item.enabled === false ? null : <ContentLink group="ecosystem" index={index} item={item} key={`${item.title}-${index}`}><div><i/><div><ContentImage path={item.image} alt={item.title}/><h4>{item.title}</h4><p>{item.description}</p></div></div></ContentLink>)}</div></article><article className="ecosystem-column ecosystem-column--income"><header><span className="ecosystem-icon text-chart-3"><CircleDollarSign/></span><div><small>DISCLOSED SOURCES</small><h3>Income narrative</h3></div></header><div className="ecosystem-list">{content.income.map((item, index) => item.enabled === false ? null : <ContentLink group="income" index={index} item={item} key={`${item.title}-${index}`}><div><i/><div><ContentImage path={item.image} alt={item.title}/><h4>{item.title}</h4><p>{item.description}</p></div></div></ContentLink>)}</div></article></div><div className="ecosystem-disclosure"><ShieldCheck/><span>Public narratives are owner-managed. Recorded income is not presented as audited revenue or guaranteed return.</span><Building2/></div></div></section>
    <section className="mx-auto max-w-7xl px-5 py-8 md:px-8"><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{(content.spaces ?? defaultSpaces).map((item, index) => item.enabled === false ? null : <ContentLink group="spaces" index={index} item={item} key={`${item.title}-${index}`}><IncomeCategoryCard item={item}/></ContentLink>)}</div></section>
    <section className="mx-auto max-w-7xl px-5 pt-14 md:px-8"><TokenomicsCard content={content}/></section>
    <section className="mx-auto max-w-7xl px-5 py-14 md:px-8"><div className="eyebrow">WHAT'S AHEAD</div><h2 className="section-title">THE <span>ROADMAP</span></h2><div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-3">{(content.roadmap ?? defaultRoadmap).map((item, i) => item.enabled !== false ? <ContentLink group="roadmap" index={i} item={item} key={`${item.title}-${i}`}><RoadmapCard item={item} index={i}/></ContentLink> : null)}</div></section>
  </div>;
}