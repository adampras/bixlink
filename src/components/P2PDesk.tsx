import { DepthVisualizer } from '@/components/TechSuite';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ArrowDownRight, ArrowUpRight, ShieldCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { money, number } from '@/lib/bixlink';
import { P2P_CEILING, P2P_FLOOR, p2pPriceAllowed } from '@/lib/shipping';

type Offer = { id: string; user_id: string; side: string; price_usd: number; remaining_bix: number; amount_bix: number; status: string; created_at: string };
export function P2PDesk({ userId }: { userId?: string | undefined }) {
  const qc = useQueryClient();
  const book = useQuery({ queryKey: ['p2p-book'], enabled: !!userId, refetchInterval: 10000, queryFn: async () => {
    const [o, f] = await Promise.all([
      supabase.from('bix_p2p_offers').select('*').eq('status', 'open').order('price_usd').limit(200),
      supabase.from('bix_p2p_fills').select('*').order('created_at', { ascending: false }).limit(20),
    ]);
    if (o.error) throw o.error; if (f.error) throw f.error;
    return { offers: o.data as Offer[], fills: f.data };
  } });
  const bal = useQuery({ queryKey: ['p2p-bal', userId], enabled: !!userId, queryFn: async () => { const { data, error } = await supabase.rpc('bix_asset_balances', { p_user: userId! }); if (error) throw error; return data?.[0]; } });
  const [side, setSide] = useState<'SELL' | 'BUY'>('SELL');
  const [price, setPrice] = useState('0.45');
  const [amount, setAmount] = useState('');
  const [take, setTake] = useState<Offer | null>(null);
  const [takeAmt, setTakeAmt] = useState('');
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<'ALL' | 'SELL' | 'BUY'>('ALL');
  const refresh = () => { qc.invalidateQueries({ queryKey: ['p2p-book'] }); qc.invalidateQueries({ queryKey: ['p2p-bal', userId] }); };
  const run = async (fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) => { setBusy(true); const { error } = await fn(); setBusy(false); if (error) { toast.error(error.message); return false; } toast.success(ok); refresh(); return true; };

  if (!userId) return <div className="p2p-panel text-center"><p className="text-muted-foreground">Sign in to trade BIX with other members.</p><Button asChild className="mt-4"><Link to="/auth">Sign in</Link></Button></div>;
  const offers = book.data?.offers ?? [];
  const asks = offers.filter(o => o.side === 'SELL').sort((a, b) => a.price_usd - b.price_usd);
  const bids = offers.filter(o => o.side === 'BUY').sort((a, b) => b.price_usd - a.price_usd);
  const mine = offers.filter(o => o.user_id === userId);
  const p = Number(price), a = Number(amount);
  const post = async () => {
    if (!p2pPriceAllowed(p)) { toast.error(`Price must be $${P2P_FLOOR}–$${P2P_CEILING}`); return; }
    if (!(a >= 1)) { toast.error('Minimum 1 BIX'); return; }
    if (a > 100000) { toast.error('Maximum 100,000 BIX per offer'); return; }
    if (await run(() => supabase.rpc('bix_p2p_post', { p_side: side, p_price: p, p_amount: a }), 'Offer posted — funds held in escrow')) setAmount('');
  };
  const doTake = async () => { if (!take) return; const n = Number(takeAmt); if (!(n > 0) || n > Number(take.remaining_bix)) { toast.error('Enter an amount up to the offer size'); return; } if (await run(() => supabase.rpc('bix_p2p_take', { p_offer: take.id, p_amount: n }), 'Trade completed')) setTake(null); };
  const row = (o: Offer, kind: 'ask' | 'bid') => <li key={o.id} className={`p2p-row p2p-${kind}`}><span className="numeric">${Number(o.price_usd).toFixed(4)}</span><span className="numeric">{number(Number(o.remaining_bix))}</span><span className="numeric text-muted-foreground">{money(o.remaining_bix * o.price_usd)}</span>{o.user_id === userId ? <span className="text-[10px] text-chart-3">YOURS</span> : <Button size="sm" variant="outline" onClick={() => { setTake(o); setTakeAmt(String(o.remaining_bix)); }}>{kind === 'ask' ? 'Buy' : 'Sell'}</Button>}</li>;

  return <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
    <section className="p2p-panel">
      <DepthVisualizer asks={asks} bids={bids}/>
      <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-lg font-bold">Order book · BIX/USDT</h2><span className="text-[10px] tracking-widest text-muted-foreground">CORRIDOR ${P2P_FLOOR} – ${P2P_CEILING}</span></div>
      {book.isError ? <p role="alert" className="text-destructive">Order book unavailable.</p> : book.isPending ? <p className="text-muted-foreground">Loading…</p> : <>
        <div className="p2p-head"><span>Price</span><span>BIX</span><span>Total</span><span /></div>
        <div role="group" aria-label="Filter offers" className="mb-2 grid grid-cols-3 gap-2">{(['ALL', 'SELL', 'BUY'] as const).map(v => <Button key={v} size="sm" variant={view === v ? 'default' : 'outline'} aria-pressed={view === v} onClick={() => setView(v)}>{v === 'ALL' ? 'All' : v === 'SELL' ? 'Sell offers' : 'Buy offers'}</Button>)}</div>
        {view !== 'BUY' && <><p className="p2p-label text-destructive"><ArrowDownRight size={13} />Sell offers</p>
        <ul>{asks.length ? asks.map(o => row(o, 'ask')) : <li className="py-3 text-xs text-muted-foreground">No sell offers yet.</li>}</ul></>}
        {view !== 'SELL' && <><p className="p2p-label text-chart-2"><ArrowUpRight size={13} />Buy offers</p>
        <ul>{bids.length ? bids.map(o => row(o, 'bid')) : <li className="py-3 text-xs text-muted-foreground">No buy offers yet.</li>}</ul></>}
      </>}
      <h3 className="mt-6 mb-2 text-sm font-semibold">Recent trades</h3>
      <ul className="space-y-1 text-xs">{(book.data?.fills ?? []).map(f => <li key={f.id} className="flex justify-between"><span className="numeric">{number(Number(f.amount_bix))} BIX @ ${Number(f.price_usd).toFixed(4)}</span><span className="text-muted-foreground">{new Date(f.created_at).toLocaleString()}</span></li>)}{!book.data?.fills.length && <li className="text-muted-foreground">No trades yet.</li>}</ul>
    </section>
    <section className="space-y-5">
      <div className="p2p-panel">
        <div className="grid grid-cols-2 gap-2">{(['SELL', 'BUY'] as const).map(s => <Button key={s} variant={side === s ? 'default' : 'outline'} onClick={() => setSide(s)}>{s === 'SELL' ? 'Sell BIX' : 'Buy BIX'}</Button>)}</div>
        <p className="mt-3 text-xs text-muted-foreground">Available: <b className="numeric">{number(Number(bal.data?.bix_balance ?? 0))} BIX</b> · <b className="numeric">{money(Number(bal.data?.usdt_balance ?? 0))}</b></p>
        <label className="mt-3 grid gap-1 text-xs text-muted-foreground">Price per BIX (USDT)<input className="form-input" type="number" step="0.0001" min={P2P_FLOOR} max={P2P_CEILING} value={price} onChange={e => setPrice(e.target.value)} /></label>
        <label className="mt-3 grid gap-1 text-xs text-muted-foreground">Amount (BIX)<input className="form-input" type="number" min={1} max={100000} value={amount} onChange={e => setAmount(e.target.value)} /></label>
        <p className="mt-2 text-sm">Total: <b className="numeric">{money((p || 0) * (a || 0))}</b></p>
        <Button className="mt-3 w-full" disabled={busy} onClick={post}>Post {side === 'SELL' ? 'sell' : 'buy'} offer</Button>
        <p className="mt-2 flex gap-1 text-[11px] text-muted-foreground"><ShieldCheck size={13} className="shrink-0" />{side === 'SELL' ? 'Your BIX' : 'Your USDT'} is held in the internal ledger escrow until filled or cancelled.</p>
      </div>
      <div className="p2p-panel"><h3 className="mb-2 text-sm font-semibold">My open offers</h3><ul className="space-y-2">{mine.map(o => <li key={o.id} className="flex items-center justify-between text-xs"><span className={o.side === 'SELL' ? 'text-destructive' : 'text-chart-2'}>{o.side}</span><span className="numeric">{number(Number(o.remaining_bix))} @ ${Number(o.price_usd).toFixed(4)}</span><Button size="sm" variant="ghost" disabled={busy} onClick={() => run(() => supabase.rpc('bix_p2p_cancel', { p_offer: o.id }), 'Offer cancelled')}>Cancel</Button></li>)}{!mine.length && <li className="text-xs text-muted-foreground">No open offers.</li>}</ul></div>
    </section>
    <aside className="shop-disclosure lg:col-span-2">Member-to-member trades settle instantly inside the BIXLINK internal ledger at the agreed price. Prices are limited to the ${P2P_FLOOR}–${P2P_CEILING} corridor. This is not an external exchange; internal trades do not indicate external market liquidity or listing value.</aside>
    {take && <div className="modal-backdrop" onClick={() => setTake(null)}><div role="dialog" aria-modal="true" aria-label="Confirm trade" className="modal-panel max-w-sm" onClick={e => e.stopPropagation()}><div className="flex items-center justify-between"><h3 className="font-display text-lg font-bold">{take.side === 'SELL' ? 'Buy BIX' : 'Sell BIX'}</h3><Button size="icon" variant="ghost" aria-label="Close" onClick={() => setTake(null)}><X /></Button></div><p className="mt-1 text-xs text-muted-foreground">Price ${Number(take.price_usd).toFixed(4)} · up to {number(Number(take.remaining_bix))} BIX</p><input className="form-input mt-3 w-full" type="number" min={0} max={take.remaining_bix} value={takeAmt} onChange={e => setTakeAmt(e.target.value)} /><p className="mt-2 text-sm">{take.side === 'SELL' ? 'You pay' : 'You receive'}: <b className="numeric">{money(Number(takeAmt || 0) * take.price_usd)}</b></p><Button className="mt-4 w-full" disabled={busy} onClick={doTake}>Confirm trade</Button></div></div>}
  </div>;
}
