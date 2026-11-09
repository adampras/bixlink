import { P2PFleetDesk } from "@/components/P2PFleetDesk";
import { DepthVisualizer } from '@/components/TechSuite';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Activity, ArrowDownRight, ArrowUpRight, BadgeCheck, ShieldCheck, X, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { money, number } from '@/lib/bixlink';
import { P2P_CEILING, P2P_FLOOR, p2pPriceAllowed } from '@/lib/shipping';
import { bestOffer, expressMax } from '@/lib/p2p-express';
import { DEMO_POOL, demoFeed, demoPool, demoPrice } from '@/lib/p2p-demo-pool';

type Offer = { id: string; user_id: string; side: string; price_usd: number; remaining_bix: number; amount_bix: number; status: string; created_at: string };
type Fill = { id: string; at: string; bix: number; price: number; side: 'BUY' | 'SELL'; who: string };
type Pulse = { last_price: number | null; prev_price: number | null; volume_24h: number; usd_24h: number; trades_24h: number; trades_total: number; high_24h: number | null; low_24h: number | null; recent: Fill[]; merchants: Record<string, { tag: string; fills: number }> };

const ago = (iso: string) => { const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000)); return s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)}m ago` : s < 86400 ? `${Math.round(s / 3600)}h ago` : `${Math.round(s / 86400)}d ago`; };
const buzz = (ms = 14) => { try { navigator.vibrate?.(ms); } catch { /* unsupported */ } };

export function P2PDesk({ userId, refPrice }: { userId?: string | undefined; refPrice?: number }) {
  const qc = useQueryClient();
  const book = useQuery({ queryKey: ['p2p-book'], enabled: !!userId, refetchInterval: 10000, queryFn: async () => {
    const { data, error } = await supabase.from('bix_p2p_offers').select('*').eq('status', 'open').order('price_usd').limit(200);
    if (error) throw error; return data as Offer[];
  } });
  const pulse = useQuery({ queryKey: ['p2p-pulse'], enabled: !!userId, refetchInterval: 10000, queryFn: async () => {
    const { data, error } = await supabase.rpc('bix_p2p_market_pulse'); if (error) throw error; return data as unknown as Pulse | null;
  } });
  const bal = useQuery({ queryKey: ['p2p-bal', userId], enabled: !!userId, queryFn: async () => { const { data, error } = await supabase.rpc('bix_asset_balances', { p_user: userId! }); if (error) throw error; return data?.[0]; } });
  const [mode, setMode] = useState<'EXPRESS' | 'DESK'>('EXPRESS');
  const [busy, setBusy] = useState(false);
  const [take, setTake] = useState<Offer | null>(null);
  const [takeAmt, setTakeAmt] = useState('');

  // flash rows/fills that appeared since the previous poll
  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  useEffect(() => {
    const ids = [...(book.data ?? []).map(o => o.id), ...(pulse.data?.recent ?? []).map(f => f.id)];
    if (!ids.length) return;
    const prev = seen.current; seen.current = new Set(ids);
    if (!prev) return;
    const n = new Set(ids.filter(i => !prev.has(i)));
    if (!n.size) return;
    setFresh(n); const t = setTimeout(() => setFresh(new Set()), 1800);
    return () => clearTimeout(t);
  }, [book.data, pulse.data]);

  const refresh = () => { qc.invalidateQueries({ queryKey: ['p2p-book'] }); qc.invalidateQueries({ queryKey: ['p2p-pulse'] }); qc.invalidateQueries({ queryKey: ['p2p-bal', userId] }); };
  const run = async (fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) => { setBusy(true); buzz(); const { error } = await fn(); setBusy(false); if (error) { toast.error(error.message); return false; } buzz(40); toast.success(ok); refresh(); return true; };

  if (!userId) return <div className="p2p-panel text-center"><p className="text-muted-foreground">Sign in to trade BIX with other members.</p><Button asChild className="mt-4"><Link to="/auth">Sign in</Link></Button></div>;
  const offers = book.data ?? [];
  const asks = offers.filter(o => o.side === 'SELL').sort((a, b) => a.price_usd - b.price_usd);
  const bids = offers.filter(o => o.side === 'BUY').sort((a, b) => b.price_usd - a.price_usd);
  const balances = { bix: Number(bal.data?.bix_balance ?? 0), usdt: Number(bal.data?.usdt_balance ?? 0) };
  const doTake = async () => { if (!take) return; const n = Number(takeAmt); if (!(n > 0) || n > Number(take.remaining_bix)) { toast.error('Enter an amount up to the offer size'); return; } if (await run(() => supabase.rpc('bix_p2p_take', { p_offer: take.id, p_amount: n }), 'Trade completed · settled in the internal ledger')) setTake(null); };

  return <div className="p2p-desk grid gap-4">
    <P2PFleetDesk />
    <P2PStats pulse={pulse.data ?? null} asks={asks} bids={bids} refPrice={refPrice} />
    <div className="p2p-boxes">
      <button className="p2p-box is-buy" onClick={() => { buzz(); setMode('EXPRESS'); document.querySelector('.p2p-express')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}><ArrowUpRight size={22} /><b>BUY BIX</b><small>Bayar USDT · escrow</small></button>
      <button className="p2p-box is-sell" onClick={() => { buzz(); setMode('EXPRESS'); document.querySelector('.p2p-express')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}><ArrowDownRight size={22} /><b>SELL BIX</b><small>Receive USDT · escrow</small></button>
      <button className="p2p-box" onClick={() => { buzz(); setMode('DESK'); }}><Activity size={20} /><b>SET PRICE</b><small>Iklan merchant sendiri</small></button>
      <Link to="/buyback" className="p2p-box"><Zap size={20} /><b>FAST SELL</b><small>Dev buyback</small></Link>
    </div>
    <P2PLiveFeed real={pulse.data?.recent ?? []} fresh={fresh} />
    <div role="tablist" aria-label="Trading mode" className="p2p-modes">
      <button role="tab" aria-selected={mode === 'EXPRESS'} className={mode === 'EXPRESS' ? 'is-on' : ''} onClick={() => setMode('EXPRESS')}><Zap size={15} />Express</button>
      <button role="tab" aria-selected={mode === 'DESK'} className={mode === 'DESK' ? 'is-on' : ''} onClick={() => setMode('DESK')}><Activity size={15} />Merchant desk</button>
    </div>
    {mode === 'EXPRESS'
      ? <P2PExpress offers={offers} userId={userId} balances={balances} busy={busy} onTrade={(o, n) => run(() => supabase.rpc('bix_p2p_take', { p_offer: o.id, p_amount: n }), 'Express trade completed')} />
      : <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <P2PMerchants offers={offers} userId={userId} pulse={pulse.data ?? null} fresh={fresh} loading={book.isPending} error={book.isError} onTake={o => { setTake(o); setTakeAmt(String(o.remaining_bix)); }} />
          <section className="space-y-4">
            <div className="p2p-panel"><DepthVisualizer asks={asks} bids={bids} /></div>
            <P2PPost balances={balances} busy={busy} onPost={(side, p, a) => run(() => supabase.rpc('bix_p2p_post', { p_side: side, p_price: p, p_amount: a }), 'Offer posted — funds held in escrow')} />
            <div className="p2p-panel"><h3 className="mb-2 text-sm font-semibold">My open offers</h3><ul className="space-y-2">{offers.filter(o => o.user_id === userId).map(o => <li key={o.id} className="flex items-center justify-between text-xs"><span className={o.side === 'SELL' ? 'text-destructive' : 'text-chart-2'}>{o.side}</span><span className="numeric">{number(Number(o.remaining_bix))} @ ${Number(o.price_usd).toFixed(4)}</span><Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => supabase.rpc('bix_p2p_cancel', { p_offer: o.id }), 'Offer cancelled')}>Cancel</Button></li>)}{!offers.some(o => o.user_id === userId) && <li className="text-xs text-muted-foreground">No open offers.</li>}</ul></div>
          </section>
        </div>}
    <Link to="/buyback" className="p2p-buyback"><span className="flex items-center gap-2"><Zap size={15} />SELL BIX · DEV BUYBACK $0.25</span><span className="text-xs text-muted-foreground">Fast sell →</span></Link>
    <aside className="lux-deed" aria-label="Market disclosure">
      <div className="lux-deed-head"><ShieldCheck size={14} />BIXLINK INTERNAL ESCROW PROTOCOL</div>
      <ul>
        <li><b>Instant settlement</b><span>Member-to-member trades settle instantly inside the BIXLINK internal ledger at the agreed price.</span></li>
        <li><b>Price corridor ${P2P_FLOOR}–${P2P_CEILING}</b><span>Prices are limited to this corridor. AMM POOL rows are a labelled simulation and never move member balances.</span></li>
        <li><b>Internal utility market</b><span>Not an external exchange; internal trades do not indicate external market liquidity or listing value.</span></li>
      </ul>
    </aside>
    {take && <div className="modal-backdrop" onClick={() => setTake(null)}><div role="dialog" aria-modal="true" aria-label="Confirm trade" className="modal-panel max-w-sm" onClick={e => e.stopPropagation()}><div className="flex items-center justify-between"><h3 className="font-display text-lg font-bold">{take.side === 'SELL' ? 'Buy BIX' : 'Sell BIX'}</h3><Button size="icon" variant="ghost" aria-label="Close" onClick={() => setTake(null)}><X /></Button></div><p className="mt-1 text-xs text-muted-foreground">Price ${Number(take.price_usd).toFixed(4)} · up to {number(Number(take.remaining_bix))} BIX</p><input className="form-input mt-3 w-full" type="number" min={0} max={take.remaining_bix} value={takeAmt} onChange={e => setTakeAmt(e.target.value)} /><p className="mt-2 text-sm">{take.side === 'SELL' ? 'Anda bayar' : 'Anda terima'}: <b className="numeric">{money(Number(takeAmt || 0) * take.price_usd)}</b></p><p className="mt-2 rounded-lg border border-border p-2 text-[11px] text-muted-foreground">{take.side === 'SELL' ? <>Dibayar dari <b>saldo USDT wallet</b> Anda ({money(balances.usdt)}), tanpa TxID — BIX langsung masuk. Saldo kurang?</> : <>BIX dikirim dari saldo wallet Anda ({number(balances.bix)} BIX); USDT langsung masuk ke saldo.</>}</p>{take.side === 'SELL' && <Button variant="outline" className="mt-2 w-full" onClick={() => { setTake(null); document.getElementById('official-desk')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>Bayar USDT on-chain + TxID (Official Desk)</Button>}<Button className="mt-3 w-full" disabled={busy} onClick={doTake}>Konfirmasi transaksi</Button></div></div>}
  </div>;
}

function P2PSpark({ now }: { now: number }) {
  const cur = Math.floor(now / DEMO_POOL.stepMs);
  const pts = Array.from({ length: 48 }, (_, i) => demoPrice(cur - (47 - i) * 30));
  const lo = DEMO_POOL.min, hi = DEMO_POOL.max;
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${(i / 47 * 300).toFixed(1)},${(44 - (p - lo) / (hi - lo) * 40).toFixed(1)}`).join(' ');
  return <svg className="p2p-spark" viewBox="0 0 300 48" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="p2pSparkFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--chart-2)" stopOpacity=".35" /><stop offset="1" stopColor="var(--chart-2)" stopOpacity="0" /></linearGradient></defs>
    <path d={`${d} L300,48 L0,48 Z`} fill="url(#p2pSparkFill)" /><path d={d} fill="none" stroke="var(--chart-2)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
  </svg>;
}

function P2PStats({ pulse, asks, bids, refPrice }: { pulse: Pulse | null; asks: Offer[]; bids: Offer[]; refPrice?: number | undefined }) {
  const now = useClock(DEMO_POOL.stepMs);
  const pool = demoPool(now);
  const last = pulse?.last_price != null ? Number(pulse.last_price) : null;
  const prev = pulse?.prev_price != null ? Number(pulse.prev_price) : null;
  const price = last ?? pool.price;
  const up = last != null && prev != null ? last >= prev : true;
  const vol = Number(pulse?.volume_24h ?? 0) + pool.volume24h;
  const trades = Number(pulse?.trades_24h ?? 0) + pool.trades24h;
  return <section className="p2p-hud" aria-label="Market overview">
    <header><span className="p2p-hud-brand"><Zap size={13} />BIXLINK P2P DESK</span><span className="p2p-live"><i />PROTOCOL ONLINE</span></header>
    <div className="p2p-hud-price"><span>HARGA P2P {last != null ? '· ESCROW' : '· AMM POOL'}</span><b className={`numeric ${up ? 'text-chart-2' : 'text-destructive'}`}>${price.toFixed(4)}{up ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}</b><small>Koridor ${P2P_FLOOR}–${P2P_CEILING} · {asks.length + bids.length} order escrow</small>
      {refPrice ? <em className="p2p-hud-ref">Patokan ${refPrice.toFixed(4)}{price < refPrice && <i>Hemat {((1 - price / refPrice) * 100).toFixed(1)}%</i>}</em> : null}</div>
    <P2PSpark now={now} />
    <p className="p2p-hud-engine"><i />MATCHING ENGINE AKTIF · rata-rata cocok ~{Math.round(DEMO_POOL.stepMs / 1500)} detik</p>
    <div className="p2p-tape" aria-label="Recent transactions"><div className="p2p-tape-track">{[0, 1].map(k => <span key={k} aria-hidden={k === 1} className="contents">{demoFeed(now, 8).map(f => <span key={`${k}${f.id}`} className="p2p-tape-item"><b className={f.side === 'BUY' ? 'text-chart-2' : 'text-destructive'}>{f.side === 'BUY' ? '▲' : '▼'}</b>{f.who} {number(f.bix)} BIX @ ${f.price.toFixed(4)}</span>)}</span>)}</div></div>
    <div className="p2p-hud-grid">
      <div><span>VOLUME 24J</span><b className="numeric">{number(vol)}</b><small>BIX</small></div>
      <div><span>TRANSAKSI 24J</span><b className="numeric">{number(trades)}</b><small>{number(Number(pulse?.trades_24h ?? 0))} escrow</small></div>
      <div><span>AMM POOL</span><b className="numeric">{number(pool.bix)}</b><small>{money(pool.vusdt)} Vault USDT</small></div>
    </div>
    <footer><ShieldCheck size={13} />Smart Escrow Protected <span>·</span><BadgeCheck size={13} />0% Maker Fee</footer>
  </section>;
}

function useClock(ms: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => { if (!document.hidden) setNow(Date.now()); }, ms); return () => clearInterval(id); }, [ms]);
  return now;
}

function P2PLiveFeed({ real, fresh }: { real: Fill[]; fresh: Set<string> }) {
  const now = useClock(DEMO_POOL.stepMs);
  const rows = [...real.map(f => ({ ...f, demo: false as const })), ...demoFeed(now, 12)]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 12);
  return <section className="p2p-panel p2p-feed" aria-label="Live trades">
    <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-bold">24-Hour Direct Transactions</h3><span className="p2p-live"><i />LIVE</span></div>
    <ul>{rows.map(f => <li key={f.id} className={`${fresh.has(f.id) || f.id === `demo-${Math.floor(now / DEMO_POOL.stepMs)}` ? 'is-fresh' : ''}`}>
      <b className={f.side === 'BUY' ? 'text-chart-2' : 'text-destructive'}>{f.side === 'BUY' ? '▲ BUY' : '▼ SELL'}</b>
      <span className="truncate">{f.who}</span>
      <span className="numeric">{number(Number(f.bix))} BIX</span>
      <span className="numeric">${Number(f.price).toFixed(4)}</span>
      <em className={f.demo ? 'is-demo' : 'is-real'}>{f.demo ? 'AMM POOL' : 'P2P ESCROW ✓'}</em>
    </li>)}</ul>
    <p className="mt-2 text-[10px] text-muted-foreground">AMM POOL = automated protocol liquidity (simulated, does not move member balances). P2P ESCROW = member transactions recorded in internal ledger. Your Buy/Sell buttons always route to P2P ESCROW.</p>
  </section>;
}

function P2PTicker({ fills, fresh }: { fills: Fill[]; fresh: Set<string> }) {
  if (!fills.length) return <div className="p2p-ticker p2p-ticker--empty"><Activity size={14} />No matched trades yet — post the first offer.</div>;
  const items = fills.map(f => <span key={f.id} className={`p2p-tick ${fresh.has(f.id) ? 'is-fresh' : ''}`}><b className={f.side === 'BUY' ? 'text-chart-2' : 'text-destructive'}>{f.side === 'BUY' ? '▲' : '▼'}</b>{f.who} {f.side === 'BUY' ? 'bought' : 'sold'} <b className="numeric">{number(Number(f.bix))} BIX</b> @ <b className="numeric">${Number(f.price).toFixed(4)}</b><em>{ago(f.at)} ✓</em></span>);
  return <div className="p2p-ticker" aria-label="Recent matched trades"><div className="p2p-ticker-track">{items}<span aria-hidden="true" className="contents">{items}</span></div></div>;
}

function P2PExpress({ offers, userId, balances, busy, onTrade }: { offers: Offer[]; userId: string; balances: { bix: number; usdt: number }; busy: boolean; onTrade: (o: Offer, n: number) => Promise<boolean> }) {
  const [want, setWant] = useState<'BUY' | 'SELL'>('BUY');
  const [amt, setAmt] = useState('');
  const best = bestOffer(offers, want, userId) as Offer | null;
  const max = best ? expressMax(best, want, balances) : 0;
  const n = Number(amt);
  const total = best ? n * Number(best.price_usd) : 0;
  const go = async () => { if (!best) return; if (!(n > 0) || n > max) { toast.error(`Enter up to ${number(max)} BIX`); return; } if (await onTrade(best, n)) setAmt(''); };
  return <section className="p2p-panel p2p-express">
    <div className="p2p-side">{(['BUY', 'SELL'] as const).map(s => <button key={s} aria-pressed={want === s} className={want === s ? `is-on is-${s.toLowerCase()}` : ''} onClick={() => { setWant(s); setAmt(''); }}>{s === 'BUY' ? 'Buy BIX' : 'Sell BIX'}</button>)}</div>
    <p className="mt-3 text-xs text-muted-foreground">Available: <b className="numeric">{want === 'BUY' ? money(balances.usdt) : `${number(balances.bix)} BIX`}</b></p>
    <label className="p2p-amount"><span>Amount (BIX)</span><input type="number" inputMode="decimal" min={0} placeholder="0" value={amt} onChange={e => setAmt(e.target.value)} /></label>
    <div className="p2p-quick">{[25, 50, 75, 100].map(p => <button key={p} disabled={!max} onClick={() => { buzz(8); setAmt(String(Math.floor(max * p) / 100)); }}>{p === 100 ? 'Max' : `${p}%`}</button>)}</div>
    {best ? <div className="p2p-quote">
      <div><span>Best price</span><b className="numeric">${Number(best.price_usd).toFixed(4)}</b></div>
      <div><span>{want === 'BUY' ? 'You pay' : 'You receive'}</span><b className="numeric">{money(total || 0)}</b></div>
      <div><span>{want === 'BUY' ? 'You receive' : 'You send'}</span><b className="numeric">{number(n || 0)} BIX</b></div>
      <small>Best offer fills up to {number(Number(best.remaining_bix))} BIX · escrow guaranteed</small>
    </div> : <p className="p2p-quote p2p-quote--empty">No {want === 'BUY' ? 'sell' : 'buy'} offers available right now. Switch to Merchant desk to post your own price.</p>}
    <Button className={`p2p-go is-${want.toLowerCase()}`} disabled={busy || !best || !(n > 0)} onClick={go}>{want === 'BUY' ? 'Buy BIX now' : 'Sell BIX now'}</Button>
  </section>;
}

function P2PMerchants({ offers, userId, pulse, fresh, loading, error, onTake }: { offers: Offer[]; userId: string; pulse: Pulse | null; fresh: Set<string>; loading: boolean; error: boolean; onTake: (o: Offer) => void }) {
  const [view, setView] = useState<'BUY' | 'SELL' | 'MINE'>('BUY');
  const list = view === 'MINE' ? offers.filter(o => o.user_id === userId)
    : view === 'BUY' ? offers.filter(o => o.side === 'SELL').sort((a, b) => a.price_usd - b.price_usd)
    : offers.filter(o => o.side === 'BUY').sort((a, b) => b.price_usd - a.price_usd);
  const maxBix = Math.max(1, ...list.map(o => Number(o.remaining_bix)));
  return <section className="p2p-panel">
    <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-lg font-bold">Offers · BIX/USDT</h2><span className="text-[10px] tracking-widest text-muted-foreground">${P2P_FLOOR} – ${P2P_CEILING}</span></div>
    <div role="group" aria-label="Filter offers" className="p2p-filter">{([['BUY', 'Buy BIX'], ['SELL', 'Sell BIX'], ['MINE', 'My offers']] as const).map(([v, l]) => <button key={v} aria-pressed={view === v} className={view === v ? 'is-on' : ''} onClick={() => setView(v)}>{l}</button>)}</div>
    {error ? <p role="alert" className="text-destructive">Order book unavailable.</p> : loading ? <p className="text-muted-foreground">Loading…</p> :
    <ul className="mt-3 space-y-2">{list.map(o => {
      const m = pulse?.merchants?.[o.user_id]; const mine = o.user_id === userId; const sell = o.side === 'SELL';
      return <li key={o.id} className={`p2p-card ${fresh.has(o.id) ? 'is-fresh' : ''}`}>
        <i className={`p2p-depth ${sell ? 'is-ask' : 'is-bid'}`} style={{ width: `${(Number(o.remaining_bix) / maxBix) * 100}%` }} />
        <div className="p2p-merchant"><span className="p2p-avatar">{(m?.tag ?? 'BIX').slice(4, 6) || 'B'}</span><div><b>{mine ? 'You' : m?.tag ?? 'BIX-***'}{(m?.fills ?? 0) > 0 && <BadgeCheck size={13} className="ml-1 inline text-chart-2" />}</b><small>{m?.fills ? `${m.fills} trades completed` : 'New merchant'} · posted {ago(o.created_at)}</small></div></div>
        <div className="p2p-card-row"><div><b className={`numeric text-lg ${sell ? 'text-destructive' : 'text-chart-2'}`}>${Number(o.price_usd).toFixed(4)}</b><small>Available {number(Number(o.remaining_bix))} BIX · {money(o.remaining_bix * o.price_usd)}</small></div>
          {mine ? <span className="text-[10px] font-bold text-chart-3">YOURS</span> : <Button size="sm" className={sell ? 'p2p-go is-buy' : 'p2p-go is-sell'} onClick={() => onTake(o)}>{sell ? 'Buy' : 'Sell'}</Button>}</div>
      </li>; })}{!list.length && <li className="py-6 text-center text-xs text-muted-foreground">No offers here yet.</li>}</ul>}
  </section>;
}

function P2PPost({ balances, busy, onPost }: { balances: { bix: number; usdt: number }; busy: boolean; onPost: (side: 'SELL' | 'BUY', p: number, a: number) => Promise<boolean> }) {
  const [side, setSide] = useState<'SELL' | 'BUY'>('SELL');
  const [price, setPrice] = useState('0.45');
  const [amount, setAmount] = useState('');
  const p = Number(price), a = Number(amount);
  const post = async () => {
    if (!p2pPriceAllowed(p)) { toast.error(`Price must be $${P2P_FLOOR}–$${P2P_CEILING}`); return; }
    if (!(a >= 1)) { toast.error('Minimum 1 BIX'); return; }
    if (a > 100000) { toast.error('Maximum 100,000 BIX per offer'); return; }
    if (await onPost(side, p, a)) setAmount('');
  };
  return <div className="p2p-panel">
    <h3 className="mb-2 text-sm font-semibold">Post your own price</h3>
    <div className="p2p-side">{(['SELL', 'BUY'] as const).map(s => <button key={s} aria-pressed={side === s} className={side === s ? `is-on is-${s.toLowerCase()}` : ''} onClick={() => setSide(s)}>{s === 'SELL' ? 'Sell BIX' : 'Buy BIX'}</button>)}</div>
    <p className="mt-3 text-xs text-muted-foreground">Available: <b className="numeric">{number(balances.bix)} BIX</b> · <b className="numeric">{money(balances.usdt)}</b></p>
    <label className="mt-3 grid gap-1 text-xs text-muted-foreground">Price per BIX (USDT)<input className="form-input" type="number" step="0.0001" min={P2P_FLOOR} max={P2P_CEILING} value={price} onChange={e => setPrice(e.target.value)} /></label>
    <label className="mt-3 grid gap-1 text-xs text-muted-foreground">Amount (BIX)<input className="form-input" type="number" min={1} max={100000} value={amount} onChange={e => setAmount(e.target.value)} /></label>
    <p className="mt-2 text-sm">Total: <b className="numeric">{money((p || 0) * (a || 0))}</b></p>
    <Button className="mt-3 w-full" disabled={busy} onClick={post}>Post {side === 'SELL' ? 'sell' : 'buy'} offer</Button>
    <p className="mt-2 flex gap-1 text-[11px] text-muted-foreground"><ShieldCheck size={13} className="shrink-0" />{side === 'SELL' ? 'Your BIX' : 'Your USDT'} is held in the internal ledger escrow until filled or cancelled.</p>
  </div>;
}
