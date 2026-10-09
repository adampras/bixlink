import { Link } from '@tanstack/react-router';
import { ArrowRight, ArrowUpRight, Building2, CircleDollarSign, Globe2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LandingNarrative } from '@/components/LandingNarrative';
import { fallbackPackages, type Package } from '@/lib/bixlink';
import { ReactorVideo } from '@/components/ReactorVideo';
import heroObsidian from '@/assets/hero-obsidian-gold.jpg';
import { usePublicConfig, useMember } from '@/lib/useMember';
import { boosterMaximum } from '@/lib/booster-apy';

import { ContentImage } from '@/components/ContentImage';
import { ContentCarousel } from '@/components/ContentCarousel';
import { ContentLink } from '@/components/ContentLink';
import { LandingTokenomics } from '@/components/LandingTokenomics';
import { defaultLandingContent, defaultRoadmap, defaultSpaces, type LandingContent } from '@/lib/landing-content';
export { defaultLandingContent, type LandingContent } from '@/lib/landing-content';

export function LandingExperience({ packages = fallbackPackages, booster = true, compact = false, bixPrice = 0.84291, content = defaultLandingContent }: { packages?: Package[]; booster?: boolean; compact?: boolean; bixPrice?: number; content?: LandingContent }) {
  const { data: config } = usePublicConfig();
  const maximum = boosterMaximum(config?.booster.maxApy);
  const { user } = useMember();
  const hero3d = content.hero3dEnabled !== false;
  return <div className="reactor-landing">
    <section className={`hero-section relative overflow-hidden border-b border-border ${hero3d ? 'hero-3d' : ''}`}>
      {hero3d && <><ContentImage path={content.heroImage} alt="" fallbackSrc={heroObsidian} className="hero-3d-bg"/><div className="hero-3d-veil" aria-hidden/></>}
      <div className={`relative mx-auto flex max-w-3xl flex-col items-center px-5 pb-14 pt-12 text-center ${hero3d ? 'min-h-[92dvh] justify-center' : ''} ${compact ? 'md:pb-16 md:pt-14' : 'md:pb-20 md:pt-16'}`}>
        <div className="inline-flex items-center gap-2 rounded-full border border-chart-3/30 bg-chart-3/10 px-4 py-1.5 backdrop-blur-sm"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-chart-3"/><span className="text-[10px] font-bold uppercase tracking-[0.15em] text-chart-3">21 MILLION BIX TOKEN</span></div>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-chart-2/30 bg-card/50 px-3 py-1 backdrop-blur-sm"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-chart-2 opacity-60"/><span className="relative inline-flex h-2 w-2 rounded-full bg-chart-2"/></span><span className="text-[9px] font-bold uppercase tracking-[0.18em] text-chart-2">LEDGER ENGINE · ONLINE</span></div>
        <h1 className="mt-6 bg-gradient-to-b from-foreground via-chart-3 to-chart-3/60 bg-clip-text font-display text-6xl font-bold leading-[0.9] tracking-tighter text-transparent drop-shadow-[0_0_24px_hsl(var(--chart-3)/0.25)] md:text-8xl">BIXLINK</h1>
        <p className="mt-4 bg-gradient-to-r from-foreground via-chart-3 to-foreground bg-clip-text font-display text-sm font-semibold tracking-wider text-transparent md:text-base">Smart Staking. Real Utility. Infinite Horizon.</p>
        <div className="mt-3 flex flex-wrap justify-center gap-1.5 font-display text-[10px] font-medium uppercase tracking-[0.15em] md:text-xs"><span className="text-primary">STAKE BIXCOIN</span><span className="text-muted-foreground/50">•</span><span className="text-chart-2">EXCHANGE</span><span className="text-muted-foreground/50">•</span><span className="text-chart-3">DEFI</span><span className="text-muted-foreground/50">•</span><span className="text-foreground/80">RWA NARRATIVE</span></div>
        {!hero3d && <ReactorVideo maximum={maximum}/>}
        <div className="z-10 mt-6 grid w-full grid-cols-3 gap-2">
          <div className="flex flex-col items-center rounded-xl border border-border/60 bg-card/60 p-3 shadow-lg backdrop-blur-md"><span className="mb-1 text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Supply</span><span className="font-display text-[13px] font-bold">21.000.000</span></div>
          <div className="relative flex flex-col items-center overflow-hidden rounded-xl border border-primary/30 bg-card/60 p-3 shadow-lg backdrop-blur-md"><div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent"/><span className="relative z-10 mb-1 text-[8px] font-bold uppercase tracking-wider text-muted-foreground">BIX Booster APY</span><span className="relative z-10 font-display text-[13px] font-bold text-primary">8% – {maximum}%</span></div>
          <div className="flex flex-col items-center rounded-xl border border-border/60 bg-card/60 p-3 shadow-lg backdrop-blur-md"><span className="mb-1 text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Reference</span><span className="numeric font-display text-[13px] font-bold text-chart-2">${bixPrice.toFixed(6)}</span></div>
        </div>
        <div className="lux-cta z-10 mt-6 grid w-full grid-cols-2 gap-3">
          <Link to="/auth" className="lux-btn lux-btn--gold">LAUNCH APP <ArrowRight size={16}/></Link>
          <Link to="/register" className="lux-btn lux-btn--glass">DAFTAR AKUN <ArrowUpRight size={16}/></Link>
        </div>
      </div>
      <div className="lux-ticker" aria-label="BIXLINK protocol highlights"><div className="lux-ticker-track">{[0,1].map(k => <span key={k} aria-hidden={k===1}>{['21.000.000 BIX FIXED SUPPLY','DEFLATIONARY HALVING','NON-CUSTODIAL MODEL','RWA NARRATIVE','SMART CONTRACT READY','COMMUNITY TO DAO'].map(t => <b key={t}>◆ {t}</b>)}</span>)}</div></div>
    </section>
    {hero3d && <section className="mx-auto max-w-3xl px-5 py-10 text-center"><div className="eyebrow">CORE FOUNDATION</div><ReactorVideo maximum={maximum}/></section>}
    <LandingNarrative content={content}/>
    <section className="landing-ecosystem border-y border-border"><div className="mx-auto max-w-7xl px-5 py-14 md:px-8"><div className="eyebrow">THE BIXLINK ADVANTAGE</div><h2 className="section-title">PREMIUM <span>ECOSYSTEM</span></h2><div className="mt-8 grid gap-5 lg:grid-cols-2"><article className="ecosystem-column"><header><span className="ecosystem-icon text-primary"><Globe2/></span><div><small>CONNECTED UTILITY</small><h3>Ecosystem core</h3></div></header><div className="ecosystem-list">{content.ecosystem.map((item, index) => item.enabled === false ? null : <ContentLink group="ecosystem" index={index} item={item} key={`${item.title}-${index}`}><div><i/><div><ContentImage path={item.image} alt={item.title}/><h4>{item.title}</h4><p>{item.description}</p></div></div></ContentLink>)}</div></article><article className="ecosystem-column ecosystem-column--income"><header><span className="ecosystem-icon text-chart-3"><CircleDollarSign/></span><div><small>DISCLOSED SOURCES</small><h3>Income narrative</h3></div></header><div className="ecosystem-list">{content.income.map((item, index) => item.enabled === false ? null : <ContentLink group="income" index={index} item={item} key={`${item.title}-${index}`}><div><i/><div><ContentImage path={item.image} alt={item.title}/><h4>{item.title}</h4><p>{item.description}</p></div></div></ContentLink>)}</div></article></div><div className="ecosystem-disclosure"><ShieldCheck/><span>Public narratives are owner-managed. Recorded income is not presented as audited revenue or guaranteed return.</span><Building2/></div></div></section>
    <section className="mx-auto max-w-7xl px-5 py-8 md:px-8"><ContentCarousel group="spaces" title="Kategori Pengembangan" items={content.spaces ?? defaultSpaces}/></section>
    <LandingTokenomics content={content}/>
    <section className="mx-auto max-w-7xl px-5 py-14 md:px-8"><ContentCarousel group="roadmap" title="Roadmap BIXLINK" items={content.roadmap ?? defaultRoadmap}/></section>
    <section className="mx-auto max-w-3xl px-5 pb-16 md:px-8"><div className="eyebrow">FAQ</div><h2 className="section-title">PERTANYAAN <span>UMUM</span></h2><div className="mt-6 space-y-3">{FAQ.map(f => <details key={f.q} className="group rounded-2xl border border-chart-3/20 bg-card/50 p-4 backdrop-blur-md"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold">{f.q}<span className="text-chart-3 transition group-open:rotate-45">+</span></summary><p className="mt-3 text-xs leading-6 text-muted-foreground">{f.a}</p></details>)}</div></section>
    {!user && <Link to="/auth" className="lux-btn lux-btn--gold fixed bottom-4 right-4 z-40 h-11 px-5 text-xs shadow-2xl md:hidden">LAUNCH APP <ArrowRight size={14}/></Link>}
  </div>;
}
const FAQ = [
  { q: 'Apa itu BIXLINK?', a: 'BIXLINK adalah ekosistem staking BIXCOIN (21 juta BIX fixed supply) dengan narasi DeFi, exchange, dan RWA menuju tata kelola DAO.' },
  { q: 'Bagaimana cara kerja staking?', a: 'Member memilih paket USDT atau BIX BOOST. Imbal hasil yang ditampilkan adalah proyeksi, bukan jaminan, dan dicatat di ledger internal.' },
  { q: 'Apakah saldo internal sama dengan token on-chain?', a: 'Belum. Saldo di aplikasi adalah catatan ledger internal. Penarikan diproses melalui peninjauan dan verifikasi jaringan.' },
  { q: 'Kapan smart contract BIX dirilis?', a: 'Peluncuran smart contract mengikuti roadmap dan diumumkan resmi oleh tim. Jadwal roadmap adalah rencana, bukan jaminan.' },
];
