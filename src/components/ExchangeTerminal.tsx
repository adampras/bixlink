import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { fetchBixPrice } from '@/lib/mining-rigs';

const PAIRS = { 'BIX/USDT': 0.84291, 'BTC/USDT': 68420, 'ETH/USDT': 3520 } as const;
type Pair = keyof typeof PAIRS;
type Candle = { o: number; h: number; l: number; c: number };

function seed(base: number): Candle[] {
  let p = base; return Array.from({ length: 40 }, () => {
    const o = p; const c = o * (1 + (Math.random() - 0.5) * 0.02);
    p = c; return { o, c, h: Math.max(o, c) * (1 + Math.random() * 0.006), l: Math.min(o, c) * (1 - Math.random() * 0.006) };
  });
}

export function ExchangeTerminal() {
  const { data: bixRef } = useQuery({ queryKey: ['bix-ref-price'], queryFn: fetchBixPrice });
  const base = (p: Pair) => (p === 'BIX/USDT' ? bixRef ?? PAIRS[p] : PAIRS[p]);
  const [pair, setPair] = useState<Pair>('BIX/USDT');
  const [candles, setCandles] = useState<Candle[]>(() => seed(PAIRS['BIX/USDT']));
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [type, setType] = useState('Limit');
  const [tps, setTps] = useState(1_800_000);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setCandles(seed(base(pair))); }, [pair, bixRef]);
  useEffect(() => {
    const i = setInterval(() => {
      setCandles((cs) => { const last = cs[cs.length - 1]!; const c = last.c * (1 + (Math.random() - 0.5) * 0.008);
        return [...cs.slice(1), { o: last.c, c, h: Math.max(last.c, c) * 1.002, l: Math.min(last.c, c) * 0.998 }]; });
      setTps(1_700_000 + Math.round(Math.random() * 200_000));
    }, 1200);
    return () => clearInterval(i);
  }, []);
  const price = candles[candles.length - 1]?.c ?? PAIRS[pair];
  const hi = Math.max(...candles.map((c) => c.h)), lo = Math.min(...candles.map((c) => c.l));
  const y = (v: number) => 4 + ((hi - v) / (hi - lo || 1)) * 152;
  const dp = price < 10 ? 5 : 2;
  const book = (dir: 1 | -1) => Array.from({ length: 7 }, (_, k) => ({ p: price * (1 + dir * (k + 1) * 0.0011), q: Math.round(500 + Math.random() * 9000) }));
  const asks = book(1).reverse(), bids = book(-1);

  return <section className="q-panel space-y-3 rounded-2xl p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex gap-1">{(Object.keys(PAIRS) as Pair[]).map((p) =>
        <button key={p} type="button" onClick={() => setPair(p)} className={`rounded-full border px-3 py-1 text-[11px] font-black ${pair === p ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground'}`}>{p}</button>)}</div>
      <b className="numeric text-xl text-primary">{price.toFixed(dp)}</b>
    </div>
    <div className="grid gap-3 md:grid-cols-[1fr_200px]">
      <svg viewBox="0 0 400 160" className="h-48 w-full rounded-xl bg-background/60">
        {candles.map((c, i) => { const up = c.c >= c.o; const x = i * 10 + 5;
          return <g key={i} className={up ? 'text-chart-2' : 'text-destructive'}>
            <line x1={x} x2={x} y1={y(c.h)} y2={y(c.l)} stroke="currentColor" strokeWidth="1" />
            <rect x={x - 3} width="6" y={y(Math.max(c.o, c.c))} height={Math.max(1, Math.abs(y(c.o) - y(c.c)))} fill="currentColor" />
          </g>; })}
      </svg>
      <div className="numeric grid text-[11px]">
        {asks.map((r, i) => <div key={'a' + i} className="flex justify-between text-destructive"><span>{r.p.toFixed(dp)}</span><span className="text-muted-foreground">{r.q}</span></div>)}
        <div className="my-1 text-center font-black text-primary">{price.toFixed(dp)}</div>
        {bids.map((r, i) => <div key={'b' + i} className="flex justify-between text-chart-2"><span>{r.p.toFixed(dp)}</span><span className="text-muted-foreground">{r.q}</span></div>)}
      </div>
    </div>
    <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-black tracking-widest">
      <div className="rounded-lg border border-border p-2">ENGINE<br /><span className="numeric text-primary">{(tps / 1e6).toFixed(2)}M/s</span></div>
      <div className="rounded-lg border border-border p-2">LATENCY<br /><span className="numeric text-primary">0.65 ms</span></div>
      <div className="rounded-lg border border-border p-2">FEE<br /><span className="numeric text-primary">0.05%</span></div>
    </div>
    <div className="grid gap-2 rounded-xl border border-border p-3">
      <div className="grid grid-cols-2 gap-1">{(['BUY', 'SELL'] as const).map((s) =>
        <button key={s} type="button" onClick={() => setSide(s)} className={`rounded-lg py-2 text-xs font-black ${side === s ? (s === 'BUY' ? 'bg-chart-2 text-background' : 'bg-destructive text-destructive-foreground') : 'border border-border text-muted-foreground'}`}>{s}</button>)}</div>
      <div className="flex gap-1">{['Limit', 'Market', 'Stop-Limit'].map((t) =>
        <button key={t} type="button" onClick={() => setType(t)} className={`flex-1 rounded-md py-1 text-[11px] font-bold ${type === t ? 'text-primary underline' : 'text-muted-foreground'}`}>{t}</button>)}</div>
      {pair === 'BIX/USDT'
        ? <Link to="/trade" className={`rounded-lg py-2 text-center text-xs font-black tracking-widest ${side === 'BUY' ? 'bg-chart-2 text-background' : 'bg-destructive text-destructive-foreground'}`}>{side} BIX · OPEN MEMBER ORDER BOOK</Link>
        : <button type="button" disabled className="rounded-lg border border-primary/50 py-2 text-xs font-black tracking-widest text-primary opacity-80">{side} {pair} · OPENS AT LAUNCH</button>}
      <p className="text-[10px] text-muted-foreground">BIX/USDT is anchored to the staking ledger reference price; real orders are member-to-member on the internal order book. Chart movement and BTC/ETH data are illustrative.</p>
    </div>
    <div className="flex flex-wrap justify-center gap-2 text-[10px] font-black tracking-widest text-muted-foreground">
      <span className="rounded-full border border-border px-2 py-1">MULTI-SIG COLD VAULT · PLANNED</span>
      <span className="rounded-full border border-border px-2 py-1">PROOF OF RESERVES · PLANNED</span>
    </div>
  </section>;
}
