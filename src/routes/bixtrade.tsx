import { useCallback, useEffect, useMemo, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { BixShell } from '@/components/BixShell';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { BIXTRADE_PAIRS, BIXTRADE_STRATEGIES, BIXTRADE_VENUES, checkBixtradeRequest, projectBixtrade, readBixtrade, withdrawNet, type BixtradeSettings, type BixtradeStrategy } from '@/lib/bixtrade';
import { Activity, ArrowDownToLine, ArrowUpFromLine, Construction, Cpu, Gauge, Radar, Zap } from 'lucide-react';

export const Route = createFileRoute('/bixtrade')({
  head: () => ({ meta: [
    { title: 'BIXTrade Arbitrage Bot — BIXLINK' },
    { name: 'description', content: 'Cross-exchange arbitrage scanner on BTC, ETH, SOL and BNB USDT pairs with owner-reviewed bot deposits and withdrawals.' },
    { property: 'og:title', content: 'BIXTrade Arbitrage Bot — BIXLINK' },
    { property: 'og:description', content: 'Major-pair cross-exchange spread scanner, strategies and bot wallet requests.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  component: BixtradePage,
});

type Row = { pair: string; buy: string; sell: string; bid: number; ask: number; spread: number; net: number; ms: number };
type Req = { id: string; kind: string; amount_usd: number; strategy: string; status: string; created_at: string; admin_note: string | null };
const FEE = 0.1;

function BixtradePage() {
  const [cfg, setCfg] = useState<BixtradeSettings | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [tick, setTick] = useState(0);
  const [amount, setAmount] = useState(1000);
  const [days, setDays] = useState(30);
  const [strategy, setStrategy] = useState<BixtradeStrategy>('core');
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [reqAmt, setReqAmt] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => { void supabase.from('app_settings').select('value').eq('key', 'bixtrade').maybeSingle().then(({ data }) => setCfg(readBixtrade(data?.value))); void supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null)); }, []);
  const loadReqs = useCallback(async () => {
    if (!uid) return;
    const { data } = await supabase.from('bixtrade_requests').select('id,kind,amount_usd,strategy,status,created_at,admin_note').eq('user_id', uid).order('created_at', { ascending: false }).limit(30);
    setReqs((data ?? []) as Req[]);
  }, [uid]);
  useEffect(() => { void loadReqs(); }, [loadReqs]);
  useEffect(() => {
    if (!cfg?.enabled) return;
    const load = () => fetch(`https://api.binance.com/api/v3/ticker/price?symbols=${encodeURIComponent(JSON.stringify(BIXTRADE_PAIRS))}`)
      .then(r => r.json()).then((list: { symbol: string; price: string }[]) => Array.isArray(list) && setPrices(Object.fromEntries(list.map(x => [x.symbol, Number(x.price)])))).catch(() => {});
    load(); const a = setInterval(load, 8000); const b = setInterval(() => setTick(t => t + 1), 1500);
    return () => { clearInterval(a); clearInterval(b); };
  }, [cfg?.enabled]);

  const rows = useMemo<Row[]>(() => BIXTRADE_PAIRS.map((pair, i) => {
    const p = prices[pair]; if (!p) return null;
    const seed = Math.sin((tick + 1) * (i + 3) * 1.37);
    const spread = 0.15 + Math.abs(seed) * 0.33;
    const v = (tick + i) % BIXTRADE_VENUES.length;
    return { pair: pair.replace('USDT', '/USDT'), buy: BIXTRADE_VENUES[v], sell: BIXTRADE_VENUES[(v + 1 + i) % BIXTRADE_VENUES.length], ask: p, bid: p * (1 + spread / 100), spread, net: spread - FEE, ms: 12 + Math.round(Math.abs(seed) * 30) };
  }).filter(Boolean) as Row[], [prices, tick]);
  const stream = useMemo(() => rows.filter(r => r.net > 0).map(r => `${r.pair} ${r.buy} → ${r.sell} +${r.net.toFixed(2)}%`), [rows]);

  const approved = reqs.filter(r => r.status === 'approved');
  const capital = approved.reduce((s, r) => s + (r.kind === 'deposit' ? 1 : -1) * Number(r.amount_usd), 0);
  const pending = reqs.filter(r => r.status === 'pending').length;

  const submit = async () => {
    if (!cfg) return;
    if (!uid) { setMsg('Please sign in first.'); return; }
    const n = Number(reqAmt);
    const err = checkBixtradeRequest(cfg, mode, n) ?? (mode === 'withdraw' && n > capital ? 'Amount exceeds your approved bot capital.' : null);
    if (err) { setMsg(err); return; }
    setBusy(true);
    const { error } = await supabase.from('bixtrade_requests').insert({ user_id: uid, kind: mode, amount_usd: n, strategy });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    setReqAmt(''); setMsg(`${mode === 'deposit' ? 'Deposit' : 'Withdrawal'} request sent — waiting for owner review.`); void loadReqs();
  };

  if (!cfg) return <BixShell><main className="mx-auto max-w-5xl px-5 py-16 text-center text-sm text-muted-foreground">Loading BIXTrade…</main></BixShell>;
  if (!cfg.enabled) return <BixShell><main className="mx-auto max-w-xl px-5 py-16">
    <section className="arb-card text-center">
      <Construction className="mx-auto text-chart-3" size={42}/>
      <p className="shop-eyebrow mt-4">BIXTRADE ARBITRAGE BOT</p>
      <h1 className="mt-1 font-display text-2xl font-bold">Under Reconstruction</h1>
      <p className="mt-2 text-sm text-muted-foreground">{cfg.notice || 'The arbitrage engine is being upgraded and liquidity routes are re-syncing. Please check back soon.'}</p>
      <Button asChild className="mt-5"><Link to="/dashboard">Back to dashboard</Link></Button>
    </section>
  </main></BixShell>;

  const proj = projectBixtrade(cfg, amount, days);
  const n = Number(reqAmt) || 0;
  return <BixShell><main className="mx-auto max-w-6xl px-4 py-6 md:px-8">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="shop-eyebrow">QUANT ARBITRAGE ENGINE</p>
        <h1 className="mt-1 font-display text-3xl font-bold">BIX<span className="text-chart-3">Trade</span> Bot</h1>
      </div>
      <span className="arb-live"><i/> LIVE</span>
    </div>
    <p className="mt-1 mb-4 text-sm text-muted-foreground">Cross-exchange spread scanner on the world's most liquid USDT pairs across {BIXTRADE_VENUES.length} venues.</p>

    {stream.length > 0 && <div className="arb-ticker"><div>{[...stream, ...stream].map((s, i) => <span key={i}>⚡ {s}</span>)}</div></div>}

    <section className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {([[Cpu, 'Engine', 'Online'], [Activity, 'Win rate', `${cfg.winRate}%`], [Zap, 'Daily range', `${cfg.minDailyPct}–${cfg.maxDailyPct}%`], [Gauge, 'Avg latency', `${rows.length ? Math.round(rows.reduce((s, r) => s + r.ms, 0) / rows.length) : '—'}ms`]] as const).map(([Icon, l, v]) => <div key={l} className="arb-card"><Icon size={16} className="text-chart-3"/><p className="mt-1 text-[10px] text-muted-foreground">{l}</p><b className="text-sm">{v}</b></div>)}
    </section>

    <section className="arb-card mt-4">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold"><ArrowDownToLine size={18} className="text-chart-3"/> Bot wallet</h2>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="arb-stat"><p>Bot capital</p><b>{capital.toFixed(2)}</b><small>USDT · approved</small></div>
        <div className="arb-stat"><p>Pending</p><b>{pending}</b><small>requests</small></div>
        <div className="arb-stat"><p>Lock period</p><b>{cfg.lockDays}</b><small>days</small></div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant={mode === 'deposit' ? 'default' : 'outline'} onClick={() => setMode('deposit')} disabled={!cfg.depositOpen}><ArrowDownToLine size={15}/> Deposit</Button>
        <Button variant={mode === 'withdraw' ? 'default' : 'outline'} onClick={() => setMode('withdraw')} disabled={!cfg.withdrawOpen}><ArrowUpFromLine size={15}/> Withdraw</Button>
      </div>
      <div className="mt-3 grid gap-2">
        <p className="text-[11px] text-muted-foreground">Strategy</p>
        <div className="grid gap-2 sm:grid-cols-3">{BIXTRADE_STRATEGIES.map(s => <button key={s.key} type="button" onClick={() => setStrategy(s.key)} className={`arb-strat ${strategy === s.key ? 'is-on' : ''}`}><b>{s.name}</b><span>{s.pairs}</span><em>Risk: {s.risk}</em></button>)}</div>
        <label className="mt-1 text-[11px] text-muted-foreground">Amount (USDT) {mode === 'deposit' ? `· ${cfg.minAlloc}–${cfg.maxAlloc}` : `· min ${cfg.minWithdraw} · fee ${cfg.withdrawFeePct}%`}
          <input className="form-input mt-1" type="number" inputMode="decimal" value={reqAmt} onChange={e => setReqAmt(e.target.value)} placeholder="0.00"/></label>
        {mode === 'withdraw' && n > 0 && <p className="text-xs">You receive ≈ <b className="text-chart-2">{withdrawNet(cfg, n).toFixed(2)} USDT</b> after fee</p>}
        <Button disabled={busy || (mode === 'deposit' ? !cfg.depositOpen : !cfg.withdrawOpen)} onClick={submit}>{busy ? 'Sending…' : mode === 'deposit' ? 'Request deposit' : 'Request withdrawal'}</Button>
        {msg && <p className="text-xs text-chart-3">{msg}</p>}
        <p className="text-[10px] text-muted-foreground">Every request is reviewed by the owner before it is recorded. Deposit funding follows the owner's instructions from your Wallet page.</p>
      </div>
    </section>

    <section className="arb-card mt-4 overflow-x-auto">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Radar size={18} className="text-chart-3"/> Live spread scanner</h2>
      <table className="mt-3 w-full min-w-[560px] text-left text-xs">
        <thead className="text-muted-foreground"><tr>{['Pair', 'Buy @', 'Sell @', 'Ask', 'Bid', 'Spread', 'Net after fees', 'Latency'].map(h => <th key={h} className="py-2 pr-2">{h}</th>)}</tr></thead>
        <tbody>{rows.map(r => <tr key={r.pair} className="border-t border-border">
          <td className="py-2 pr-2 font-bold">{r.pair}</td><td className="pr-2">{r.buy}</td><td className="pr-2">{r.sell}</td>
          <td className="pr-2 font-mono">{r.ask.toFixed(2)}</td><td className="pr-2 font-mono">{r.bid.toFixed(2)}</td>
          <td className="pr-2 text-chart-3">{r.spread.toFixed(2)}%</td><td className={`pr-2 ${r.net > 0 ? 'text-chart-2' : 'text-destructive'}`}>{r.net.toFixed(2)}%</td><td>{r.ms}ms</td>
        </tr>)}</tbody>
      </table>
      {!rows.length && <p className="py-6 text-center text-muted-foreground">Connecting to market feed…</p>}
    </section>

    <section className="arb-card mt-4">
      <h2 className="font-display text-lg font-bold">Projection calculator</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-[11px] text-muted-foreground">Allocation (USDT, {cfg.minAlloc}–{cfg.maxAlloc})<input className="form-input mt-1" type="number" min={cfg.minAlloc} max={cfg.maxAlloc} value={amount} onChange={e => setAmount(Number(e.target.value))}/></label>
        <label className="text-[11px] text-muted-foreground">Cycle (days)<select className="form-input mt-1" value={days} onChange={e => setDays(Number(e.target.value))}>{[1, 7, 30, 90].map(d => <option key={d} value={d}>{d} days</option>)}</select></label>
      </div>
      <p className="mt-4 text-sm">Projected result: <b className="text-chart-2">{proj.low.toFixed(2)} – {proj.high.toFixed(2)} USDT</b> on {proj.amount} USDT</p>
    </section>

    <details className="arb-card mt-4">
      <summary className="cursor-pointer font-display text-lg font-bold">My bot requests ({reqs.length})</summary>
      <div className="mt-3 grid gap-2">{reqs.length ? reqs.map(r => <div key={r.id} className="flex items-center justify-between border-t border-border pt-2 text-xs">
        <span><b className="uppercase">{r.kind}</b> · {Number(r.amount_usd).toFixed(2)} USDT<br/><span className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}{r.admin_note ? ` · ${r.admin_note}` : ''}</span></span>
        <span className={`arb-badge is-${r.status}`}>{r.status}</span></div>) : <p className="text-xs text-muted-foreground">No requests yet.</p>}</div>
    </details>

    <p className="mt-6 text-[11px] leading-5 text-muted-foreground">Risk disclosure: scanner routes and spreads are a display simulation built on live reference prices; BIXTrade does not place orders on external exchanges. Projection ranges are set by the owner, are not guaranteed, and nothing is added to your balance automatically — all deposits and withdrawals are owner-reviewed internal records.</p>
  </main></BixShell>;
}
