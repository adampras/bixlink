import { Link } from '@tanstack/react-router';
import { Building2, CircleDollarSign, Globe2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LandingNarrative } from '@/components/LandingNarrative';
import { fallbackPackages, type Package } from '@/lib/bixlink';
import coinCutout from '@/assets/bixcoin-cutout.png';
import vaultBg from '@/assets/coin-vault-bg.jpg';
import heroObsidian from '@/assets/hero-obsidian-gold.jpg';
import { usePublicConfig, useMember } from '@/lib/useMember';
import { boosterMaximum } from '@/lib/booster-apy';
import { HeroFlux, HeroPresaleRibbon } from '@/components/GrowthSuite';

import { ContentImage } from '@/components/ContentImage';
import { ContentCarousel } from '@/components/ContentCarousel';
import { ContentLink } from '@/components/ContentLink';
import { LandingTokenomics } from '@/components/LandingTokenomics';
import { PoweredBy } from '@/components/PoweredBy';
import { NationAlliance } from '@/components/NationAlliance';
import { PreTgeRoadmap } from '@/components/PreTgeRoadmap';
import { TrustCenter } from '@/components/TrustCenter';
import { CryptoNewsFeed } from '@/components/CryptoNewsFeed';
import { defaultLandingContent, defaultRoadmap, defaultSpaces, type LandingContent } from '@/lib/landing-content';
export { defaultLandingContent, type LandingContent } from '@/lib/landing-content';

export function LandingExperience({ packages = fallbackPackages, booster = true, compact = false, bixPrice = 0.84291, content = defaultLandingContent }: { packages?: Package[]; booster?: boolean; compact?: boolean; bixPrice?: number; content?: LandingContent }) {
  const { data: config } = usePublicConfig();
  const maximum = boosterMaximum(config?.booster.maxApy);
  const { user } = useMember();
  const hero3d = content.hero3dEnabled !== false;
  return <div className="reactor-landing">
    <section className={`hero-section landing-hero-compact relative overflow-hidden border-b border-border ${hero3d ? 'hero-3d' : ''}`}>
      {hero3d && <><ContentImage path={content.heroImage} alt="" fallbackSrc={heroObsidian} className="hero-3d-bg"/><div className="hero-3d-veil" aria-hidden/><div className="hero-fox-eyes" aria-hidden><i/><i/></div></>}
      {config?.readiness.heroAnimEnabled !== false && <HeroFlux/>}
      <div className={`landing-hero-content relative mx-auto flex max-w-3xl flex-col items-center justify-center px-5 text-center ${compact ? 'is-compact' : ''}`}>
        <h1 className="hero-title mt-3 text-6xl leading-[0.9] md:text-8xl">BIXLINK</h1>
        <p className="hero-tagline mt-4">Sovereign Staking Infrastructure</p>
      </div>
      <div className="lux-ticker" aria-label="BIXLINK protocol highlights"><div className="lux-ticker-track">{[0,1].map(k => <span key={k} aria-hidden={k===1}>{['21.000.000 BIX FIXED SUPPLY','DEFLATIONARY HALVING','NON-CUSTODIAL MODEL','RWA NARRATIVE','SMART CONTRACT READY','COMMUNITY TO DAO'].map(t => <b key={t}>◆ {t}</b>)}</span>)}</div></div>
    </section>
    {config?.readiness.presaleStageEnabled !== false && <div className="landing-presale-band"><HeroPresaleRibbon/></div>}
    <section className="mx-auto max-w-3xl px-5 pt-5 pb-2 text-center md:py-10"><div className="eyebrow justify-center">OFFICIAL BIXCOIN</div><div className="coin-stage coin-stage--vault" aria-label="BIXCOIN official coin"><img src={vaultBg} alt="" aria-hidden className="coin-vault-art"/><div className="coin-embers" aria-hidden>{Array.from({length:14},(_,i)=><i key={i} style={{left:`${6+i*6.5}%`,animationDelay:`${(i*0.53)%7}s`,animationDuration:`${6+(i%4)}s`,['--dx' as string]:`${(i%2?1:-1)*(8+i%5*4)}px`}}/>)}</div><div className="coin-float"><img src={coinCutout} alt="BIXCOIN official gold coin" className="coin-3d" width={260} height={260}/></div><div className="coin-pedestal" aria-hidden><span/></div><div className="coin-caption"><span>21,000,000 BIX · FIXED SUPPLY</span><strong>BIX BOOSTER UP TO {maximum}% · PROJECTION</strong></div></div></section>
    <PoweredBy slim/>
    <NationAlliance/>
    <LandingNarrative content={content}/>
    <section className="landing-ecosystem border-y border-border"><div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-14"><div className="eyebrow">THE BIXLINK ADVANTAGE</div><h2 className="section-title">PREMIUM <span>ECOSYSTEM</span></h2><div className="mt-5 grid gap-4 md:mt-8 md:gap-5 lg:grid-cols-2"><article className="ecosystem-column"><header><span className="ecosystem-icon text-primary"><Globe2/></span><div><small>CONNECTED UTILITY</small><h3>Ecosystem core</h3></div></header><div className="ecosystem-list">{content.ecosystem.map((item, index) => item.enabled === false ? null : <ContentLink group="ecosystem" index={index} item={item} key={`${item.title}-${index}`}><div><i/><div><ContentImage path={item.image} alt={item.title}/><h4>{item.title}</h4><p>{item.description}</p></div></div></ContentLink>)}</div></article><article className="ecosystem-column ecosystem-column--income"><header><span className="ecosystem-icon text-chart-3"><CircleDollarSign/></span><div><small>DISCLOSED SOURCES</small><h3>Income narrative</h3></div></header><div className="ecosystem-list">{content.income.map((item, index) => item.enabled === false ? null : <ContentLink group="income" index={index} item={item} key={`${item.title}-${index}`}><div><i/><div><ContentImage path={item.image} alt={item.title}/><h4>{item.title}</h4><p>{item.description}</p></div></div></ContentLink>)}</div></article></div><div className="ecosystem-disclosure"><ShieldCheck/><span>Public narratives are owner-managed. Recorded income is not presented as audited revenue or guaranteed return.</span><Building2/></div></div></section>
    <section className="mx-auto max-w-7xl px-5 py-8 md:px-8"><ContentCarousel group="spaces" title="Kategori Pengembangan" items={content.spaces ?? defaultSpaces}/></section>
    <PreTgeRoadmap/>
    <TrustCenter bixPrice={bixPrice}/>
    <LandingTokenomics content={content}/>
    <section className="mx-auto max-w-7xl px-5 py-14 md:px-8"><ContentCarousel group="roadmap" title="Roadmap BIXLINK" items={content.roadmap ?? defaultRoadmap}/></section>
    <CryptoNewsFeed />
    <section className="mx-auto max-w-3xl px-5 pb-16 md:px-8"><div className="eyebrow">FAQ</div><h2 className="section-title">PERTANYAAN <span>UMUM</span></h2><div className="mt-6 space-y-3">{FAQ.map(f => <details key={f.q} className="group rounded-2xl border border-chart-3/20 bg-card/50 p-4 backdrop-blur-md"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold">{f.q}<span className="text-chart-3 transition group-open:rotate-45">+</span></summary><p className="mt-3 text-xs leading-6 text-muted-foreground">{f.a}</p></details>)}</div></section>
  </div>;
}
const FAQ = [
  { q: 'Apa itu BIXLINK?', a: 'BIXLINK adalah ekosistem staking BIXCOIN (21 juta BIX fixed supply) dengan narasi DeFi, exchange, dan RWA menuju tata kelola DAO.' },
  { q: 'Bagaimana cara kerja staking?', a: 'Member memilih paket USDT atau BIX BOOST. Imbal hasil yang ditampilkan adalah proyeksi, bukan jaminan, dan dicatat di ledger internal.' },
  { q: 'Apakah saldo internal sama dengan token on-chain?', a: 'Belum. Saldo di aplikasi adalah catatan ledger internal. Penarikan diproses melalui peninjauan dan verifikasi jaringan.' },
  { q: 'Kapan smart contract BIX dirilis?', a: 'Peluncuran smart contract mengikuti roadmap dan diumumkan resmi oleh tim. Jadwal roadmap adalah rencana, bukan jaminan.' },
];
