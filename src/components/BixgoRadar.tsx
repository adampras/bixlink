import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, MessageCircle, Phone, RefreshCw, SearchX, X } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { BixgoVehicleIcon, type VehicleKind } from '@/components/BixgoVehicleIcon';

const LIMIT = 60;
type Found = { driver_name: string; driver_phone: string; status: string };

/** Live driver search: polls the real booking row. Shows found, or a clear "no driver" state after 60 s. */
export function BixgoRadar({ bookingId, summary, onRetry, onSwitch, onClose }: { bookingId: string | null; summary?: { from: string; to: string; fare: string; pay: string; kind: VehicleKind }; onRetry: () => void; onSwitch: () => void; onClose: () => void }) {
  const [sec, setSec] = useState(0);
  const [found, setFound] = useState<Found | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    done.current = false; setSec(0); setFound(null); setCancelled(false);
    const t = setInterval(() => setSec(s => (done.current ? s : Math.min(LIMIT, s + 1))), 1000);
    const p = setInterval(async () => {
      if (!bookingId || done.current) return;
      const { data } = await supabase.from('bixgo_bookings').select('driver_name, driver_phone, status, driver_user_id').eq('id', bookingId).maybeSingle();
      if (data?.driver_user_id) { done.current = true; setFound(data as Found); navigator.vibrate?.([80, 60, 80]); }
      else if (data && /cancel|reject/.test(data.status)) { done.current = true; setCancelled(true); }
    }, 3000);
    return () => { clearInterval(t); clearInterval(p); };
  }, [bookingId]);

  const cancel = async () => { if (bookingId) await supabase.rpc('bixgo_passenger_cancel', { p_id: bookingId }); onClose(); };
  const timeout = !found && !cancelled && sec >= LIMIT;
  const msg = sec < 20 ? 'Menghubungkan ke driver terdekat…' : sec < 45 ? 'Memperluas jangkauan radar (3–5 km)…' : 'Menunggu konfirmasi driver di sekitar Anda…';

  if (found) return <div className="bixgo-radar-card rounded-3xl p-5 text-center">
    <CheckCircle2 className="mx-auto h-12 w-12 text-primary"/>
    <h2 className="mt-2 text-lg font-black">Driver ditemukan!</h2>
    <p className="text-base font-bold">{found.driver_name || 'Mitra BIXGO'}</p>
    <p className="text-xs text-muted-foreground">Driver sedang menuju lokasi jemput Anda</p>
    <div className="mt-4 grid grid-cols-2 gap-2">
      <Link to="/call" className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-border bg-card font-bold"><Phone className="h-4 w-4"/>BIX CALL</Link>
      <Link to="/call" className="flex min-h-12 items-center justify-center gap-2 rounded-full border border-border bg-card font-bold"><MessageCircle className="h-4 w-4"/>Chat</Link>
    </div>
    <button onClick={onClose} className="mt-3 min-h-12 w-full rounded-full bg-primary font-bold text-primary-foreground">Lihat perjalanan</button>
  </div>;

  if (timeout || cancelled) return <div className="bixgo-cancel-card rounded-3xl p-5 text-center">
    <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bixgo-cancel-ico"><SearchX className="h-7 w-7"/></span>
    <h2 className="mt-2 text-lg font-black">{cancelled ? 'Pesanan dibatalkan' : 'Driver belum tersedia'}</h2>
    <p className="mt-1.5 text-sm font-medium leading-relaxed text-foreground/90">{cancelled ? 'Pesanan ini sudah tidak aktif.' : 'Mitra driver di sekitar titik jemput sedang melayani perjalanan lain atau belum online.'}</p>
    <p className="bixgo-cancel-pill mx-auto mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold">✓ Tidak ada saldo yang terpotong</p>
    <div className="mt-4 grid gap-2">
      {!cancelled && <button onClick={() => { setSec(0); }} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary font-bold text-primary-foreground"><RefreshCw className="h-4 w-4"/>Coba cari lagi</button>}
      <button onClick={async () => { if (!cancelled && bookingId) await supabase.rpc('bixgo_passenger_cancel', { p_id: bookingId }); onSwitch(); }} className="min-h-12 rounded-full border border-border bg-secondary font-bold text-secondary-foreground">Ganti kendaraan</button>
      {cancelled ? <button onClick={onRetry} className="min-h-12 rounded-full border border-border font-bold">Pesan ulang</button> : <button onClick={cancel} className="min-h-12 rounded-full border border-border font-bold text-destructive">Batalkan pencarian</button>}
    </div>
  </div>;

  const pct = (sec / LIMIT) * 100;
  return <div className="bixgo-radar-card rounded-3xl p-5 text-center">
    {summary && <p className="mx-auto mb-4 flex max-w-full items-center justify-center gap-1.5 truncate rounded-full border border-border bg-background/60 px-3 py-1.5 text-[11px] font-semibold"><span className="truncate">📍 {summary.from}</span><span className="text-primary">➔</span><span className="truncate">🏁 {summary.to}</span></p>}
    <div className="bixgo-sonar mx-auto scale-90">
      <i className="blip" style={{ left: '22%', top: '30%' }}/><i className="blip" style={{ left: '70%', top: '24%', animationDelay: '.9s' }}/><i className="blip" style={{ left: '62%', top: '72%', animationDelay: '1.7s' }}/>
      <div className="core">{summary && <BixgoVehicleIcon kind={summary.kind} className="w-14"/>}</div>
    </div>
    <h2 className="mt-4 text-lg font-black tracking-wide">Mencari driver…</h2>
    <p className="text-sm text-muted-foreground">{msg}</p>
    <div className="mx-auto mt-3 flex items-center justify-center gap-3">
      <svg viewBox="0 0 36 36" className="h-11 w-11 -rotate-90"><circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--muted))" strokeWidth="3"/><circle cx="18" cy="18" r="15" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(100 - pct) * 0.942} 94.2`} className="transition-all"/></svg>
      <div className="text-left"><b className="block text-base tabular-nums">{LIMIT - sec}s</b>{summary && <span className="text-[11px] tabular-nums text-muted-foreground">{summary.fare} · {summary.pay}</span>}</div>
    </div>
    <button onClick={cancel} className="mt-4 inline-flex min-h-11 items-center gap-1 rounded-full border border-border bg-background/40 px-5 text-sm font-bold text-muted-foreground backdrop-blur"><X className="h-4 w-4"/>Batalkan</button>
  </div>;
}
