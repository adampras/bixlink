import { useQuery } from '@tanstack/react-query';
import { getHomeMarketData } from '@/lib/market.functions';
import { number } from '@/lib/bixlink';

/** Live market ribbon: public spot feed + owner BIX reference (labelled internal). Display only. */
export function MarketTicker() {
  const { data } = useQuery({ queryKey: ['market-ticker'], queryFn: () => getHomeMarketData(), refetchInterval: 60_000, staleTime: 30_000 });
  if (!data) return null;
  const items = [
    ...data.markets.map(m => ({ s: m.symbol, p: m.price, c: m.change24h, spark: m.sparkline })),
  ];
  const row = <>
    <span className="ticker-item"><b>BIX</b><span className="numeric">${number(data.bixPriceUsd, { maximumFractionDigits: 6 })}</span><em className="text-muted-foreground">Ref. internal</em></span>
    {items.map(i => <span key={i.s} className="ticker-item"><b>{i.s}</b><span className="numeric">${number(i.p, { maximumFractionDigits: i.p < 1 ? 5 : 2 })}</span><em className={`numeric ${i.c >= 0 ? 'text-chart-2' : 'text-destructive'}`}>{i.c >= 0 ? '▲' : '▼'} {Math.abs(i.c).toFixed(2)}%</em><Spark v={i.spark} up={i.c >= 0}/></span>)}
  </>;
  return <div className="market-ticker" aria-label="Live market prices">
    <div className="market-ticker__track">{row}<span aria-hidden className="contents">{row}</span></div>
  </div>;
}

function Spark({ v, up }: { v: number[]; up: boolean }) {
  if (v.length < 2) return null;
  const min = Math.min(...v), max = Math.max(...v), r = max - min || 1;
  const d = v.map((x, n) => `${(n / (v.length - 1)) * 40},${14 - ((x - min) / r) * 12}`).join(' ');
  return <svg width="40" height="16" aria-hidden className={up ? 'text-chart-2' : 'text-destructive'}><polyline points={d} fill="none" stroke="currentColor" strokeWidth="1.4"/></svg>;
}
