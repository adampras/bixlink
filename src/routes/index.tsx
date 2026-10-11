import { Crown, Swords, ShoppingBag } from 'lucide-react';
import { SentimentGauge } from '@/components/TradingFlair';
import { createFileRoute, Link } from '@tanstack/react-router';
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { ArrowDownToLine, ArrowUpFromLine, ArrowUpRight, Coins, Database, Globe2, RefreshCw, ShieldCheck, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BixShell } from '@/components/BixShell';
import { getHomeMarketData } from '@/lib/market.functions';
import { money, number } from '@/lib/bixlink';
import { MemberGate } from '@/components/MemberGate';
import { useMember, usePublicConfig } from '@/lib/useMember';
import { usePresaleStatus, presaleOpen } from '@/components/PresaleEntry';
import { LandingExperience } from '@/components/LandingExperience';
import { ContentCarousel } from '@/components/ContentCarousel';
import { defaultRoadmap, defaultSpaces } from '@/lib/landing-content';
import { LandingTokenomics } from '@/components/LandingTokenomics';
import { PreTgeRoadmap } from '@/components/PreTgeRoadmap';
import { TrustCenter } from '@/components/TrustCenter';
import { ReserveTelemetry } from '@/components/InstitutionalSuite';
import { ProtocolStatus } from '@/components/ProtocolStatus';
import { SponsorSlot } from '@/components/SponsorSlot';
import { InternalMarket } from '@/components/InternalMarket';
import { CryptoIcon } from '@/components/CryptoIcon';
import { LiveActivityToast, PresaleStageBar } from '@/components/GrowthSuite';

const homeQuery = queryOptions({ queryKey: ['bix-home-market'], queryFn: () => getHomeMarketData(), staleTime: 60_000, refetchInterval: 60_000 });

export const Route = createFileRoute('/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(homeQuery),
  errorComponent: HomeError,
  notFoundComponent: () => <div className="p-10">Market overview unavailable.</div>,
  head: () => ({ meta: [{ title: 'HOME Market & Staking Statistics — BIXLINK' }, { name: 'description', content: 'BIXLINK internal BIX/USDT reference market, staking statistics, tokenomics, RWA model and roadmap.' }, { property: 'og:title', content: 'BIXLINK Market & Staking Statistics' }, { property: 'og:description', content: 'Track the BIXLINK internal market reference, staking ecosystem and global crypto prices.' }, { property: 'og:type', content: 'website' }, { property: 'og:image', content: 'https://bixlink.lovable.app/__l5e/assets-v1/c44e33af-5cb2-4bf8-9d9f-ce8af06b3e8b/bix-reactor-poster.jpg' }, { name: 'twitter:card', content: 'summary_large_image' }, { name: 'twitter:image', content: 'https://bixlink.lovable.app/__l5e/assets-v1/c44e33af-5cb2-4bf8-9d9f-ce8af06b3e8b/bix-reactor-poster.jpg' }] }),
  component: Home,
});

function HomeError() { return <BixShell><main className="mx-auto max-w-4xl px-5 py-24 text-center"><h1 className="section-title">HOME DATA <span>UNAVAILABLE</span></h1><p className="mt-4 text-muted-foreground">The market feed could not load. Please refresh shortly.</p></main></BixShell>; }

function Home() {
  const { user, ready, data: member } = useMember();
  const perSecond = (member?.stakes ?? []).filter(s => s.status === 'active').reduce((n, s) => n + Number(s.amount_usd) * Number(s.apy) / 100 / 365 / 86400, 0);
  const { data } = useSuspenseQuery(homeQuery);
  const { data: cfg } = usePublicConfig();
  const showOverview = cfg?.readiness.homeOverviewEnabled ?? false;
  const stats = (data.stats ?? {}) as { active_stakes?: number; total_staked_usd?: number; members?: number; average_apy?: number; income?: Array<{ category: string; amount_usd: number }> };
  const income = stats.income ?? [];
  const recordedStake = Number(stats.total_staked_usd ?? 0);
  const idrReference = recordedStake * 16250;
  const bixPrice = Number(data.bixPriceUsd ?? 0.84291);
  const presale = usePresaleStatus(user?.id);
  const presaleVisible = Boolean(user) && presaleOpen(presale.data);

  const rd = cfg?.readiness;
  if (!user) return <BixShell><div className="relative"><LandingExperience {...(cfg ? { packages: cfg.packages, booster: cfg.booster.enabled, bixPrice: cfg.bixMarket.priceUsd, content: cfg.landingContent } : {})}/>{rd?.presaleStageEnabled !== false && <PresaleStageBar/>}</div>{rd?.liveActivityEnabled !== false && <LiveActivityToast/>}</BixShell>;
  return <BixShell><MemberGate ready={ready} signedIn={!!user} title="HOME"><main>
    <section className="mx-auto grid max-w-7xl gap-6 px-5 pt-6 pb-6 md:px-8 lg:grid-cols-[1.05fr_1fr]"><InternalMarket reference={bixPrice} movement={data.movement} serverNow={data.serverNow}/>
      <div className="terminal-market min-w-0"><div className="terminal-market-head"><div><div className="eyebrow">GLOBAL MARKET WATCH</div><h2>Major assets</h2></div>{data.marketUpdatedAt && <span className="terminal-live"><i/> LIVE · 60S</span>}</div><div className="terminal-watchlist">{data.markets.length ? data.markets.map((asset,index) => <div key={asset.id} className="terminal-asset"><CryptoIcon symbol={asset.symbol} size={32}/><div className="min-w-0"><b>{asset.symbol}</b><span>{asset.name}</span></div><svg viewBox="0 0 100 28" role="img" aria-label={`${asset.symbol} 24 hour chart`}><polyline fill="none" stroke={asset.change24h >= 0 ? 'var(--chart-2)' : 'var(--destructive)'} strokeWidth="2" points={asset.sparkline.map((price,sparkIndex)=>{const low=Math.min(...asset.sparkline),high=Math.max(...asset.sparkline),range=high-low||1;return `${(sparkIndex/Math.max(asset.sparkline.length-1,1))*100},${26-((price-low)/range)*24}`;}).join(' ')}/></svg><div className="numeric text-right"><strong>{asset.price < 1 ? `$${asset.price.toFixed(4)}` : money(asset.price)}</strong><span className={asset.change24h >= 0 ? 'text-chart-2' : 'text-destructive'}>{asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%</span></div></div>) : <div className="py-14 text-center text-sm text-muted-foreground">Global feed is temporarily unavailable. Internal BIX data remains available.</div>}</div><div className="terminal-foot"><Globe2 size={13}/> Global USD feed · Local IDR context · Data may be delayed</div></div>
    </section>
    {showOverview && <section className="border-b border-border"><div className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-8">
      <div className="terminal-overview"><div className="terminal-balance sovereign-card"><div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">Recorded staking value</span><span className="terminal-status"><i/> PROTOCOL SECURE · LIVE LEDGER</span></div><strong className="numeric mt-3 block text-4xl text-foreground">{money(recordedStake)}</strong><span className="numeric mt-1 block text-xs uppercase text-muted-foreground">≈ IDR {number(idrReference, { maximumFractionDigits: 0 })} · Reference only</span>{perSecond > 0 && <span className="yield-ticker numeric mt-3"><i/> +${perSecond.toFixed(8)} / sec · LIVE PROJECTION</span>}<div className="mt-6 grid grid-cols-3 gap-2"><Button asChild size="sm" className="terminal-action"><Link to="/wallet"><ArrowDownToLine/> Deposit</Link></Button><Button asChild size="sm" variant="outline" className="terminal-action"><Link to="/wallet"><ArrowUpFromLine/> Withdraw</Link></Button><Button asChild size="sm" variant="outline" className="terminal-action"><Link to="/wallet"><RefreshCw/> Swap</Link></Button></div></div>
        <div className="terminal-kpis">{[["Active stakes",String(stats.active_stakes ?? 0),TrendingUp],["Network members",String(stats.members ?? 0),Globe2],["Average APY",`${Number(stats.average_apy ?? 0).toFixed(2)}%`,Coins]].map(([label,value,Icon],i) => { const I = Icon as typeof Coins; return <div className={`terminal-kpi accent-${i%3}`} key={String(label)}><I/><span>{String(label)}</span><strong>{String(value)}</strong></div>; })}</div></div>
    </div></section>}
    <section className="mx-auto max-w-7xl px-5 pb-6 md:px-8"><div className={`grid gap-2 ${presaleVisible ? 'grid-cols-3' : 'grid-cols-2'}`}>{presaleVisible && <Link to="/presale" className="flex min-w-0 flex-col gap-1 rounded-xl border border-primary/40 bg-primary/10 p-3 text-xs font-bold"><Crown size={16}/><span className="truncate">PRESALE</span><small className="truncate font-normal text-muted-foreground">$500 – $10K</small></Link>}<Link to="/arena" className="flex min-w-0 flex-col gap-1 rounded-xl border border-chart-2/40 bg-chart-2/10 p-3 text-xs font-bold"><Swords size={16}/><span className="truncate">FOX ARENA</span><small className="truncate font-normal text-muted-foreground">Daily missions</small></Link><Link to="/nft-marketplace" className="flex min-w-0 flex-col gap-1 rounded-xl border border-border bg-card p-3 text-xs font-bold"><ShoppingBag size={16}/><span className="truncate">MARKETPLACE</span><small className="truncate font-normal text-muted-foreground">NFT & merch</small></Link></div></section>
    <section className="mx-auto max-w-7xl px-5 pb-6 md:px-8"><SentimentGauge/></section>
    {rd?.liveActivityEnabled !== false && <LiveActivityToast/>}
    <PreTgeRoadmap/>
    <TrustCenter bixPrice={bixPrice} serverNow={data.serverNow}/>
    <ReserveTelemetry/>
    <ProtocolStatus serverNow={data.serverNow} marketCount={data.markets.length}/>
    <SponsorSlot sponsor={cfg?.landingContent.sponsor}/>
    <LandingTokenomics content={cfg?.landingContent} member/>
    <section className="border-b border-border bg-card/35"><div className="mx-auto max-w-7xl px-5 py-10 md:px-8"><ContentCarousel group="spaces" title="Kategori Pengembangan" items={cfg?.landingContent.spaces ?? defaultSpaces}/></div></section>
    <section className="mx-auto max-w-7xl px-5 py-14 md:px-8"><div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]"><div><div className="eyebrow"><Database size={13}/> RECORDED SOURCES</div><h2 className="section-title">INCOME <span>OVERVIEW</span></h2><div className="mt-6 space-y-2">{income.length ? income.map(row => <div className="flex justify-between rounded-lg border border-border bg-card p-4" key={row.category}><span>{row.category}</span><b className="text-chart-3">{money(Number(row.amount_usd))}</b></div>) : <p className="text-sm text-muted-foreground">No verified income source has been recorded by the owner yet.</p>}</div><p className="mt-4 text-xs text-muted-foreground">Values shown are owner-entered internal records, not audited revenue.</p></div><div className="min-w-0"><ContentCarousel group="roadmap" title="Roadmap BIXLINK" items={cfg?.landingContent.roadmap ?? defaultRoadmap}/></div></div></section>
  </main></MemberGate></BixShell>;
}