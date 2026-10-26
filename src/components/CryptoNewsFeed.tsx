import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, TrendingDown, TrendingUp } from 'lucide-react';
import { getCryptoFeed } from '@/lib/crypto-news.functions';

function ago(iso: string) {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
}

export function CryptoNewsFeed() {
  const { data, isLoading } = useQuery({ queryKey: ['crypto-feed'], queryFn: () => getCryptoFeed(), staleTime: 60 * 60 * 1000, refetchInterval: 60 * 60 * 1000 });
  const coins = data?.coins ?? [];
  const news = data?.news ?? [];
  return (
    <section className="mx-auto max-w-6xl px-5 pb-16 md:px-8">
      <div className="eyebrow">LIVE GLOBAL MARKET</div>
      <h2 className="section-title">MARKET <span>TRENDING</span> & NEWS</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-chart-3/20 bg-card/50 p-4 backdrop-blur-md">
          <div className="mb-3 text-xs font-bold tracking-widest text-chart-3">TOP MOVERS 24H</div>
          {isLoading && <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-xl bg-muted/40" />)}</div>}
          {!isLoading && !coins.length && <p className="text-xs text-muted-foreground">Market data is currently unavailable.</p>}
          <ul className="space-y-2">
            {coins.map(c => {
              const up = c.change24h >= 0;
              return (
                <li key={c.id} className="flex items-center gap-3 rounded-xl border border-border/40 bg-background/30 px-3 py-2">
                  <img src={c.image} alt={c.name} className="h-7 w-7 rounded-full" loading="lazy" />
                  <div className="min-w-0 flex-1"><div className="text-sm font-bold">{c.symbol}</div><div className="truncate text-[11px] text-muted-foreground">{c.name}</div></div>
                  <div className="text-right"><div className="text-sm font-semibold tabular-nums">${c.price < 1 ? c.price.toFixed(4) : c.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
                    <div className={`flex items-center justify-end gap-1 text-[11px] font-bold tabular-nums ${up ? 'text-primary' : 'text-destructive'}`}>{up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{up ? '+' : ''}{c.change24h.toFixed(2)}%</div></div>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="rounded-2xl border border-chart-3/20 bg-card/50 p-4 backdrop-blur-md">
          <div className="mb-3 text-xs font-bold tracking-widest text-chart-3">LATEST CRYPTO NEWS</div>
          {isLoading && <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-muted/40" />)}</div>}
          {!isLoading && !news.length && <p className="text-xs text-muted-foreground">News is currently unavailable.</p>}
          <ul className="space-y-2">
            {news.map(n => (
              <li key={n.link}>
                <a href={n.link} target="_blank" rel="noopener noreferrer" className="group flex gap-2 rounded-xl border border-border/40 bg-background/30 px-3 py-2 transition hover:border-chart-3/40">
                  <div className="min-w-0 flex-1"><div className="line-clamp-2 text-sm font-semibold leading-snug">{n.title}</div><div className="mt-1 text-[11px] text-muted-foreground">{n.source} · {ago(n.published)}</div></div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-chart-3 opacity-60 group-hover:opacity-100" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mt-3 text-[10px] text-muted-foreground">Global market data from CoinGecko and news from public sources, automatically updated every 60 minutes. General information only, not investment advice, and unrelated to internal BIXLINK balances.</p>
    </section>
  );
}
