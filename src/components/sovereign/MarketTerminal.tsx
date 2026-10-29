import { useEffect, useId, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Flame, Gem, Search, Star, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { marketScope, readMarketSnapshot, type MarketQuote } from '@/lib/sovereign-market';

const API = 'https://data-api.binance.vision/api/v3';
const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: n < 1 ? 6 : 2 });
type Point = { time: number; price: number };
type Depth = { bids: string[][]; asks: string[][] };
export function MarketChart({ symbol }: { symbol: string | null }) {
  const [interval, setInterval] = useState('1h');
  const [points, setPoints] = useState<Point[]>([]);
  const [state, setState] = useState('loading');
  const id = useId().replace(/:/g, '');
  useEffect(() => {
    if (!symbol) { setPoints([]); setState('reference'); return; }
    const key = `sov-chart:${symbol}:${interval}`;
    const cached = readMarketSnapshot<Point[]>(localStorage.getItem(key));
    setPoints(cached?.data ?? []); setState(cached ? 'cached' : 'loading');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    void fetch(`${API}/klines?symbol=${symbol}&interval=${interval}&limit=72`, { signal: controller.signal }).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then((rows: unknown[][]) => {
      const data = rows.map(r => ({ time: Number(r[0]), price: Number(r[4]) })).filter(r => Number.isFinite(r.time) && Number.isFinite(r.price));
      if (data.length < 2) throw new Error();
      setPoints(data); setState('live');
      try { localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data })); } catch { /* storage full */ }
    }).catch(() => { if (!controller.signal.aborted || timeout) setState(cached ? 'cached' : 'unavailable'); }).finally(() => clearTimeout(timeout));
    return () => { controller.abort(); clearTimeout(timeout); };
  }, [symbol, interval]);
  const up = (points.at(-1)?.price ?? 0) >= (points[0]?.price ?? 0);
  return <div className="sw-terminal-chart">
    <div className="sw-chart-tools">{['15m', '1h', '4h', '1d', '1w'].map(i => <Button variant="wallet" size="wallet" key={i} aria-pressed={interval === i} onClick={() => setInterval(i)}>{i.toUpperCase()}</Button>)}</div>
    {points.length > 1 ? <div className={up ? 'sw-chart-positive' : 'sw-chart-negative'}><ResponsiveContainer width="100%" height={200}><AreaChart data={points} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}><defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="currentColor" stopOpacity={0.35}/><stop offset="1" stopColor="currentColor" stopOpacity={0}/></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4"/><XAxis dataKey="time" tickFormatter={v => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }} minTickGap={48}/><YAxis hide domain={['dataMin', 'dataMax']}/><Tooltip labelFormatter={v => new Date(Number(v)).toLocaleString()} formatter={v => [`$${fmt(Number(v))}`, 'Price']} contentStyle={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)', borderRadius: 8 }} cursor={{ stroke: 'var(--primary)', strokeDasharray: '3 3' }}/><Area type="monotone" dataKey="price" stroke="currentColor" fill={`url(#${id})`} strokeWidth={2} isAnimationActive={false}/></AreaChart></ResponsiveContainer></div> : state === 'loading' ? <div className="sw-skeleton h-48" aria-label="Loading market data"/> : <div className="sw-market-empty">{symbol ? 'Market data unavailable' : 'BIX internal reference · No exchange market'}</div>}
    <p className="sw-muted text-xs mt-2">{state === 'cached' ? 'Offline snapshot · last saved prices, not live' : state === 'live' ? 'Binance public candles · drag to inspect' : 'Market data only · no trading execution'}</p>
    {points.length > 1 && <div className="sw-market-stats"><span>Range high<b>${fmt(Math.max(...points.map(p => p.price)))}</b></span><span>Range low<b>${fmt(Math.min(...points.map(p => p.price)))}</b></span></div>}
  </div>;
}
function MarketDepth({ symbol }: { symbol: string }) {
  const [depth, setDepth] = useState<Depth | null>(null);
  useEffect(() => { setDepth(null); const c = new AbortController(); const load = () => { void fetch(`${API}/depth?symbol=${symbol}USDT&limit=5`, { signal: c.signal }).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(d => { if (Array.isArray(d.bids) && Array.isArray(d.asks)) setDepth(d); }).catch(() => {}); }; load(); const timer = setInterval(load, 15000); return () => { clearInterval(timer); c.abort(); }; }, [symbol]);
  return <section className="sw-depth mt-5"><div className="flex justify-between text-sm"><b>Market depth</b><small className="sw-muted">Binance · {symbol}/USDT</small></div>{depth ? <div className="grid grid-cols-2 gap-4 mt-3">{(['bids', 'asks'] as const).map(side => <div key={side}><small className={side === 'bids' ? 'sw-up' : 'sw-down'}>{side === 'bids' ? 'Bid' : 'Ask'} · Quantity</small>{depth[side].slice(0, 5).map(([price, quantity], i) => <div className="sw-depth-row" data-side={side} key={i}><span>${fmt(Number(price))}</span><span>{fmt(Number(quantity))}</span><progress max={Math.max(...depth[side].map(r => Number(r[1])))} value={Number(quantity)} /></div>)}</div>)}</div> : <p className="sw-note">Live depth unavailable. No simulated orders displayed.</p>}<p className="sw-note">External exchange orders, not BIXLINK trades or liquidity.</p></section>;
}
export function MarketTerminal({ px, bixRef, snapshot }: { px: Record<string, MarketQuote>; bixRef: number; snapshot: string }) {
  const [selected, setSelected] = useState('BTC'); const [search, setSearch] = useState(''); const [category, setCategory] = useState('trending'); const [watchlist, setWatchlist] = useState<string[]>([]);
  useEffect(() => { try { const v = JSON.parse(localStorage.getItem('sov-watchlist') ?? '[]'); if (Array.isArray(v)) setWatchlist(v.filter(s => typeof s === 'string')); } catch {} }, []);
  const toggle = (s: string) => { const next = watchlist.includes(s) ? watchlist.filter(x => x !== s) : [...watchlist, s]; setWatchlist(next); localStorage.setItem('sov-watchlist', JSON.stringify(next)); };
  const rows = [{ s: 'BIX', p: bixRef, c: null }, { s: 'USDT', p: 1, c: null }, ...Object.entries(px).map(([s, v]) => ({ s, ...v }))].filter(r => marketScope(r.s, category, watchlist) && r.s.toLowerCase().includes(search.toLowerCase())).sort((a, b) => category === 'gainers' ? (b.c ?? -Infinity) - (a.c ?? -Infinity) : a.s.localeCompare(b.s));
  const quote = selected === 'BIX' ? { p: bixRef, c: null } : selected === 'USDT' ? { p: 1, c: null } : px[selected];
  return <><header className="flex justify-between items-center mb-5"><h1 className="text-2xl font-display">Market</h1><small className="sw-muted">{snapshot}</small></header><section className="sw-chart-card"><div className="flex justify-between items-start"><div><small className="sw-muted">{selected === 'BIX' ? 'BIX · Internal reference' : `${selected}/USDT`}</small><b className="block font-display text-2xl">{quote ? `$${fmt(quote.p)}` : '—'}</b></div><Button variant="wallet" size="wallet" className="sw-round" aria-label={`Watch ${selected}`} aria-pressed={watchlist.includes(selected)} onClick={() => toggle(selected)}><Star size={18} fill={watchlist.includes(selected) ? 'currentColor' : 'none'}/></Button></div><MarketChart symbol={['BIX', 'USDT'].includes(selected) ? null : `${selected}USDT`}/></section><div className="sw-market-filters mt-5">{([['trending', 'Trending', Flame], ['gainers', 'Top gainers', TrendingUp], ['ecosystem', 'BIX ecosystem', Gem], ['watchlist', 'Watchlist', Star]] as const).map(([key, label, Icon]) => <Button variant="wallet" size="wallet" key={key} aria-pressed={category === key} onClick={() => setCategory(key)}><Icon size={14}/>{label}</Button>)}</div><label className="sw-field mt-4 flex gap-2"><Search size={18}/><input aria-label="Search currency" className="min-w-0 flex-1 bg-transparent outline-none" placeholder="Search currency" value={search} onChange={e => setSearch(e.target.value)}/></label><div className="mt-3">{rows.map(r => <div key={r.s} className="sw-market-row"><Button variant="wallet" size="wallet" className="flex flex-1 justify-between gap-2" onClick={() => setSelected(r.s)}><b>{r.s}</b><span>${fmt(r.p)}</span><small className={r.c === null ? 'sw-muted' : r.c >= 0 ? 'sw-up' : 'sw-down'}>{r.c === null ? r.s === 'BIX' ? 'Ref.' : 'USD ref.' : `${r.c > 0 ? '+' : ''}${r.c.toFixed(2)}%`}</small></Button><Button variant="wallet" size="wallet" className="sw-gold-text" aria-label={`Watch ${r.s}`} aria-pressed={watchlist.includes(r.s)} onClick={() => toggle(r.s)}><Star size={16} fill={watchlist.includes(r.s) ? 'currentColor' : 'none'}/></Button></div>)}{!rows.length && <p className="sw-note">No currencies in this view.</p>}</div>{!['BIX', 'USDT'].includes(selected) && <MarketDepth symbol={selected}/>}<p className="sw-note">BIX is an owner-managed internal reference, not an exchange price. Prices and depth are read-only; no trading or portfolio profit is implied.</p></>;
}