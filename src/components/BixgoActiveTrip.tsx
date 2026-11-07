import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { CarFront, Loader2, MessageCircle, Phone, Radar, X, CheckCircle2, Navigation } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { startBixCall } from '@/components/BixCall';

type Trip = { id: string; status: string; vehicle: string; pickup: string; dropoff: string; km: number; total_idr: number; pay_method: string | null; driver_name: string; plate: string; driver_user_id: string | null; created_at: string };

const STEPS = ['pending', 'assigned', 'in_transit', 'completed'] as const;
const LABEL: Record<string, string> = { pending: 'Searching for a driver…', assigned: 'Driver is on the way', in_transit: 'On the trip', completed: 'Trip completed', cancelled: 'Cancelled' };
const rp = (n: number) => `Rp ${Math.round(n).toLocaleString('id-ID')}`;

/** Passenger live trip card: polls own latest booking, shows driver and BIX CALL contact buttons. */
export function BixgoActiveTrip() {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [busy, setBusy] = useState(false);
  const last = useRef('');
  const load = async () => {
    const { data: u } = await supabase.auth.getUser(); if (!u.user) return;
    const { data } = await supabase.from('bixgo_bookings').select('id,status,vehicle,pickup,dropoff,km,total_idr,pay_method,driver_name,plate,driver_user_id,created_at,completed_at')
      .eq('user_id', u.user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
    const t = data as (Trip & { completed_at: string | null }) | null;
    const fresh = t && (['pending', 'assigned', 'in_transit'].includes(t.status) || (t.status === 'completed' && t.completed_at && Date.now() - new Date(t.completed_at).getTime() < 30 * 60_000));
    if (t && last.current && last.current !== t.status) { navigator.vibrate?.([200, 100, 200]); toast.success(LABEL[t.status] ?? t.status); }
    last.current = t?.status ?? '';
    setTrip(fresh ? t : null);
  };
  useEffect(() => { void load(); const i = setInterval(() => void load(), 8000); return () => clearInterval(i); }, []);
  if (!trip) return null;
  const idx = STEPS.indexOf(trip.status as typeof STEPS[number]);
  const name = trip.driver_name || 'Driver';
  const cancel = async () => { setBusy(true); const { error } = await supabase.rpc('bixgo_passenger_cancel', { p_id: trip.id }); setBusy(false); if (error) toast.error(error.message); else { toast.success('Request cancelled'); void load(); } };

  return <section className="bixgo-trip mx-3 my-3 rounded-3xl border border-primary/40 bg-card/90 p-4 shadow-lg backdrop-blur" aria-label="Active trip">
    <div className="flex items-center justify-between">
      <b className="text-[11px] uppercase tracking-widest text-primary">Active trip · #{trip.id.slice(0, 8).toUpperCase()}</b>
      <span className="text-[11px] text-muted-foreground">{trip.vehicle}</span>
    </div>
    <div className="mt-3 flex items-center gap-3">
      <span className="relative grid h-14 w-14 place-items-center rounded-full bg-primary/15">
        {trip.status === 'pending' ? <><span className="absolute inset-0 animate-ping rounded-full bg-primary/25"/><Radar className="h-7 w-7 text-primary"/></> : trip.status === 'completed' ? <CheckCircle2 className="h-7 w-7 text-primary"/> : <CarFront className="h-7 w-7 text-primary"/>}
      </span>
      <div className="min-w-0 flex-1">
        <b className="block text-base">{LABEL[trip.status] ?? trip.status}</b>
        {trip.driver_user_id ? <span className="block truncate text-xs text-muted-foreground">{name}{trip.plate ? ` · ${trip.plate}` : ''}</span> : <span className="block text-xs text-muted-foreground">Nearby drivers in your city are being notified</span>}
      </div>
      <b className="text-sm tabular-nums">{rp(trip.total_idr)}</b>
    </div>
    <ol className="mt-3 grid grid-cols-4 gap-1" aria-label="Trip progress">{STEPS.map((s, i) => <li key={s} className={`h-1.5 rounded-full ${i <= idx ? 'bg-primary' : 'bg-muted'}`}/>)}</ol>
    <p className="mt-2 truncate text-xs text-muted-foreground">{trip.pickup} → {trip.dropoff} · {Number(trip.km).toFixed(1)} km · {trip.pay_method}</p>
    <div className="mt-3 flex gap-2">
      {trip.driver_user_id && trip.status !== 'completed' && <>
        <button onClick={() => startBixCall(trip.driver_user_id!, name, 'voice')} className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary py-2.5 text-sm font-bold text-primary-foreground"><Phone className="h-4 w-4"/>Call</button>
        <Link to="/call" search={{ chat: trip.driver_user_id, n: name }} className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-primary/50 py-2.5 text-sm font-bold text-primary"><MessageCircle className="h-4 w-4"/>Chat</Link>
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(trip.dropoff)}`} target="_blank" rel="noopener noreferrer" aria-label="Open route" className="grid w-11 place-items-center rounded-full border border-border"><Navigation className="h-4 w-4"/></a>
      </>}
      {trip.status === 'pending' && <button disabled={busy} onClick={() => void cancel()} className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-destructive/50 py-2.5 text-sm font-bold text-destructive">{busy ? <Loader2 className="h-4 w-4 animate-spin"/> : <X className="h-4 w-4"/>}Cancel request</button>}
    </div>
    <p className="mt-2 text-[10px] text-muted-foreground">Calls and chats go through BIX CALL — your phone number stays private.</p>
  </section>;
}
