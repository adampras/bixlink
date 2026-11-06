import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Loader2, MapPin, Navigation, Play, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type Job = { id: string; city: string; service: string; vehicle: string; pickup: string; dropoff: string; km: number; total_idr: number; status: string; fare_usdt: number; driver_usdt: number; created_at: string };

const usdt = (n: number) => `${Number(n || 0).toFixed(2)} USDT`;
const nav = (q: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}&travelmode=driving`;

/** Driver order desk: accept open trips (holds passenger USDT), start, complete (85% auto-settles to driver). */
export function BixgoDriverJobs({ online }: { online: boolean }) {
  const [open, setOpen] = useState<Job[]>([]);
  const [mine, setMine] = useState<Job[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('bixgo_driver_jobs');
    if (error) return;
    const d = data as { open: Job[]; mine: Job[] };
    setOpen(d.open ?? []); setMine(d.mine ?? []);
  }, []);
  useEffect(() => { void load(); const t = setInterval(() => void load(), 10_000); return () => clearInterval(t); }, [load, online]);

  const act = async (id: string, fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) => {
    setBusy(id); const { error } = await fn(); setBusy(null);
    if (error) toast.error(error.message); else { toast.success(ok); void load(); }
  };
  const accept = (id: string) => act(id, () => supabase.rpc('bixgo_driver_accept', { p_id: id }), 'Order accepted · passenger fare held');
  const advance = (id: string, s: string, ok: string) => act(id, () => supabase.rpc('bixgo_driver_advance', { p_id: id, p_status: s }), ok);

  const active = mine.filter(j => j.status === 'assigned' || j.status === 'in_transit');
  const done = mine.filter(j => j.status === 'completed');
  const earned = done.reduce((a, j) => a + Number(j.driver_usdt), 0);
  const Btn = ({ id, onClick, children, ghost }: { id: string; onClick: () => void; children: React.ReactNode; ghost?: boolean }) =>
    <button disabled={busy === id} onClick={onClick} className={`flex flex-1 items-center justify-center gap-1 rounded-full py-2 text-xs font-bold ${ghost ? 'border border-border text-muted-foreground' : 'bg-primary text-primary-foreground'}`}>{busy === id ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : children}</button>;
  const Route = ({ j }: { j: Job }) => <div className="space-y-1 text-[11px]">
    <p className="flex gap-1"><MapPin className="h-3.5 w-3.5 shrink-0 text-primary"/>{j.pickup}</p>
    <p className="flex gap-1"><Navigation className="h-3.5 w-3.5 shrink-0 text-muted-foreground"/>{j.dropoff}</p>
    <p className="text-muted-foreground tabular-nums">{j.city} · {j.vehicle} · {Number(j.km).toFixed(1)} km · Rp {Math.round(j.total_idr).toLocaleString('id-ID')}</p>
  </div>;

  return <div className="space-y-3">
    <div className="grid grid-cols-2 gap-2 text-center tabular-nums">
      <div className="rounded-xl border border-primary/30 p-2"><b className="block text-base text-primary">{usdt(earned)}</b><span className="text-[10px] text-muted-foreground">Settled to your wallet (85%)</span></div>
      <div className="rounded-xl border border-border p-2"><b className="block text-base">{done.length}</b><span className="text-[10px] text-muted-foreground">Completed trips</span></div>
    </div>

    {active.map(j => <div key={j.id} className="space-y-2 rounded-2xl border border-primary/40 bg-primary/5 p-3">
      <p className="flex justify-between text-xs font-bold"><span>{j.status === 'assigned' ? 'Go to pickup' : 'On trip'}</span><span className="tabular-nums text-primary">{usdt(j.fare_usdt)}</span></p>
      <Route j={j}/>
      <a href={nav(j.status === 'assigned' ? j.pickup : j.dropoff)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1 rounded-full border border-primary py-2 text-xs font-bold text-primary"><Navigation className="h-3.5 w-3.5"/>Voice navigation</a>
      <div className="flex gap-2">
        {j.status === 'assigned' && <><Btn id={j.id} onClick={() => void advance(j.id, 'in_transit', 'Trip started')}><Play className="h-3.5 w-3.5"/>Start trip</Btn><Btn ghost id={j.id} onClick={() => void advance(j.id, 'cancelled', 'Order released · fare returned')}><X className="h-3.5 w-3.5"/>Release</Btn></>}
        {j.status === 'in_transit' && <Btn id={j.id} onClick={() => void advance(j.id, 'completed', `Trip completed · ${usdt(j.fare_usdt * 0.85)} credited`)}><CheckCircle2 className="h-3.5 w-3.5"/>Confirm completed</Btn>}
      </div>
    </div>)}

    <div>
      <h4 className="mb-2 text-xs font-black">Incoming orders</h4>
      {!online && <p className="text-[11px] text-muted-foreground">Go online to receive orders in your city.</p>}
      {online && !open.length && <p className="text-[11px] text-muted-foreground">No open orders right now. This list refreshes every 10 seconds.</p>}
      <div className="space-y-2">{open.map(j => <div key={j.id} className="space-y-2 rounded-2xl border border-border p-3">
        <Route j={j}/>
        <Btn id={j.id} onClick={() => void accept(j.id)}>Accept order</Btn>
      </div>)}</div>
    </div>
    <p className="text-[10px] text-muted-foreground">Accepting holds the trip fare in USDT from the passenger's wallet. On completion 85% goes to you and 15% to BIXLINK; releasing an order returns the fare to the passenger.</p>
  </div>;
}
