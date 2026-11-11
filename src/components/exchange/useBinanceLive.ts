import { useEffect, useState } from 'react';

export type Tick = { s: string; c: number; P: number; h: number; l: number; q: number };
export type Book = { bids: [number, number][]; asks: [number, number][] };
export type Trade = { id: number; p: number; q: number; buy: boolean; t: number };

/** Public Binance market streams (read-only, browser only). Reconnects on drop. */
export function useBinanceTickers(symbols: string[]) {
  const [ticks, setTicks] = useState<Record<string, Tick>>({});
  const key = symbols.join(',');
  useEffect(() => {
    let ws: WebSocket | null = null; let stop = false; let timer: ReturnType<typeof setTimeout>;
    const open = () => {
      ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${symbols.map(s => `${s.toLowerCase()}@miniTicker`).join('/')}`);
      ws.onmessage = (e) => { const d = JSON.parse(e.data).data; if (!d) return; const o = +d.o, c = +d.c;
        setTicks(t => ({ ...t, [d.s]: { s: d.s, c, P: o ? ((c - o) / o) * 100 : 0, h: +d.h, l: +d.l, q: +d.q } })); };
      ws.onclose = () => { if (!stop) timer = setTimeout(open, 3000); };
    };
    open();
    return () => { stop = true; clearTimeout(timer); ws?.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return ticks;
}

export function useBinanceDepth(symbol: string | null) {
  const [book, setBook] = useState<Book>({ bids: [], asks: [] });
  const [trades, setTrades] = useState<Trade[]>([]);
  useEffect(() => {
    setBook({ bids: [], asks: [] }); setTrades([]);
    if (!symbol) return;
    const s = symbol.toLowerCase();
    const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${s}@depth10@1000ms/${s}@aggTrade`);
    ws.onmessage = (e) => { const m = JSON.parse(e.data); const d = m.data;
      if (m.stream.endsWith('depth10@1000ms')) setBook({ bids: d.bids.map((r: string[]) => [+r[0]!, +r[1]!]), asks: d.asks.map((r: string[]) => [+r[0]!, +r[1]!]) });
      else setTrades(t => [{ id: d.a, p: +d.p, q: +d.q, buy: !d.m, t: d.T }, ...t].slice(0, 18));
    };
    return () => ws.close();
  }, [symbol]);
  return { book, trades };
}
