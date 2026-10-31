import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { BixShell } from '@/components/BixShell';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { BixtradePlan } from '@/components/BixtradePlan';
import { BIXTRADE_PAIRS, BIXTRADE_STRATEGIES, BIXTRADE_VENUES, botCapital, bixtradeBotMood, checkBixtradeRequest, dailySeries, projectBixtrade, readBixtrade, withdrawNet, type BixtradeSettings, type BixtradeStrategy } from '@/lib/bixtrade';
import { BixtradeBot3D } from '@/components/BixtradeBot3D';
import { useServerFn } from '@tanstack/react-start';
import { getBixtradePrices, runBixtradeCycle, runBixtradeLive } from '@/lib/bixtrade.functions';
import { Activity, ArrowDownToLine, ArrowUpFromLine, BarChart3, Construction, Copy, Cpu, Network, Radar, Send, Share2, Volume2, VolumeX, Zap } from 'lucide-react';

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
type Req = { id: string; kind: string; amount_usd: number; strategy: string; status: string; created_at: string; admin_note: string | null; settled_usd: number | null; settled_at: string | null; funding: string };
type Exec = { id: string; ref: string; funding: string; pair: string; buy_venue: string; sell_venue: string; buy_price: number; sell_price: number; qty: number; notional_usd: number; fee_usd: number; net_usd: number; latency_ms: number; executed_at: string; source?: string };
type LiveScan = { pair: string; quotes: { venue: string; bid: number; ask: number }[]; buy: { venue: string; ask: number } | null; sell: { venue: string; bid: number } | null; spreadPct: number; netPct: number };
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
  const [mainUsdt, setMainUsdt] = useState<number | null>(null);
  const [sound, setSound] = useState(false);
  const [funding, setFunding] = useState<'real' | 'virtual'>('real');
  const [execs, setExecs] = useState<Exec[]>([]);
  const runCycle = useServerFn(runBixtradeCycle);
  const getPrices = useServerFn(getBixtradePrices);
  const [tab, setTab] = useState<'cockpit' | 'radar' | 'ai' | 'logs'>('cockpit');
  const [isAdmin, setIsAdmin] = useState(false);
  const [pairFilter, setPairFilter] = useState('ALL');
  const [logFilter, setLogFilter] = useState<'all' | 'win' | 'scratch'>('all');
  const [receipt, setReceipt] = useState<Exec | null>(null);
  useEffect(() => { void supabase.rpc('is_bix_admin').then(({ data }) => setIsAdmin(data === true)); }, [uid]);
  const audio = useRef<AudioContext | null>(null);
  useEffect(() => { setSound(localStorage.getItem('bixtrade-sound') === '1'); }, []);
  const toggleSound = () => setSound(v => { const n = !v; localStorage.setItem('bixtrade-sound', n ? '1' : '0'); if (n) { audio.current ??= new AudioContext(); void audio.current.resume(); } return n; });

  useEffect(() => { void supabase.from('app_settings').select('value').eq('key', 'bixtrade').maybeSingle().then(({ data }) => setCfg(readBixtrade(data?.value))); void supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null)); }, []);
  const loadReqs = useCallback(async () => {
    if (!uid) return;
    const { data } = await supabase.from('bixtrade_requests').select('id,kind,amount_usd,strategy,status,created_at,admin_note,settled_usd,settled_at,funding').eq('user_id', uid).order('created_at', { ascending: false }).limit(30);
    setReqs((data ?? []) as Req[]);
    const b = await supabase.rpc('bix_asset_balances', { p_user: uid }).single();
    setMainUsdt(Number((b.data as { usdt_balance?: number } | null)?.usdt_balance ?? 0));
    const e = await supabase.from('bixtrade_executions').select('id,ref,funding,pair,buy_venue,sell_venue,buy_price,sell_price,qty,notional_usd,fee_usd,net_usd,latency_ms,executed_at,source').eq('user_id', uid).order('executed_at', { ascending: false }).limit(50);
    setExecs((e.data ?? []) as Exec[]);
  }, [uid]);
  useEffect(() => {
    if (!uid || !cfg?.enabled) return;
    const go = () => Promise.all((['real'] as const).map(f => runCycle({ data: { funding: f } }).catch(() => null))).then(r => { if (r.some(x => x && x.added > 0)) void loadReqs(); });
    void go(); const t = setInterval(go, 5 * 60000); return () => clearInterval(t);
  }, [uid, cfg?.enabled]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void loadReqs(); }, [loadReqs]);
  const runLive = useServerFn(runBixtradeLive);
  const [live, setLive] = useState<{ scan: LiveScan[]; reason: string; at: number } | null>(null);
  useEffect(() => {
    if (!uid || !cfg?.enabled) return;
    const go = () => runLive().then(r => { setLive({ scan: r.scan as LiveScan[], reason: r.reason, at: Date.now() }); if (r.added > 0) void loadReqs(); }).catch(() => {});
    void go(); const t = setInterval(go, 20000); return () => clearInterval(t);
  }, [uid, cfg?.enabled]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!cfg?.enabled) return;
    const load = () => getPrices().then(p => { if (p && Object.keys(p).length) setPrices(p); }).catch(() => {});
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

  const fundReqs = reqs.filter(r => (r.funding ?? 'real') === funding);
  const capital = botCapital(fundReqs);
  const fundExecs = execs.filter(x => x.funding === funding);
  const logExecs = fundExecs.filter(x => logFilter === 'all' || (logFilter === 'win' ? Number(x.net_usd) > 0 : Number(x.net_usd) <= 0));
  const realized = fundExecs.reduce((a, x) => a + Number(x.net_usd), 0);
  const profitable = rows.filter(r => r.net > 0);
  useEffect(() => {
    if (!sound || !profitable.length || !audio.current) return;
    const ctx = audio.current, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 880 + profitable.length * 60;
    g.gain.setValueAtTime(0.04, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.2);
  }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const pending = reqs.filter(r => r.status === 'pending').length;

  const submit = async () => {
    if (!cfg) return;
    if (!uid) { setMsg('Please sign in first.'); return; }
    const n = Number(reqAmt);
    const err = checkBixtradeRequest(cfg, mode, n) ?? (mode === 'withdraw' && n > capital ? 'Amount exceeds your approved bot capital.' : mode === 'deposit' && funding === 'real' && mainUsdt !== null && n > mainUsdt ? 'Amount exceeds your main wallet USDT balance.' : null);
    if (err) { setMsg(err); return; }
    setBusy(true);
    const { error } = await supabase.from('bixtrade_requests').insert({ user_id: uid, kind: mode, amount_usd: n, strategy, funding });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    setReqAmt(''); setMsg(`${mode === 'deposit' ? 'Deposit' : 'Withdrawal'} request sent — waiting for owner review.`); void loadReqs();
  };

  const instantVirtual = async () => {
    const v = Number(reqAmt);
    if (!(v > 0)) { setMsg('Enter an amount first.'); return; }
    setBusy(true);
    const { error } = await supabase.rpc('bixtrade_admin_virtual_deposit', { p_amount: v, p_strategy: strategy });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    setReqAmt(''); setMsg('Virtual USDT is now active as bot capital.'); void loadReqs();
  };

  if (!cfg) return <BixShell><main className="mx-auto max-w-5xl px-5 py-16 text-center text-sm text-muted-foreground">Loading BIXTrade…</main></BixShell>;
  if (!cfg.enabled && !isAdmin) return <BixShell><main className="mx-auto max-w-xl px-5 py-16">
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
    <section className="arb-ai-hero">
      <div className="arb-ai-copy">
        <p className="shop-eyebrow">AI QUANT ENGINE</p>
        <h1 className="font-display text-2xl font-bold">BIX<span className="text-chart-3">Trade</span> AI</h1>
        <p className="arb-ai-status"><i/> Neural scanner online · {profitable.length ? `${profitable.length} routes` : 'scanning'}</p>
        <span className="mt-2 flex items-center gap-2"><button type="button" onClick={toggleSound} aria-label={sound ? 'Mute execution sound' : 'Enable execution sound'} className="arb-icon-btn">{sound ? <Volume2 size={15}/> : <VolumeX size={15}/>}</button><span className="arb-live"><i/> LIVE</span></span>
      </div>
      <BixtradeBot3D mood={bixtradeBotMood({ capital, routes: profitable.length, lastExecAt: fundExecs[0]?.executed_at, now: Date.now() })} routes={profitable.length}/>
    </section>
    <section className="mt-3 grid grid-cols-4 gap-2">
      {([['Bot', capital.toFixed(0)], ['P/L', realized.toFixed(2)], ['Win', `${cfg.winRate}%`], ['Ping', `${rows.length ? Math.round(rows.reduce((s, r) => s + r.ms, 0) / rows.length) : '—'}ms`]] as const).map(([l, v]) => <div key={l} className="arb-hud"><small>{l}</small><b>{v}</b></div>)}
    </section>
    <div className="arb-switch mt-2" role="tablist" aria-label="Funding mode">
      <button type="button" className={funding === 'real' ? 'is-on' : ''} onClick={() => setFunding('real')}><i/> Real USDT<small>Settled</small></button>
      <button type="button" className={funding === 'virtual' ? 'is-on' : ''} onClick={() => setFunding('virtual')}><i/> Virtual USDT<small>Sandbox demo</small></button>
    </div>
    <nav className="arb-tabs mt-3" aria-label="BIXTrade sections">
      {([['cockpit', Cpu, 'Cockpit'], ['radar', Radar, 'Radar'], ['ai', BarChart3, 'AI'], ['logs', Activity, 'Logs']] as const).map(([k, Icon, l]) => <button key={k} type="button" onClick={() => setTab(k)} className={tab === k ? 'is-on' : ''}><Icon size={15}/>{l}</button>)}
    </nav>
    {stream.length > 0 && tab === 'radar' && <div className="arb-ticker"><div>{[...stream, ...stream].map((s, i) => <span key={i}>⚡ {s}</span>)}</div></div>}

    {tab === 'cockpit' && <>
    <section className="arb-card mt-4">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Zap size={18} className="text-chart-2"/> Live execution pulse</h2>
      <div className="mt-3 grid gap-2">{fundExecs.slice(0, 3).map(x => <button type="button" key={x.id} onClick={() => setReceipt(x)} className="arb-pulse-row text-left"><i/><span><b>{x.pair}</b> {x.buy_venue} → {x.sell_venue}<br/><span className="text-muted-foreground">{Number(x.notional_usd).toFixed(2)} USDT · {new Date(x.executed_at).toLocaleTimeString()}</span></span><b className={Number(x.net_usd) >= 0 ? 'text-chart-2' : 'text-destructive'}>{Number(x.net_usd) >= 0 ? '+' : ''}{Number(x.net_usd).toFixed(4)}</b></button>)}
        {!fundExecs.length && <p className="text-xs text-muted-foreground">{capital > 0 ? 'Bot is scanning — the first executions appear within a few minutes.' : funding === 'virtual' ? 'Add Virtual USDT bot capital to start executions. Trade size follows your capital (15–50% per ticket).' : 'Executions start after your deposit is approved. Trade size follows your capital (15–50% per ticket).'}</p>}</div>
    </section>

    <section className="arb-card mt-4">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold"><ArrowDownToLine size={18} className="text-chart-3"/> Bot wallet</h2>
      <div className="mt-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
        <div className="arb-stat"><p>{funding === 'real' ? 'Main wallet' : 'Recorded P/L'}</p><b>{funding === 'real' ? (mainUsdt === null ? '—' : mainUsdt.toFixed(2)) : realized.toFixed(2)}</b><small>{funding === 'real' ? 'USDT available' : 'virtual USDT'}</small></div>
        <div className="arb-stat"><p>Bot capital</p><b>{capital.toFixed(2)}</b><small>USDT · settled</small></div>
        <div className="arb-stat"><p>Pending</p><b>{pending}</b><small>requests</small></div>
        <div className="arb-stat"><p>Lock period</p><b>{cfg.lockDays}</b><small>days</small></div>
      </div>
      {funding === 'virtual' && <p className="mt-2 text-[11px] text-chart-3">Demo mode: virtual USDT runs the bot exactly like real USDT, but it never leaves or returns to your main wallet.</p>}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant={mode === 'deposit' ? 'default' : 'outline'} onClick={() => setMode('deposit')} disabled={!cfg.depositOpen}><ArrowDownToLine size={15}/> Deposit</Button>
        <Button variant={mode === 'withdraw' ? 'default' : 'outline'} onClick={() => setMode('withdraw')} disabled={!cfg.withdrawOpen}><ArrowUpFromLine size={15}/> Withdraw</Button>
      </div>
      <div className="mt-3 grid gap-2">
        <p className="text-[11px] text-muted-foreground">Strategy</p>
        <div className="grid gap-2 sm:grid-cols-3">{BIXTRADE_STRATEGIES.map(s => <button key={s.key} type="button" onClick={() => setStrategy(s.key)} className={`arb-strat ${strategy === s.key ? 'is-on' : ''}`}><b>{s.name}</b><span>{s.pairs}</span><em>Risk: {s.risk}</em></button>)}</div>
        <label className="mt-1 text-[11px] text-muted-foreground">Amount (USDT) {mode === 'deposit' ? `· ${cfg.minAlloc}–${cfg.maxAlloc}` : `· min ${cfg.minWithdraw} · fee ${cfg.withdrawFeePct}%`}
          <input className="form-input mt-1" type="number" inputMode="decimal" value={reqAmt} onChange={e => setReqAmt(e.target.value)} placeholder="0.00"/></label>
        <div className="arb-chips">{[100, 500, 1000, 5000].map(v => <button key={v} type="button" onClick={() => setReqAmt(String(v))}>${v.toLocaleString()}</button>)}
          <button type="button" onClick={() => { const max = mode === 'withdraw' ? capital : funding === 'real' ? Math.min(mainUsdt ?? 0, cfg.maxAlloc) : cfg.maxAlloc; setReqAmt(String(Math.floor(max * 100) / 100)); }}>MAX</button></div>
        {mode === 'withdraw' && n > 0 && <p className="text-xs">You receive ≈ <b className="text-chart-2">{withdrawNet(cfg, n).toFixed(2)} USDT</b> after fee{cfg.earlyExitEnabled && cfg.lockDays > 0 ? <> · before lock ends ≈ <b>{withdrawNet(cfg, n, true).toFixed(2)}</b></> : null}</p>}
        <Button disabled={busy || (mode === 'deposit' ? !cfg.depositOpen : !cfg.withdrawOpen)} onClick={submit}>{busy ? 'Sending…' : mode === 'deposit' ? 'Request deposit' : 'Request withdrawal'}</Button>
        {isAdmin && funding === 'virtual' && mode === 'deposit' && <Button variant="outline" disabled={busy} onClick={instantVirtual}><Zap size={15}/> Admin instant virtual deposit</Button>}
        {msg && <p className="text-xs text-chart-3">{msg}</p>}
        <p className="text-[10px] text-muted-foreground">Every request is reviewed by the owner. When a deposit is approved, the amount moves from your main wallet USDT into the bot; an approved withdrawal returns the amount after fee to your main wallet. Projected profit is never added automatically.</p>
      </div>
    </section>
    <BixtradePlan cfg={cfg}/>

    </>}

    {tab === 'radar' && <>
    <div className="arb-chips mt-4">{['ALL', 'BTC', 'ETH', 'SOL', 'BNB'].map(k => <button key={k} type="button" className={pairFilter === k ? 'is-on' : ''} onClick={() => setPairFilter(k)}>{k}</button>)}</div>
    <LivePanel live={live && { ...live, scan: live.scan.filter(s => pairFilter === 'ALL' || s.pair.startsWith(pairFilter)) }}/>
    <section className="arb-card mt-4 overflow-x-auto">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Radar size={18} className="text-chart-3"/> Live spread scanner</h2>
      <table className="mt-3 w-full min-w-[560px] text-left text-xs">
        <thead className="text-muted-foreground"><tr>{['Pair', 'Buy @', 'Sell @', 'Ask', 'Bid', 'Spread', 'Net after fees', 'Latency'].map(h => <th key={h} className="py-2 pr-2">{h}</th>)}</tr></thead>
        <tbody>{rows.filter(r => pairFilter === 'ALL' || r.pair.startsWith(pairFilter)).map(r => <tr key={r.pair} className="border-t border-border">
          <td className="py-2 pr-2 font-bold">{r.pair}</td><td className="pr-2">{r.buy}</td><td className="pr-2">{r.sell}</td>
          <td className="pr-2 font-mono">{r.ask.toFixed(2)}</td><td className="pr-2 font-mono">{r.bid.toFixed(2)}</td>
          <td className="pr-2 text-chart-3">{r.spread.toFixed(2)}%</td><td className={`pr-2 ${r.net > 0 ? 'text-chart-2' : 'text-destructive'}`}>{r.net.toFixed(2)}%</td><td>{r.ms}ms</td>
        </tr>)}</tbody>
      </table>
      {!rows.length && <p className="py-6 text-center text-muted-foreground">Syncing exchange prices…</p>}
    </section>

    <div className="mt-4"><RouteMap routes={profitable}/></div>
    </>}

    {tab === 'ai' && <>
    <div className="mt-4"><PerfChart cfg={cfg}/></div>

    <section className="arb-card mt-4">
      <h2 className="font-display text-lg font-bold">Projection calculator</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-[11px] text-muted-foreground">Allocation (USDT, {cfg.minAlloc}–{cfg.maxAlloc})<input className="form-input mt-1" type="number" min={cfg.minAlloc} max={cfg.maxAlloc} value={amount} onChange={e => setAmount(Number(e.target.value))}/></label>
        <label className="text-[11px] text-muted-foreground">Cycle (days)<select className="form-input mt-1" value={days} onChange={e => setDays(Number(e.target.value))}>{[1, 7, 30, 90].map(d => <option key={d} value={d}>{d} days</option>)}</select></label>
      </div>
      <p className="mt-4 text-sm">Projected result: <b className="text-chart-2">{proj.low.toFixed(2)} – {proj.high.toFixed(2)} USDT</b> on {proj.amount} USDT</p>
    </section>

    <ShareCard text={`BIXTrade Arbitrage Bot · ${BIXTRADE_STRATEGIES.find(x => x.key === strategy)?.name}\nProjection ${days}d on ${proj.amount} USDT: ${proj.low.toFixed(2)}–${proj.high.toFixed(2)} USDT (not guaranteed)\nWin rate ${cfg.winRate}% · ${BIXTRADE_VENUES.length} venues`}/>

    </>}

    {tab === 'logs' && <>
    <section className="mt-4 grid grid-cols-3 gap-2">
      {([['Trades', fundExecs.length], ['Win', `${fundExecs.length ? Math.round(fundExecs.filter(x => Number(x.net_usd) > 0).length / fundExecs.length * 100) : 0}%`], ['Avg', `${fundExecs.length ? Math.round(fundExecs.reduce((s, x) => s + x.latency_ms, 0) / fundExecs.length) : 0}ms`]] as const).map(([l, v]) => <div key={l} className="arb-hud"><small>{l}</small><b>{v}</b></div>)}
    </section>
    <details className="arb-card mt-3" open>
      <summary className="cursor-pointer font-display text-lg font-bold">Execution history ({logExecs.length}) · {funding === 'real' ? 'Real' : 'Virtual'}</summary>
      <div className="arb-chips mt-2">{(['all', 'win', 'scratch'] as const).map(k => <button key={k} type="button" className={logFilter === k ? 'is-on' : ''} onClick={() => setLogFilter(k)}>{k === 'all' ? 'All' : k === 'win' ? 'Profit' : 'Scratch / loss'}</button>)}</div>
      <p className="mt-2 text-[11px] text-muted-foreground">Total recorded: <b className={realized >= 0 ? 'text-chart-2' : 'text-destructive'}>{realized.toFixed(4)} USDT</b> — a performance record, not added to your wallet. Tap a trade for its receipt.</p>
      <div className="mt-3 grid gap-2">{logExecs.length ? logExecs.map(x => <button type="button" key={x.id} onClick={() => setReceipt(x)} className="arb-log-row">
        <div className="flex justify-between"><b>{x.pair}{x.source === 'live_quotes' && <span className="arb-badge is-approved ml-1">LIVE</span>}</b><b className={Number(x.net_usd) >= 0 ? 'text-chart-2' : 'text-destructive'}>{Number(x.net_usd) >= 0 ? '+' : ''}{Number(x.net_usd).toFixed(4)} USDT</b></div>
        <div className="text-muted-foreground">{x.buy_venue} → {x.sell_venue} · {new Date(x.executed_at).toLocaleTimeString()}</div>
      </button>) : <p className="text-xs text-muted-foreground">No executions yet. They start within 5 minutes after a deposit is approved.</p>}</div>
    </details>

    <details className="arb-card mt-4">
      <summary className="cursor-pointer font-display text-lg font-bold">My bot requests ({reqs.length})</summary>
      <div className="mt-3 grid gap-2">{reqs.length ? reqs.map(r => <div key={r.id} className="flex items-center justify-between border-t border-border pt-2 text-xs">
        <span><b className="uppercase">{r.kind}</b>{r.funding === 'virtual' ? ' · VIRTUAL' : ''} · {Number(r.amount_usd).toFixed(2)} USDT<br/><span className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}{r.admin_note ? ` · ${r.admin_note}` : ''}</span></span>
        <span className={`arb-badge is-${r.status}`}>{r.status}</span></div>) : <p className="text-xs text-muted-foreground">No requests yet.</p>}</div>
    </details>

    </>}

    {receipt && <div className="zoom-center" role="dialog" aria-modal="true" aria-label="Execution receipt" onClick={() => setReceipt(null)}><div className="zoom-panel arb-receipt" onClick={e => e.stopPropagation()}>
      <p className="shop-eyebrow">EXECUTION RECEIPT</p>
      <h3 className="font-display text-xl font-bold">{receipt.pair}</h3>
      <p className="font-mono text-[10px] text-muted-foreground">{receipt.ref}</p>
      <dl>{([['Leg 1 · Buy', `${receipt.buy_venue} @ ${Number(receipt.buy_price).toFixed(4)}`], ['Leg 2 · Sell', `${receipt.sell_venue} @ ${Number(receipt.sell_price).toFixed(4)}`], ['Quantity', Number(receipt.qty).toFixed(6)], ['Size', `${Number(receipt.notional_usd).toFixed(2)} USDT`], ['Taker fees (2 legs)', `${Number(receipt.fee_usd).toFixed(4)} USDT`], ['Net result', `${Number(receipt.net_usd).toFixed(4)} USDT`], ['Latency', `${receipt.latency_ms} ms`], ['Time', new Date(receipt.executed_at).toLocaleString()], ['Funding', receipt.funding === 'virtual' ? 'Virtual USDT (paper)' : 'Real USDT record'], ['Price source', receipt.source === 'live_quotes' ? 'Live exchange quotes' : 'Engine record']] as const).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      <p className="mt-2 text-[10px] text-muted-foreground">Recorded performance entry; no external exchange order and no automatic wallet credit.</p>
      <Button className="mt-3 w-full" onClick={() => setReceipt(null)}>Close</Button>
    </div></div>}
    <p className="mt-6 text-[11px] leading-5 text-muted-foreground">Risk disclosure: scanner routes and spreads are a display simulation built on live reference prices; BIXTrade does not place orders on external exchanges. Projection ranges are set by the owner, are not guaranteed, and nothing is added to your balance automatically — all deposits and withdrawals are owner-reviewed internal records.</p>
  </main></BixShell>;
}

const NODE = BIXTRADE_VENUES.map((v, i) => { const a = (i / BIXTRADE_VENUES.length) * Math.PI * 2 - Math.PI / 2; return { v, x: 150 + Math.cos(a) * 105, y: 105 + Math.sin(a) * 78 }; });
function RouteMap({ routes }: { routes: Row[] }) {
  const at = (v: string) => NODE.find(n => n.v === v)!;
  return <section className="arb-card">
    <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Network size={18} className="text-chart-3"/> Route map</h2>
    <svg viewBox="0 0 300 210" className="mt-2 w-full" role="img" aria-label="Active cross-exchange routes">
      {NODE.flatMap((a, i) => NODE.slice(i + 1).map(b => <line key={a.v + b.v} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="arb-edge"/>))}
      {routes.map(r => { const a = at(r.buy), b = at(r.sell); return <line key={r.pair} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="arb-route"/>; })}
      {NODE.map(n => { const on = routes.some(r => r.buy === n.v || r.sell === n.v); return <g key={n.v}><circle cx={n.x} cy={n.y} r={on ? 7 : 5} className={on ? 'arb-node is-on' : 'arb-node'}/><text x={n.x} y={n.y + (n.y < 105 ? -12 : 20)} textAnchor="middle" className="arb-node-label">{n.v}</text></g>; })}
    </svg>
    <div className="mt-1 grid gap-1 text-[11px]">{routes.length ? routes.map(r => <p key={r.pair}><b>{r.pair}</b> <span className="text-muted-foreground">{r.buy} → {r.sell}</span> <span className="text-chart-2">+{r.net.toFixed(2)}%</span></p>) : <p className="text-muted-foreground">Waiting for a profitable spread…</p>}</div>
  </section>;
}

function PerfChart({ cfg }: { cfg: BixtradeSettings }) {
  const data = useMemo(() => dailySeries(cfg, 14), [cfg]);
  const max = Math.max(cfg.maxDailyPct, 0.01);
  const avg = data.reduce((s, d) => s + d.pct, 0) / data.length;
  return <section className="arb-card">
    <h2 className="flex items-center gap-2 font-display text-lg font-bold"><BarChart3 size={18} className="text-chart-3"/> Daily performance</h2>
    <p className="text-[11px] text-muted-foreground">Last 14 days · avg {avg.toFixed(2)}% / day</p>
    <div className="arb-bars mt-3" role="img" aria-label="Daily performance bars">{data.map(d => <div key={d.date} title={`${d.date}: ${d.pct.toFixed(2)}%`}><i style={{ height: `${Math.max(6, (d.pct / max) * 100)}%` }}/><small>{d.date.slice(8)}</small></div>)}</div>
    <p className="mt-2 text-[10px] text-muted-foreground">Illustrative series inside the owner-set range ({cfg.minDailyPct}–{cfg.maxDailyPct}%). Not a record of real trades or a guarantee.</p>
  </section>;
}

function ShareCard({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window === 'undefined' ? '' : `${window.location.origin}/bixtrade`;
  const full = `${text}\n${url}`;
  const native = async () => { try { await navigator.share({ title: 'BIXTrade Bot', text, url }); } catch { /* cancelled */ } };
  const copy = async () => { await navigator.clipboard.writeText(full); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return <section className="arb-card arb-share mt-4">
    <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Share2 size={18} className="text-chart-3"/> Share card</h2>
    <pre className="arb-share-card mt-3">{text}</pre>
    <div className="mt-3 grid grid-cols-3 gap-2">
      <Button asChild variant="outline" size="sm"><a href={`https://wa.me/?text=${encodeURIComponent(full)}`} target="_blank" rel="noreferrer">WhatsApp</a></Button>
      <Button asChild variant="outline" size="sm"><a href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"><Send size={14}/> Telegram</a></Button>
      <Button variant="outline" size="sm" onClick={typeof navigator !== 'undefined' && 'share' in navigator ? native : copy}><Copy size={14}/> {copied ? 'Copied' : 'Share'}</Button>
    </div>
  </section>;
}

const REASON: Record<string, string> = { ok: 'Executed: spread beat both taker fees.', below_fees: 'No trade: every real spread is below the 0.2% round-trip fee — a real bot waits.', no_capital: 'Add Virtual USDT bot capital to start live paper execution.', wait: 'Cooling down — next check in under a minute.', closed: 'BIXTrade is closed.' };
function LivePanel({ live }: { live: { scan: LiveScan[]; reason: string; at: number } | null }) {
  return <section className="arb-card mt-4">
    <h2 className="flex items-center gap-2 font-display text-lg font-bold"><Zap size={18} className="text-chart-3"/> Real exchange quotes · Virtual USDT</h2>
    <p className="text-[11px] text-muted-foreground">Best bid/ask pulled every 20 s from public order books. Virtual USDT trades are paper-executed at these exact prices; no exchange order is placed.</p>
    {!live ? <p className="py-4 text-center text-xs text-muted-foreground">Connecting to exchanges…</p> : <>
      <div className="mt-3 grid gap-2">{live.scan.map(s => <div key={s.pair} className="border-t border-border pt-2 text-[11px]">
        <div className="flex justify-between"><b>{s.pair}</b><b className={s.netPct > 0 ? 'text-chart-2' : 'text-muted-foreground'}>{s.buy ? `${s.spreadPct.toFixed(3)}% · net ${s.netPct.toFixed(3)}%` : 'feed unavailable'}</b></div>
        {s.buy && s.sell && <div className="text-muted-foreground">Buy {s.buy.venue} @ {s.buy.ask} → Sell {s.sell.venue} @ {s.sell.bid}</div>}
        <div className="font-mono text-[10px] text-muted-foreground">{s.quotes.map(q => `${q.venue} ${q.bid}/${q.ask}`).join(' · ')}</div>
      </div>)}</div>
      <p className="mt-2 text-[11px] text-chart-3">{REASON[live.reason] ?? live.reason} · {new Date(live.at).toLocaleTimeString()}</p>
    </>}
  </section>;
}
