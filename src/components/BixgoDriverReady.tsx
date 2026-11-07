import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { BadgeCheck, Bell, Fuel, LifeBuoy, MapPin, MonitorSmartphone, Phone, ShieldCheck, Star, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { jobChime } from '@/components/BixgoDriverJobs';

export const MIN_GAS_BIX = 5;

type Lic = { full_name?: string; vehicle_type: string; vehicle_model: string; plate: string; city: string; online: boolean; accept_cash?: boolean };

/** Driver pre-flight checklist + digital partner ID + SOS. Readiness hints only; the server still enforces balance on accept. */
export function BixgoDriverReady({ lic, uid, rating }: { lic: Lic; uid: string; rating: { avg: number | null; n: number } }) {
  const [bix, setBix] = useState<number | null>(null);
  const [gps, setGps] = useState<'unknown' | 'ok' | 'denied'>('unknown');
  const [sound, setSound] = useState(false);
  const [code, setCode] = useState('');
  const [wake, setWake] = useState(false);
  const lock = useRef<{ release: () => Promise<void> } | null>(null);

  useEffect(() => {
    void supabase.rpc('bix_asset_balances', { p_user: uid }).single().then(({ data }) => setBix(Number((data as { bix_balance?: number } | null)?.bix_balance ?? 0)));
    void supabase.from('referral_codes').select('code').eq('user_id', uid).maybeSingle().then(({ data }) => setCode((data as { code?: string } | null)?.code ?? ''));
    try { localStorage.getItem('bixgo_sound_ok') === '1' && setSound(true); } catch { /* ignore */ }
    navigator.permissions?.query({ name: 'geolocation' as PermissionName }).then(p => setGps(p.state === 'granted' ? 'ok' : p.state === 'denied' ? 'denied' : 'unknown')).catch(() => {});
  }, [uid]);
  useEffect(() => () => { void lock.current?.release(); }, []);

  const testSound = () => { jobChime(); navigator.vibrate?.([300, 120, 300]); setSound(true); try { localStorage.setItem('bixgo_sound_ok', '1'); } catch { /* ignore */ } toast.success('Order alert played — keep your volume up'); };
  const askGps = () => navigator.geolocation?.getCurrentPosition(() => { setGps('ok'); toast.success('GPS is on'); }, () => { setGps('denied'); toast.error('Allow location in your browser settings'); });
  const toggleWake = async () => {
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    if (wake) { await lock.current?.release(); lock.current = null; setWake(false); return; }
    if (!nav.wakeLock) { toast.error('This browser cannot keep the screen on'); return; }
    try { lock.current = await nav.wakeLock.request('screen'); setWake(true); toast.success('Screen will stay on while BIXGO is open'); } catch { toast.error('Could not keep the screen on'); }
  };

  const gasOk = bix !== null && bix >= MIN_GAS_BIX;
  const checks: { ok: boolean; label: string; hint: string; action?: React.ReactNode; icon: typeof Fuel }[] = [
    { ok: true, icon: ShieldCheck, label: 'License approved', hint: `${lic.vehicle_model} · ${lic.plate}` },
    { ok: gasOk || lic.accept_cash === false, icon: Fuel, label: `BIX gas balance: ${bix === null ? '…' : bix.toFixed(2)} BIX`, hint: gasOk ? 'Enough for cash-order fees' : `Keep at least ${MIN_GAS_BIX} BIX to take cash orders`, action: !gasOk && <Link to="/wallet" className="rounded-full bg-primary px-3 py-1 text-[10px] font-bold text-primary-foreground">Top up</Link> },
    { ok: sound, icon: Bell, label: 'Order alert sound', hint: 'Test the radar chime at full volume', action: <button onClick={testSound} className="rounded-full border border-primary px-3 py-1 text-[10px] font-bold text-primary">Test</button> },
    { ok: gps === 'ok', icon: MapPin, label: 'Location (GPS)', hint: gps === 'denied' ? 'Blocked — enable in browser settings' : 'Needed for pickup navigation', action: gps !== 'ok' && <button onClick={askGps} className="rounded-full border border-primary px-3 py-1 text-[10px] font-bold text-primary">Allow</button> },
  ];
  const ready = checks.filter(c => c.ok).length;

  return <div className="space-y-3">
    {/* Digital partner ID */}
    <div className="relative overflow-hidden rounded-2xl border border-primary/50 bg-gradient-to-br from-card via-background to-card p-4 shadow-[0_0_28px_-14px_var(--primary)]">
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/15 blur-2xl"/>
      <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.25em] text-primary"><span>BIXGO · Official Partner</span><BadgeCheck className="h-4 w-4"/></div>
      <b className="mt-2 block text-lg font-black">{lic.full_name || 'BIXGO Driver'}</b>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] tabular-nums">
        <span className="text-muted-foreground">Partner ID</span><b className="text-right">{code || uid.slice(0, 8).toUpperCase()}</b>
        <span className="text-muted-foreground">Plate</span><b className="text-right">{lic.plate}</b>
        <span className="text-muted-foreground">Vehicle</span><b className="truncate text-right">{lic.vehicle_model || lic.vehicle_type}</b>
        <span className="text-muted-foreground">City</span><b className="text-right capitalize">{lic.city || 'All cities'}</b>
        <span className="text-muted-foreground">Rating</span><b className="flex items-center justify-end gap-1"><Star className="h-3 w-3 fill-primary text-primary"/>{rating.n ? `${Number(rating.avg).toFixed(2)} (${rating.n})` : 'New'}</b>
      </div>
      <p className="mt-2 text-[9px] text-muted-foreground">Show this card to passengers to confirm you are a verified BIXLINK partner.</p>
    </div>

    {/* Pre-flight checklist */}
    <div className="rounded-2xl border border-border p-3">
      <p className="flex items-center justify-between text-xs font-black"><span>Ready-to-drive checklist</span><span className={ready === checks.length ? 'text-primary' : 'text-muted-foreground'}>{ready}/{checks.length}</span></p>
      <ul className="mt-2 space-y-2">{checks.map(c => <li key={c.label} className="flex items-center gap-2">
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${c.ok ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}><c.icon className="h-3.5 w-3.5"/></span>
        <div className="min-w-0 flex-1"><b className="block text-[11px]">{c.label}</b><span className="block text-[10px] text-muted-foreground">{c.hint}</span></div>
        {c.action}
      </li>)}</ul>
      <button onClick={() => void toggleWake()} className={`mt-3 flex w-full items-center justify-center gap-1 rounded-full border py-2 text-[11px] font-bold ${wake ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground'}`}><MonitorSmartphone className="h-3.5 w-3.5"/>{wake ? 'Screen stays on' : 'Keep screen on while driving'}</button>
    </div>

    {/* SOS & money shortcuts */}
    <div className="grid grid-cols-3 gap-2 text-[10px] font-bold">
      <a href="tel:112" className="flex flex-col items-center gap-1 rounded-2xl border border-destructive/50 bg-destructive/10 py-2.5 text-destructive"><LifeBuoy className="h-4 w-4"/>SOS 112</a>
      <Link to="/call" className="flex flex-col items-center gap-1 rounded-2xl border border-primary/40 py-2.5 text-primary"><Phone className="h-4 w-4"/>BIX CALL</Link>
      <Link to="/wallet" className="flex flex-col items-center gap-1 rounded-2xl border border-primary/40 py-2.5 text-primary"><Wallet className="h-4 w-4"/>Wallet</Link>
    </div>
  </div>;
}
