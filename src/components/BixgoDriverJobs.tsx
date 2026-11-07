import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { CheckCircle2, Loader2, MapPin, MessageCircle, Navigation, Phone, Play, X } from 'lucide-react';
import { startBixCall } from '@/components/BixCall';

/** Three-note radar chime for a new order (Web Audio, no downloads). */
export function jobChime() {
  try {
    const c = new AudioContext();
    [880, 1175, 1568].forEach((f, i) => { const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + i * 0.18; o.frequency.value = f; g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35); o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.4); });
    setTimeout(() => void c.close(), 1500);
  } catch { /* audio unavailable */ }
}
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { payKind, type PayKind } from '@/lib/bixgo-pay';
import { Button } from '@/components/ui/button';
import { BixgoCancelDialog } from '@/components/BixgoCancelDialog';
import { BixgoDriverLocation } from '@/components/BixgoDriverLocation';
import { BixgoEarnings } from '@/components/BixgoEarnings';
import { earningsTotals } from '@/lib/bixgo-earnings';

type Job = { id: string; city: string; service: string; vehicle: string; pickup: string; dropoff: string; km: number; total_idr: number; fare_idr?: number; pay_method?: string; status: string; fare_usdt: number; driver_usdt: number; fare_bix?: number; driver_bix?: number; gas_bix?: number; created_at: string; completed_at?: string | null; pickup_note?: string; rating?: number | null; rating_note?: string; owner_usdt?: number; owner_bix?: number };
const SVC: Record<string, string> = { ride: 'Ride', car: 'Car', food: 'Food', send: 'Send', mart: 'Mart' };

const usdt = (n: number) => `${Number(n || 0).toFixed(2)} USDT`;
const bixf = (n: number) => `${Number(n || 0).toFixed(2)} BIX`;
const rp = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;
const nav = (q: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}&travelmode=driving`;
const BADGE: Record<PayKind, string> = { usdt: 'USDT · Auto hold', bix: 'BIX Token · Auto hold', cash: 'Cash · BIX fee first' };

/** Driver order desk: accept open trips, start, complete. USDT/BIX fares settle 85% to driver; cash trips charge the company fee in BIX on accept. */
export function BixgoDriverJobs({ online, adj = 0, onRating }: { online: boolean; adj?: number; onRating?: (r: { avg: number | null; n: number }) => void }) {
  const [open, setOpen] = useState<Job[]>([]);
  const [mine, setMine] = useState<Job[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [pax, setPax] = useState<Record<string, string>>({});
  const seen = useRef(new Set<string>());
  const primed = useRef(false);
  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('bixgo_driver_jobs');
    if (error) return;
    const d = data as { open: Job[]; mine: Job[]; rating?: { avg: number | null; n: number } };
    if (d.rating) onRating?.(d.rating);
    const nextOpen = d.open ?? [];
    const fresh = nextOpen.filter(j => !seen.current.has(j.id));
    if (primed.current && fresh.length && online) { jobChime(); navigator.vibrate?.([300, 120, 300, 120, 300]); toast.success(`New order · ${fresh[0]?.pickup}`); }
    nextOpen.forEach(j => seen.current.add(j.id)); primed.current = true;
    setOpen(nextOpen); setMine(d.mine ?? []);
    const act = (d.mine ?? []).filter(j => j.status === 'assigned' || j.status === 'in_transit').map(j => j.id);
    if (act.length) { const { data: rows } = await supabase.from('bixgo_bookings').select('id,user_id').in('id', act); setPax(Object.fromEntries((rows ?? []).map(r => [r.id, r.user_id]))); }
  }, [online, onRating]);
  useEffect(() => { void load(); const t = setInterval(() => void load(), 10_000); return () => clearInterval(t); }, [load, online]);

  const act = async (id: string, fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) => {
    setBusy(id); const { error } = await fn(); setBusy(null);
    if (error) toast.error(error.message); else { toast.success(ok); void load(); }
  };
  const accept = (j: Job) => act(j.id, () => supabase.rpc('bixgo_driver_accept', { p_id: j.id }), payKind(j.pay_method) === 'cash' ? 'Order accepted · BIX fee paid, collect cash from passenger' : 'Order accepted · passenger fare held');
  const advance = (id: string, s: string, ok: string) => act(id, () => supabase.rpc('bixgo_driver_advance', { p_id: id, p_status: s }), ok);

  const active = mine.filter(j => j.status === 'assigned' || j.status === 'in_transit');
  const done = mine.filter(j => j.status === 'completed');
  const totals = earningsTotals(done);
  const earned = totals.usdt;
  const earnedBix = totals.bix;
  const Btn = ({ id, onClick, children, ghost }: { id: string; onClick: () => void; children: React.ReactNode; ghost?: boolean }) =>
    <Button disabled={busy === id} onClick={onClick} className={`flex flex-1 items-center justify-center gap-1 rounded-full py-2 text-xs font-bold ${ghost ? 'border border-border text-muted-foreground' : 'bg-primary text-primary-foreground'}`}>{busy === id ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : children}</Button>;
  const Pay = ({ j }: { j: Job }) => { const k = payKind(j.pay_method); return <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${k === 'cash' ? 'border-destructive/50 text-destructive' : 'border-primary/50 text-primary'}`}>{BADGE[k]}</span>; };
  const Route = ({ j }: { j: Job }) => <div className="space-y-1 text-[11px]">
    <p className="flex gap-1"><MapPin className="h-3.5 w-3.5 shrink-0 text-primary"/>{j.pickup}</p>
    <p className="flex gap-1"><Navigation className="h-3.5 w-3.5 shrink-0 text-muted-foreground"/>{j.dropoff}</p>
    {j.pickup_note && <p className="rounded-lg bg-primary/10 px-2 py-1 text-[10px]"><b className="text-primary">Note:</b> {j.pickup_note}</p>}
    <p className="text-muted-foreground tabular-nums">{SVC[j.service] ?? j.service} · {j.city} · {j.vehicle} · {Number(j.km).toFixed(1)} km</p>
  </div>;
  const amount = (j: Job) => { const k = payKind(j.pay_method); return k === 'bix' ? bixf(j.fare_bix ?? 0) : k === 'cash' ? `${rp(j.fare_idr ?? j.total_idr)} cash` : usdt(j.fare_usdt); };

  return <div className="space-y-3">
    <div className="grid grid-cols-3 gap-2 text-center tabular-nums">
      <div className="rounded-xl border border-primary/30 p-2"><b className="block text-sm text-primary">{usdt(earned)}</b><span className="text-[10px] text-muted-foreground">USDT received</span></div>
      <div className="rounded-xl border border-primary/30 p-2"><b className="block text-sm text-primary">{bixf(earnedBix)}</b><span className="text-[10px] text-muted-foreground">BIX received</span></div>
      <div className="rounded-xl border border-border p-2"><b className="block text-sm">{done.length}</b><span className="text-[10px] text-muted-foreground">Completed</span></div>
    </div>

    {active.length > 0 && <BixgoDriverLocation ids={active.map(j => j.id)}/>}
    {cancelId && <BixgoCancelDialog id={cancelId} role="driver" open onClose={() => setCancelId(null)} onDone={() => void load()}/>}
    {active.map(j => <div key={j.id} className="space-y-2 rounded-2xl border border-primary/40 bg-primary/5 p-3">
      <p className="flex items-center justify-between gap-2 text-xs font-bold"><span>{j.status === 'assigned' ? 'Go to pickup' : 'On trip'}</span><Pay j={j}/><span className="tabular-nums text-primary">{amount(j)}</span></p>
      {payKind(j.pay_method) === 'cash' && <p className="text-[10px] text-muted-foreground">Fee paid: {bixf(j.gas_bix ?? 0)}. Collect {rp(j.fare_idr ?? j.total_idr)} cash from the passenger.</p>}
      <Route j={j}/>
      <a href={nav(j.status === 'assigned' ? j.pickup : j.dropoff)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1 rounded-full border border-primary py-2 text-xs font-bold text-primary"><Navigation className="h-3.5 w-3.5"/>Voice navigation</a>
      {pax[j.id] && <div className="flex gap-2">
        <button onClick={() => startBixCall(pax[j.id] ?? '', 'Passenger', 'voice')} className="flex flex-1 items-center justify-center gap-1 rounded-full bg-primary/15 py-2 text-xs font-bold text-primary"><Phone className="h-3.5 w-3.5"/>Call passenger</button>
        <Link to="/call" search={{ chat: pax[j.id] ?? '', n: 'Passenger' }} className="flex flex-1 items-center justify-center gap-1 rounded-full bg-primary/15 py-2 text-xs font-bold text-primary"><MessageCircle className="h-3.5 w-3.5"/>Chat</Link>
      </div>}
      <div className="flex gap-2">
        {j.status === 'assigned' && <><Btn id={j.id} onClick={() => void advance(j.id, 'in_transit', 'Trip started')}><Play className="h-3.5 w-3.5"/>Start trip</Btn><Btn ghost id={j.id} onClick={() => setCancelId(j.id)}><X className="h-3.5 w-3.5"/>Release</Btn></>}
        {j.status === 'in_transit' && <Btn id={j.id} onClick={() => void advance(j.id, 'completed', 'Trip completed')}><CheckCircle2 className="h-3.5 w-3.5"/>Confirm completed</Btn>}
      </div>
    </div>)}

    <div>
      <h4 className="mb-2 text-xs font-black">Incoming orders</h4>
      {!online && <p className="text-[11px] text-muted-foreground">Go online to receive orders in your city.</p>}
      {online && !open.length && <p className="text-[11px] text-muted-foreground">No open orders right now. This list refreshes every 10 seconds.</p>}
      <div className="space-y-2">{open.map(j => { const est = Math.round(Number(j.total_idr) * (1 + adj / 100)); return <div key={j.id} className="space-y-2 rounded-2xl border border-border p-3">
        <div className="flex items-center justify-between gap-2"><Pay j={j}/><b className="text-xs tabular-nums">{rp(est)}{adj !== 0 && <span className="ml-1 text-[10px] text-primary">({adj > 0 ? '+' : ''}{adj}%)</span>}</b></div>
        <Route j={j}/>
        <Btn id={j.id} onClick={() => void accept(j)}>Accept order</Btn>
      </div>; })}</div>
    </div>
    <BixgoEarnings trips={mine}/>
    <p className="text-[10px] text-muted-foreground">USDT/BIX orders hold the passenger's fare; on completion 85% goes to you and 15% to BIXLINK. Cash orders take the BIXLINK fee from your BIX balance when you accept. Cancelling before the trip starts releases held amounts and records your reason.</p>
  </div>;
}
