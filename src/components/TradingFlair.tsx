import { useQuery } from '@tanstack/react-query';
import { getHomeMarketData } from '@/lib/market.functions';
import { getMarketSentiment } from '@/lib/sentiment.functions';
import { CryptoIcon } from '@/components/CryptoIcon';

export function Sparkline({ points, up, width = 96, height = 28 }: { points: number[]; up: boolean; width?: number; height?: number }) {
  if (points.length < 2) return null;
  const min = Math.min(...points), max = Math.max(...points), span = max - min || 1;
  const d = points.map((p, i) => `${(i / (points.length - 1)) * width},${height - 2 - ((p - min) / span) * (height - 4)}`).join(' ');
  return <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className={up ? 'text-chart-2' : 'text-destructive'}>
    <polyline points={`0,${height} ${d} ${width},${height}`} fill="currentColor" opacity=".12" stroke="none"/>
    <polyline points={d} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
  </svg>;
}

export function MarketTicker() {
  const { data } = useQuery({ queryKey: ['market-ticker'], queryFn: () => getHomeMarketData(), staleTime: 60_000, refetchInterval: 60_000 });
  if (!data) return <div className="market-ticker" aria-hidden/>;
  const items = [...data.markets.map(m => ({ s: m.symbol, p: m.price, c: m.change24h as number | null })), { s: 'BIX', p: data.bixPriceUsd, c: null }];
  const row = items.map(i => <span key={i.s} className="market-ticker-item"><CryptoIcon symbol={i.s} size={16}/><b>{i.s}</b><span className="numeric">${i.p.toLocaleString('en-US', { maximumFractionDigits: i.p < 1 ? 6 : 2 })}</span>{i.c === null ? <em className="text-chart-3">REF</em> : <em className={i.c >= 0 ? 'text-chart-2' : 'text-destructive'}>{i.c >= 0 ? '▲' : '▼'} {Math.abs(i.c).toFixed(2)}%</em>}</span>);
  return <div className="market-ticker" data-no-translate aria-label="Live market ticker"><div className="market-ticker-track">{row}{row}</div></div>;
}

export function SentimentGauge() {
  const { data, isLoading } = useQuery({ queryKey: ['market-sentiment'], queryFn: () => getMarketSentiment(), staleTime: 3_600_000 });
  const v = data?.value ?? 50;
  const tone = v < 25 ? 'text-destructive' : v < 45 ? 'text-chart-4' : v < 56 ? 'text-muted-foreground' : 'text-chart-2';
  return <div className="sentiment-card" data-no-translate>
    <div className="flex items-center justify-between"><span className="text-[10px] font-bold tracking-widest text-muted-foreground">CRYPTO FEAR &amp; GREED</span><span className="text-[10px] text-muted-foreground">GLOBAL · DAILY</span></div>
    {isLoading ? <div className="mt-4 h-10 animate-pulse rounded bg-muted"/> : !data ? <p className="mt-4 text-xs text-muted-foreground">Sentiment feed unavailable.</p> : <>
      <div className="mt-3 flex items-end gap-3"><b className={`numeric font-display text-3xl ${tone}`}>{v}</b><span className={`pb-1 text-sm font-bold ${tone}`}>{data.label}</span></div>
      <div className="sentiment-bar mt-3"><i style={{ left: `${v}%` }}/></div>
      <div className="mt-1 flex justify-between text-[9px] text-muted-foreground"><span>FEAR</span><span>NEUTRAL</span><span>GREED</span></div>
    </>}
    <p className="mt-3 text-[10px] leading-4 text-muted-foreground">Source: alternative.me. General market mood only — not investment advice and unrelated to internal balances.</p>
  </div>;
}
