import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { BIXTRADE_PAIRS, BIXTRADE_CYCLE_MIN, botCapital, planExecutions, readBixtrade } from '@/lib/bixtrade';

/** Records server-side bot executions for the caller's settled capital since the last run. Never touches balances. */
export const runBixtradeCycle = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { funding: 'real' | 'virtual' }) => z.object({ funding: z.enum(['real', 'virtual']) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: set } = await supabase.from('app_settings').select('value').eq('key', 'bixtrade').maybeSingle();
    const cfg = readBixtrade(set?.value);
    if (!cfg.enabled) return { added: 0, reason: 'closed' };
    const { data: reqs } = await supabase.from('bixtrade_requests').select('kind,amount_usd,settled_at,strategy,funding').eq('user_id', userId).eq('funding', data.funding);
    const rows = reqs ?? [];
    const capital = botCapital(rows);
    if (capital <= 0) return { added: 0, reason: 'no_capital' };
    const { data: last } = await supabase.from('bixtrade_executions').select('executed_at').eq('user_id', userId).eq('funding', data.funding).order('executed_at', { ascending: false }).limit(1).maybeSingle();
    const firstDeposit = rows.filter(r => r.settled_at && r.kind === 'deposit').map(r => r.settled_at as string).sort()[0];
    const now = new Date();
    const fromMs = Math.max(new Date(last?.executed_at ?? firstDeposit ?? now.toISOString()).getTime(), now.getTime() - 86400000);
    if (now.getTime() - fromMs < BIXTRADE_CYCLE_MIN * 60000) return { added: 0, reason: 'wait' };
    let prices: Record<string, number> = {};
    try {
      const r = await fetch(`https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(JSON.stringify(BIXTRADE_PAIRS))}`);
      const list = (await r.json()) as { symbol: string; price: string }[];
      if (Array.isArray(list)) prices = Object.fromEntries(list.map(x => [x.symbol, Number(x.price)]));
    } catch (e) { console.error('bixtrade price feed', e); }
    if (!Object.keys(prices).length) return { added: 0, reason: 'feed' };
    const strategy = rows.filter(r => r.kind === 'deposit' && r.settled_at).at(-1)?.strategy ?? 'core';
    const plan = planExecutions(cfg, capital, prices, new Date(fromMs), now);
    if (!plan.length) return { added: 0, reason: 'wait' };
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const stamp = now.toISOString().slice(2, 10).replace(/-/g, '');
    const { error } = await supabaseAdmin.from('bixtrade_executions').insert(plan.map(p => ({ ...p, user_id: userId, funding: data.funding, strategy, ref: `ARB-${p.pair.split('/')[0]}-${stamp}-${crypto.randomUUID().slice(0, 6).toUpperCase()}` })));
    if (error) { console.error(error); throw new Error('Could not record executions'); }
    return { added: plan.length, reason: 'ok' };
  });

type Quote = { venue: string; bid: number; ask: number };
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : 0; };
async function j(url: string): Promise<any> { const c = new AbortController(); const t = setTimeout(() => c.abort(), 4000); try { const r = await fetch(url, { signal: c.signal }); return r.ok ? await r.json() : null; } catch { return null; } finally { clearTimeout(t); } }
/** Best bid/ask for one pair from real public exchange endpoints (no keys, no orders). */
async function venueQuotes(sym: string): Promise<Quote[]> {
  const b = sym.replace('USDT', '');
  const src: [string, string, (d: any) => [unknown, unknown] | null][] = [
    ['Binance', `https://api.binance.com/api/v3/ticker/bookTicker?symbol=${sym}`, d => d && [d.bidPrice, d.askPrice]],
    ['Bybit', `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${sym}`, d => d?.result?.list?.[0] && [d.result.list[0].bid1Price, d.result.list[0].ask1Price]],
    ['OKX', `https://www.okx.com/api/v5/market/ticker?instId=${b}-USDT`, d => d?.data?.[0] && [d.data[0].bidPx, d.data[0].askPx]],
    ['KuCoin', `https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=${b}-USDT`, d => d?.data && [d.data.bestBid, d.data.bestAsk]],
    ['Bitget', `https://api.bitget.com/api/v2/spot/market/tickers?symbol=${sym}`, d => d?.data?.[0] && [d.data[0].bidPr, d.data[0].askPr]],
    ['Coinbase', `https://api.exchange.coinbase.com/products/${b}-USDT/ticker`, d => d && [d.bid, d.ask]],
  ];
  const out = await Promise.all(src.map(async ([venue, url, pick]) => { const p = pick(await j(url)); const bid = num(p?.[0]), ask = num(p?.[1]); return bid && ask ? { venue, bid, ask } : null; }));
  return out.filter(Boolean) as Quote[];
}

export const BIXTRADE_TAKER = 0.001;
/**
 * Live mode (Virtual USDT only): reads real best bid/ask from public exchange endpoints, picks the cheapest ask and
 * richest bid per pair, and records a paper execution only when the spread beats both taker fees. No exchange orders.
 */
export const runBixtradeLive = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: set } = await supabase.from('app_settings').select('value').eq('key', 'bixtrade').maybeSingle();
    const cfg = readBixtrade(set?.value);
    const scan = await Promise.all(BIXTRADE_PAIRS.map(async sym => {
      const q = await venueQuotes(sym);
      if (q.length < 2) return { pair: sym.replace('USDT', '/USDT'), quotes: q, buy: null, sell: null, spreadPct: 0, netPct: 0 };
      const buy = q.reduce((a, x) => x.ask < a.ask ? x : a), sell = q.filter(x => x.venue !== buy.venue).reduce((a, x) => x.bid > a.bid ? x : a);
      const spreadPct = (sell.bid / buy.ask - 1) * 100;
      return { pair: sym.replace('USDT', '/USDT'), quotes: q, buy, sell, spreadPct, netPct: spreadPct - BIXTRADE_TAKER * 200 };
    }));
    if (!cfg.enabled) return { scan, added: 0, reason: 'closed' };
    const { data: reqs } = await supabase.from('bixtrade_requests').select('kind,amount_usd,settled_at,strategy,funding').eq('user_id', userId).eq('funding', 'virtual');
    const rows = reqs ?? [];
    const capital = botCapital(rows);
    if (capital <= 0) return { scan, added: 0, reason: 'no_capital' };
    const { data: last } = await supabase.from('bixtrade_executions').select('executed_at').eq('user_id', userId).eq('source', 'live_quotes').order('executed_at', { ascending: false }).limit(1).maybeSingle();
    if (last && Date.now() - new Date(last.executed_at).getTime() < 60000) return { scan, added: 0, reason: 'wait' };
    const strategy = rows.filter(r => r.kind === 'deposit' && r.settled_at).at(-1)?.strategy ?? 'core';
    const per = Math.min(capital / BIXTRADE_PAIRS.length, cfg.maxAlloc);
    const stamp = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const plan = scan.filter(s => s.buy && s.sell && s.netPct > 0).map(s => {
      const qty = per / s.buy!.ask, sellUsd = qty * s.sell!.bid, gross = sellUsd - per, fee = per * BIXTRADE_TAKER + sellUsd * BIXTRADE_TAKER;
      return { user_id: userId, funding: 'virtual', strategy, source: 'live_quotes', pair: s.pair, buy_venue: s.buy!.venue, sell_venue: s.sell!.venue, buy_price: +s.buy!.ask.toFixed(8), sell_price: +s.sell!.bid.toFixed(8), qty: +qty.toFixed(8), notional_usd: +per.toFixed(2), gross_usd: +gross.toFixed(4), fee_usd: +fee.toFixed(4), net_usd: +(gross - fee).toFixed(4), latency_ms: 0, ref: `LIVE-${s.pair.split('/')[0]}-${stamp}-${crypto.randomUUID().slice(0, 6).toUpperCase()}` };
    });
    if (!plan.length) return { scan, added: 0, reason: 'below_fees' };
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.from('bixtrade_executions').insert(plan);
    if (error) { console.error(error); throw new Error('Could not record live executions'); }
    return { scan, added: plan.length, reason: 'ok' };
  });

/** Public spot prices for the scanner, fetched server-side so mobile networks that block exchange domains still load. */
export const getBixtradePrices = createServerFn({ method: 'GET' }).handler(async () => {
  const out: Record<string, number> = {};
  const list = await j(`https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(JSON.stringify(BIXTRADE_PAIRS))}`);
  if (Array.isArray(list)) for (const x of list) { const n = num(x?.price); if (n) out[x.symbol] = n; }
  await Promise.all(BIXTRADE_PAIRS.filter(s => !out[s]).map(async s => {
    const d = await j(`https://www.okx.com/api/v5/market/ticker?instId=${s.replace('USDT', '')}-USDT`);
    const n = num(d?.data?.[0]?.last) || num((await j(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${s}`))?.result?.list?.[0]?.lastPrice);
    if (n) out[s] = n;
  }));
  return out;
});
