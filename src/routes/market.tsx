import { createFileRoute, Link } from '@tanstack/react-router';
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query';
import { RefreshCw, Globe2, Newspaper, Lock } from 'lucide-react';
import { CryptoIcon } from '@/components/CryptoIcon';
import { Sparkline, SentimentGauge } from '@/components/TradingFlair';
import { BixShell } from '@/components/BixShell';
import { Button } from '@/components/ui/button';
import { getMarketUpdates } from '@/lib/updates.functions';
import { dateTime, money, number } from '@/lib/bixlink';
import { SponsorSlot } from '@/components/SponsorSlot';
import { usePublicConfig } from '@/lib/useMember';
import { HighlightsHub } from '@/components/HighlightsHub';

const marketQuery = queryOptions({ queryKey: ['bix-market-updates'], queryFn: () => getMarketUpdates(), staleTime: 60_000, refetchInterval: 60_000 });
export const Route = createFileRoute('/market')({
  loader: ({ context }) => context.queryClient.ensureQueryData(marketQuery),
  head: () => ({ meta: [{ title: 'Market & Updates — BIXLINK' }, { name: 'description', content: 'Major crypto prices and official BIXLINK project announcements, with a separate internal BIX reference.' }, { property: 'og:title', content: 'Market & Updates — BIXLINK' }, { property: 'og:description', content: 'Follow major coins and official BIXLINK updates.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: MarketPage,
  errorComponent: ({ reset }) => <BixShell><main className="mx-auto min-h-[60vh] max-w-5xl px-5 py-12"><h1 className="section-title">MARKET & UPDATES</h1><p className="mt-5 text-muted-foreground">Updates are temporarily unavailable.</p><Button className="mt-5" onClick={reset}><RefreshCw/> Retry</Button></main></BixShell>,
  notFoundComponent: () => <BixShell><main className="mx-auto max-w-5xl px-5 py-12">Market page unavailable.</main></BixShell>,
});
function MarketPage() {
  const { data, refetch, isFetching } = useSuspenseQuery(marketQuery);
  const { data: cfg } = usePublicConfig();
  return <BixShell><main className="mx-auto min-h-[70vh] max-w-6xl px-5 py-8 md:px-8 md:py-12">
    <Link to="/p2p" className="mb-5 flex items-center justify-between rounded-xl border border-primary/40 bg-card px-4 py-3 text-sm font-bold text-primary">P2P Market · buy &amp; sell BIX between members <span aria-hidden>→</span></Link>
    <div className="eyebrow"><Globe2 size={14}/> BIXLINK INTELLIGENCE</div>
    <div className="mt-3 flex items-center justify-between gap-3"><h1 className="font-display text-[26px] font-bold text-foreground md:text-3xl">Market & Updates</h1><Button size="icon" variant="ghost" aria-label="Refresh market" title="Refresh market" disabled={isFetching} onClick={() => refetch()}><RefreshCw size={18}/></Button></div>
    {!data.enabled ? <div className="mt-12 flex items-center gap-3 text-muted-foreground"><Lock size={20}/><p>Market & Updates is not open yet.</p></div> : <div className="mt-8 grid min-w-0 gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <section className="min-w-0"><div className="mb-5"><HighlightsHub/></div><div className="mb-6"><SentimentGauge/></div><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-lg font-bold">Major coins</h2><span className="text-[10px] font-bold text-chart-2">{data.markets.length ? '● AUTO UPDATE · 60S' : 'FEED UNAVAILABLE'}</span></div>
        <p className="mt-2 text-[11px] text-muted-foreground">{data.marketUpdatedAt ? `Last received: ${dateTime(data.marketUpdatedAt)}` : 'No current market data available.'}</p>
        <div className="mt-4"><div className="grid grid-cols-[minmax(0,1fr)_6rem_minmax(0,1fr)_4rem] gap-2 border-b border-border py-3 text-[10px] text-muted-foreground"><span>ASSET</span><span className="text-center">24H CHART</span><span className="text-right">USD</span><span className="text-right">24H</span></div>{data.markets.map(asset => <div key={asset.id} className="grid grid-cols-[minmax(0,1fr)_6rem_minmax(0,1fr)_4rem] items-center gap-2 border-b border-border py-5"><div className="flex min-w-0 items-center gap-2"><CryptoIcon symbol={asset.symbol}/><div className="min-w-0"><b className="text-sm">{asset.symbol}</b><span className="mt-1 block truncate text-[10px] text-muted-foreground">{asset.name}</span></div></div><Sparkline points={asset.sparkline ?? []} up={asset.change24h >= 0}/><b className="numeric break-all text-right text-sm">{number(asset.price, { minimumFractionDigits: asset.price < 1 ? 4 : 2, maximumFractionDigits: asset.price < 1 ? 4 : 2 })}</b><span className={`numeric text-right text-xs ${asset.change24h >= 0 ? 'text-chart-2' : 'text-destructive'}`}>{asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%</span></div>)}</div>
        {!data.markets.length && <p className="py-10 text-sm leading-6 text-muted-foreground">The global price source is temporarily unavailable. No replacement prices are shown.</p>}
        <p className="mt-4 text-xs leading-6 text-muted-foreground">Source: Binance USDT pairs. Quotes may be delayed; not investment advice.</p>
        <div className="mt-8 border-t border-border pt-5"><div className="flex flex-wrap justify-between gap-3"><h2 className="font-display text-lg font-bold">BIX internal reference</h2><b className="numeric text-chart-3">{money(data.bixPriceUsd, { minimumFractionDigits: 6, maximumFractionDigits: 6 })}</b></div><p className="mt-3 text-xs leading-6 text-muted-foreground">Owner-managed ledger reference per BIX. Separate from global market prices; no exchange execution. BIXCOIN · No SC.</p></div>
      </section>
      <section className="min-w-0"><div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-display text-lg font-bold"><Newspaper size={17}/> Latest updates</h2><span className="text-[10px] text-muted-foreground">OFFICIAL</span></div>{data.announcements.length ? data.announcements.map(post => <article key={post.id} className="border-b border-border py-6"><span className="text-[10px] font-bold text-primary">{post.category}</span><h3 className="mt-3 break-words font-display text-base font-bold leading-6">{post.title}</h3><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">{post.body}</p><time className="mt-4 block text-[10px] text-muted-foreground">{post.published_at ? dateTime(post.published_at) : ''}</time></article>) : <p className="mt-8 text-sm leading-6 text-muted-foreground">No official announcements published yet.</p>}</section>
    </div>}
    <SponsorSlot sponsor={cfg?.landingContent.sponsor}/>
  </main></BixShell>;
}