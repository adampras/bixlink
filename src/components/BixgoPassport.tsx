import { useEffect, useState } from 'react';
import { BadgeCheck, Bike, CarFront, Crown, Loader2, Power, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { formatMoney, GLOBAL_CITIES, type GlobalCurrency } from '@/lib/bixgo-global';
import { DRIVER_SHARE_PCT, driverEarning, nextTier, tierFor } from '@/lib/bixgo-tier';
import { BixgoDriverJobs } from '@/components/BixgoDriverJobs';
import { BixgoDriverRates } from '@/components/BixgoDriverRates';
import { BixgoDriverReady } from '@/components/BixgoDriverReady';

type License = { status: string; online: boolean; vehicle_type: string; vehicle_model: string; plate: string; city: string; operator_note: string; mode: string; rate_adj_pct?: number; accept_cash?: boolean; accept_bix?: boolean };
const VEHICLES = [['moto', 'BIX Moto'], ['urban', 'BIX Urban'], ['executive', 'BIX Executive'], ['black', 'BIX Black']] as const;

/** Member BIXGO Passport: tier from active staking, own trip stats, and the Driver-Partner license / Driver Mode. */
export function BixgoPassport({ cur, usdtIdr, city }: { cur: GlobalCurrency; usdtIdr: number; city: string }) {
  const [uid, setUid] = useState<string | null>(null);
  const [stakeUsd, setStakeUsd] = useState(0);
  const [trips, setTrips] = useState({ n: 0, km: 0 });
  const [lic, setLic] = useState<License | null>(null);
  const [earn, setEarn] = useState({ n: 0, fare: 0 });
  const [form, setForm] = useState({ full_name: '', phone: '', vehicle_type: 'moto', vehicle_model: '', plate: '', mode: 'self' });
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState<{ avg: number | null; n: number }>({ avg: null, n: 0 });
  const money = (n: number) => formatMoney(n, cur, usdtIdr);

  const load = async () => {
    const { data: u } = await supabase.auth.getUser(); const id = u.user?.id ?? null; setUid(id); if (!id) return;
    const [s, b, l, d] = await Promise.all([
      supabase.from('stakes').select('amount_usd').eq('user_id', id).eq('status', 'active'),
      supabase.from('bixgo_bookings').select('km,status').eq('user_id', id),
      supabase.from('bixgo_driver_licenses').select('*').eq('user_id', id).maybeSingle(),
      supabase.from('bixgo_bookings').select('total_idr').eq('driver_user_id', id).eq('status', 'completed'),
    ]);
    setStakeUsd((s.data ?? []).reduce((a, r) => a + Number(r.amount_usd), 0));
    const done = (b.data ?? []).filter(r => r.status === 'completed');
    setTrips({ n: done.length, km: done.reduce((a, r) => a + Number(r.km), 0) });
    setLic((l.data as License | null) ?? null);
    setEarn({ n: d.data?.length ?? 0, fare: (d.data ?? []).reduce((a, r) => a + Number(r.total_idr), 0) });
  };
  useEffect(() => { void load(); }, []);

  const tier = tierFor(stakeUsd); const next = nextTier(stakeUsd);
  const apply = async () => {
    if (!form.full_name.trim() || !form.phone.trim() || !form.plate.trim()) { toast.error('Fill name, phone and plate'); return; }
    setBusy(true);
    const { error } = await supabase.from('bixgo_driver_licenses').insert({ ...form, city, full_name: form.full_name.trim().slice(0, 80), phone: form.phone.trim().slice(0, 30), plate: form.plate.trim().slice(0, 20), vehicle_model: form.vehicle_model.trim().slice(0, 60) });
    setBusy(false); if (error) toast.error(error.message); else { toast.success('License application sent for review'); void load(); }
  };
  const [redo, setRedo] = useState(false);
  const startRedo = () => { if (!lic) return; const l = lic as License & { full_name?: string; phone?: string }; setForm({ full_name: l.full_name ?? '', phone: l.phone ?? '', vehicle_type: l.vehicle_type, vehicle_model: l.vehicle_model, plate: l.plate, mode: l.mode || 'self' }); setRedo(true); };
  const reapply = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('bixgo_driver_reapply', { p_full_name: form.full_name, p_phone: form.phone, p_vehicle_type: form.vehicle_type, p_vehicle_model: form.vehicle_model, p_plate: form.plate, p_mode: form.mode, p_city: city });
    setBusy(false); if (error) toast.error(error.message); else { toast.success('Application resubmitted for review'); setRedo(false); void load(); }
  };
  const toggle = async () => { if (!lic) return; setBusy(true); const { error } = await supabase.rpc('bixgo_driver_set_online', { p_online: !lic.online }); setBusy(false); if (error) toast.error(error.message); else void load(); };

  if (!uid) return <section className="mx-4 mt-3 rounded-3xl border border-primary/30 bg-card p-4 text-xs text-muted-foreground">Sign in to open your BIXGO Passport and Driver Mode.</section>;

  return <section className="mx-4 mt-3 space-y-3">
    <div className="rounded-3xl border border-primary/40 bg-card p-4 shadow-[0_0_24px_-12px_var(--primary)]">
      <div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">BIXGO Passport</span><span className="flex items-center gap-1 rounded-full border border-primary/50 px-2 py-0.5 text-[11px] font-bold text-primary"><Crown className="h-3.5 w-3.5"/>{tier.name}</span></div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center tabular-nums">
        <div><b className="block text-lg">{trips.n}</b><span className="text-[10px] text-muted-foreground">Trips</span></div>
        <div><b className="block text-lg">{trips.km.toFixed(1)}</b><span className="text-[10px] text-muted-foreground">Km travelled</span></div>
        <div><b className="block text-lg">{tier.rideDiscountPct}%</b><span className="text-[10px] text-muted-foreground">Tier discount</span></div>
      </div>
      <ul className="mt-3 space-y-0.5 text-[11px]">{tier.perks.map(p => <li key={p} className="flex items-center gap-1"><BadgeCheck className="h-3.5 w-3.5 text-primary"/>{p}</li>)}</ul>
      {next && <p className="mt-2 text-[11px] text-muted-foreground">Stake ${(next.minUsd - stakeUsd).toFixed(0)} more to reach {next.name}.</p>}
    </div>

    <div className="rounded-3xl border border-border bg-card p-4 text-xs">
      <h3 className="flex items-center gap-2 text-sm font-black"><ShieldCheck className="h-4 w-4 text-primary"/>Driver-Partner License</h3>
      {!lic && !tier.driverLicense && <p className="mt-2 text-muted-foreground">Available from Pro Navigator (active staking of $100 or more). Licensed drivers keep {DRIVER_SHARE_PCT}% of each completed fare.</p>}
      {((!lic && tier.driverLicense) || redo) && <div className="mt-2 space-y-2">
        <p className="text-muted-foreground">Drive yourself or register a fleet driver. You keep {DRIVER_SHARE_PCT}% of completed fares; fares are held from the passenger's USDT wallet and settled to you on completion.</p>
        <div className="grid grid-cols-2 gap-1">{VEHICLES.map(([k, l]) => <button key={k} onClick={() => setForm({ ...form, vehicle_type: k })} className={`flex items-center justify-center gap-1 rounded-xl border py-2 ${form.vehicle_type === k ? 'border-primary bg-primary/15 font-bold' : 'border-border'}`}>{k === 'moto' ? <Bike className="h-4 w-4"/> : <CarFront className="h-4 w-4"/>}{l}</button>)}</div>
        <div className="grid grid-cols-2 gap-1">{([['self', 'I drive'], ['fleet', 'Fleet driver']] as const).map(([k, l]) => <button key={k} onClick={() => setForm({ ...form, mode: k })} className={`rounded-xl border py-2 ${form.mode === k ? 'border-primary bg-primary/15 font-bold' : 'border-border'}`}>{l}</button>)}</div>
        {(['full_name', 'phone', 'vehicle_model', 'plate'] as const).map(k => <input key={k} className="form-input" maxLength={80} placeholder={{ full_name: 'Driver full name', phone: 'Phone / WhatsApp', vehicle_model: 'Vehicle model (e.g. Honda Vario)', plate: 'Plate number' }[k]} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })}/>)}
        <button disabled={busy} onClick={() => void (redo ? reapply() : apply())} className="w-full rounded-full bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50">{busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin"/> : redo ? 'Resubmit application' : `Apply in ${GLOBAL_CITIES.find(c => c.id === city)?.city ?? 'my city'}`}</button>
        {redo && <button onClick={() => setRedo(false)} className="w-full rounded-full border border-border py-2 text-muted-foreground">Cancel</button>}
      </div>}
      {lic && !redo && <div className="mt-2 space-y-2">
        <p><b>{VEHICLES.find(v => v[0] === lic.vehicle_type)?.[1]}</b> · {lic.vehicle_model} · {lic.plate} · <span className="font-bold uppercase text-primary">{lic.status}</span></p>
        {lic.status === 'rejected' && <div className="rounded-2xl border border-destructive/50 bg-destructive/10 p-3">
          <b className="block text-destructive">Application not approved yet</b>
          <p className="mt-1">{lic.operator_note ? `Reason: ${lic.operator_note}` : 'The operator did not add a reason. Please check your details and try again.'}</p>
          <button onClick={startRedo} className="mt-2 w-full rounded-full bg-primary py-2.5 font-bold text-primary-foreground">Fix &amp; resubmit</button>
        </div>}
        {lic.status === 'suspended' && <p className="rounded-2xl border border-destructive/50 bg-destructive/10 p-3">Your driver license is suspended{lic.operator_note ? `: ${lic.operator_note}` : '.'} Contact the operator to reactivate.</p>}
        {lic.operator_note && lic.status !== 'rejected' && lic.status !== 'suspended' && <p className="text-muted-foreground">Operator: {lic.operator_note}</p>}
        {lic.status === 'pending' && <p className="text-muted-foreground">Your application is waiting for operator review.</p>}
        {lic.status === 'approved' && <>
          <BixgoDriverReady lic={lic} uid={uid} rating={rating}/>
          <button disabled={busy} onClick={() => void toggle()} className={`flex w-full items-center justify-center gap-2 rounded-full py-3 font-bold ${lic.online ? 'bg-primary text-primary-foreground' : 'border border-primary text-primary'}`}><Power className="h-4 w-4"/>{lic.online ? 'Driver Mode ON — receiving orders' : 'Go online'}</button>
          <BixgoDriverRates key={`${lic.rate_adj_pct}-${lic.accept_cash}-${lic.accept_bix}`} adj={Number(lic.rate_adj_pct ?? 0)} cash={lic.accept_cash ?? true} bix={lic.accept_bix ?? true} onSaved={() => void load()}/>
          <BixgoDriverJobs online={lic.online} adj={Number(lic.rate_adj_pct ?? 0)} onRating={setRating}/>
        </>}
      </div>}
    </div>
  </section>;
}
