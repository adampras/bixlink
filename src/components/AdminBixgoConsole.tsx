import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { AdminFold } from '@/components/AdminNavigation';
import { BIXGO_SERVICES, DEFAULT_CITY_PRICING, type BixgoSettings } from '@/lib/bixgo';
import { GLOBAL_CITIES, formatMoney } from '@/lib/bixgo-global';
import { TRAVEL_CATALOG } from '@/lib/bixgo-global';
import { BixgoCancelDialog } from '@/components/BixgoCancelDialog';
import { canCancelTrip } from '@/lib/bixgo-trip';

type Booking = { id: string; user_id: string; city: string; service: string; vehicle: string; pickup: string; dropoff: string; km: number; total_idr: number; pay_method: string; status: string; driver_name: string; driver_phone: string; plate: string; operator_note: string; created_at: string; driver_user_id?: string | null; cancel_reason?: string | null; cancel_note?: string | null };
type License = { id: string; user_id: string; full_name: string; phone: string; city: string; vehicle_type: string; vehicle_model: string; plate: string; mode: string; status: string; online: boolean; operator_note: string; created_at: string };
const STATUS = ['pending', 'assigned', 'in_transit', 'completed', 'cancelled'] as const;
const LABEL: Record<string, string> = { pending: 'Waiting', assigned: 'Driver assigned', in_transit: 'In transit', completed: 'Completed', cancelled: 'Cancelled' };

/** Owner console: dispatch member booking requests, manage per-city pricing, read per-city history. Bookings are requests only — no payment is taken here. */
export function AdminBixgoConsole({ s, setS, onSave, busy }: { s: BixgoSettings; setS: (v: BixgoSettings) => void; onSave: (v: BixgoSettings) => void; busy: boolean }) {
  const [tab, setTab] = useState<'dispatch' | 'drivers' | 'pricing' | 'history'>('dispatch');
  const [rows, setRows] = useState<Booking[]>([]);
  const [city, setCity] = useState('all');
  const [status, setStatus] = useState('all');
  const [edit, setEdit] = useState<Record<string, Partial<Booking>>>({});
  const [msg, setMsg] = useState('');
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [lics, setLics] = useState<License[]>([]);
  const loadLic = async () => { const { data } = await supabase.from('bixgo_driver_licenses').select('*').order('created_at', { ascending: false }).limit(300); setLics((data ?? []) as License[]); };
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [lf, setLf] = useState('pending');
  const [lq, setLq] = useState('');
  const review = async (l: License, st: string) => { const note = (notes[l.id] ?? '').trim().slice(0, 240); if ((st === 'rejected' || st === 'suspended') && !note) { setMsg('Write a reason so the driver knows what to fix.'); return; } const { error } = await supabase.from('bixgo_driver_licenses').update({ status: st, online: st === 'approved' ? l.online : false, operator_note: st === 'approved' ? '' : note, updated_at: new Date().toISOString() }).eq('id', l.id); setMsg(error ? error.message : `${l.full_name} → ${st}`); void loadLic(); };
  const load = async () => { const { data, error } = await supabase.from('bixgo_bookings').select('*').order('created_at', { ascending: false }).limit(300); if (error) setMsg(error.message); else setRows((data ?? []) as Booking[]); };
  useEffect(() => { void loadLic(); void load(); const t = setInterval(() => void load(), 20_000); return () => clearInterval(t); }, []);
  const money = (n: number) => formatMoney(n, 'USD', s.usdtIdr);
  const update = async (b: Booking, patch: Partial<Booking>) => {
    const { error } = await supabase.from('bixgo_bookings').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', b.id);
    setMsg(error ? error.message : `Booking ${b.id.slice(0, 8)} → ${LABEL[patch.status ?? b.status]}`); if (!error) void load();
  };
  const filtered = rows.filter(r => (city === 'all' || r.city === city) && (status === 'all' || r.status === status));
  const live = rows.filter(r => r.status === 'pending' || r.status === 'assigned' || r.status === 'in_transit');
  const summary = useMemo(() => GLOBAL_CITIES.map(c => { const done = rows.filter(r => r.city === c.id && r.status === 'completed'); const gross = done.reduce((a, r) => a + Number(r.total_idr), 0); const f = s.franchises?.find(x => x.id === c.id); const comm = gross * s.commissionPct / 100; return { c, n: rows.filter(r => r.city === c.id).length, done: done.length, gross, comm, fr: comm * (f?.franchisePct ?? 0) / 100 }; }), [rows, s]);
  const [q, setQ] = useState('');
  const hit = (c: (typeof GLOBAL_CITIES)[number]) => { const t = q.trim().toLowerCase(); return !t || `${c.city} ${c.country} ${(c as { province?: string }).province ?? ''}`.toLowerCase().includes(t); };
  const match = q.trim() ? GLOBAL_CITIES.filter(hit).slice(0, 20) : [];
  const pricing = s.cityPricing ?? DEFAULT_CITY_PRICING;
  const setP = (id: string, k: 'mult' | 'minIdr', v: number) => setS({ ...s, cityPricing: { ...pricing, [id]: { ...(pricing[id] ?? { mult: 1, minIdr: 0 }), [k]: v } } });

  return <AdminFold title="BIXGO Operator Console" badge={`${live.length} live`}>
    {cancelId && <BixgoCancelDialog id={cancelId} role="rider" open onClose={() => setCancelId(null)} onDone={() => void load()}/>}
    <div className="space-y-3 text-xs">
      <div className="grid grid-cols-4 gap-1">{([['dispatch', 'Dispatch'], ['drivers', `Drivers (${lics.filter(l => l.status === 'pending').length})`], ['pricing', 'City Pricing'], ['history', 'City History']] as const).map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-full border px-2 py-2 font-bold ${tab === k ? 'border-primary bg-primary/15 text-primary' : 'border-border'}`}>{l}</button>)}</div>
      {msg && <p className="rounded-lg border border-border px-2 py-1 text-muted-foreground">{msg}</p>}

      {tab === 'dispatch' && <div className="space-y-2">
        {!live.length && <p className="rounded-xl border border-border p-3 text-center text-muted-foreground">No open booking requests.</p>}
        {live.map(b => { const e = { ...b, ...edit[b.id] }; return <div key={b.id} className="rounded-xl border border-primary/30 p-2">
          <div className="flex justify-between"><b>{GLOBAL_CITIES.find(c => c.id === b.city)?.city ?? b.city} · {b.vehicle || b.service}</b><span className="rounded-full border border-primary/40 px-2 text-primary">{LABEL[b.status]}</span></div>
          <p className="text-muted-foreground">{b.pickup} → {b.dropoff} · {Number(b.km).toFixed(1)} km · {money(Number(b.total_idr))} · {b.pay_method}</p>
          <p className="text-muted-foreground">{new Date(b.created_at).toLocaleString()} · #{b.id.slice(0, 8)}</p>
          {b.status === 'pending' && <select className="form-input mt-1" value="" onChange={ev => { const l = lics.find(x => x.user_id === ev.target.value); if (l) setEdit({ ...edit, [b.id]: { ...edit[b.id], driver_name: l.full_name, driver_phone: l.phone, plate: l.plate, driver_user_id: ev.target.value } as Partial<Booking> }); }}><option value="">Pick licensed driver…</option>{lics.filter(l => l.status === 'approved').sort((a, z) => Number(z.online) - Number(a.online)).map(l => <option key={l.id} value={l.user_id}>{l.online ? '● ' : '○ '}{l.full_name} · {l.vehicle_type} · {l.city}</option>)}</select>}
          <div className="mt-1 grid grid-cols-3 gap-1">{(['driver_name', 'driver_phone', 'plate'] as const).map(k => <input key={k} className="form-input" placeholder={k === 'driver_name' ? 'Driver' : k === 'driver_phone' ? 'Phone' : 'Plate'} value={e[k]} maxLength={40} onChange={ev => setEdit({ ...edit, [b.id]: { ...edit[b.id], [k]: ev.target.value } })}/>)}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            {b.status === 'pending' && <Button size="sm" disabled={!e.driver_name.trim()} onClick={() => update(b, { status: 'assigned', driver_name: e.driver_name.trim(), driver_phone: e.driver_phone.trim(), plate: e.plate.trim(), ...(e.driver_user_id ? { driver_user_id: e.driver_user_id } : {}) })}>Assign driver</Button>}
            {b.status === 'assigned' && <Button size="sm" onClick={() => update(b, { status: 'in_transit' })}>Start trip</Button>}
            {b.status === 'in_transit' && <Button size="sm" onClick={() => update(b, { status: 'completed' })}>Complete</Button>}
            {e.driver_phone?.trim() && <Button size="sm" variant="outline" asChild><a target="_blank" rel="noopener noreferrer" href={`https://wa.me/${e.driver_phone.replace(/\D/g, '').replace(/^0/, '62')}?text=${encodeURIComponent(`BIXGO dispatch #${b.id.slice(0, 8)}\nCity: ${GLOBAL_CITIES.find(c => c.id === b.city)?.city ?? b.city}\nService: ${b.vehicle || b.service}\nPickup: ${b.pickup}\nDrop-off: ${b.dropoff}\nDistance: ${Number(b.km).toFixed(1)} km\nFare: ${money(Number(b.total_idr))} (${b.pay_method})\nPlease confirm / Mohon konfirmasi.`)}`}>WhatsApp driver</a></Button>}
            {canCancelTrip(b.status) && <Button size="sm" variant="outline" onClick={() => setCancelId(b.id)}>Cancel</Button>}
          </div></div>; })}
      </div>}

      {tab === 'drivers' && <div className="space-y-2">
        <p className="text-muted-foreground">Driver-Partner license applications (Pro Navigator and above). Approval lets the member go online and be assigned bookings. No license fee is collected here.</p>
        {!lics.length && <p className="rounded-xl border border-border p-3 text-center text-muted-foreground">No applications yet.</p>}
        <div className="grid grid-cols-4 gap-1">{['pending', 'approved', 'rejected', 'suspended'].map(k => <button key={k} onClick={() => setLf(k)} className={`rounded-full border px-1 py-1 capitalize ${lf === k ? 'border-primary bg-primary/15 font-bold text-primary' : 'border-border'}`}>{k} ({lics.filter(l => l.status === k).length})</button>)}</div>
        <input className="form-input" placeholder="Search name, plate or phone" value={lq} onChange={e => setLq(e.target.value)}/>
        {lics.filter(l => l.status === lf && (!lq.trim() || `${l.full_name} ${l.plate} ${l.phone}`.toLowerCase().includes(lq.trim().toLowerCase()))).map(l => <div key={l.id} className="rounded-xl border border-border p-2">
          <div className="flex justify-between"><b>{l.full_name} · {l.vehicle_type}</b><span className="font-bold uppercase text-primary">{l.status}{l.online ? ' · online' : ''}</span></div>
          <p className="text-muted-foreground">{l.vehicle_model} · {l.plate} · {l.phone} · {GLOBAL_CITIES.find(c => c.id === l.city)?.city ?? l.city} · {l.mode === 'fleet' ? 'Fleet driver' : 'Self-driving'}</p>
          {l.operator_note && <p className="text-muted-foreground">Note: {l.operator_note}</p>}
          {l.status !== 'rejected' && <input className="form-input mt-1" maxLength={240} placeholder={l.status === 'approved' ? 'Reason for suspension' : 'Reason if rejecting (shown to driver)'} value={notes[l.id] ?? ''} onChange={e => setNotes({ ...notes, [l.id]: e.target.value })}/>}
          <div className="mt-1 flex flex-wrap gap-1">{l.status !== 'approved' && <Button size="sm" onClick={() => review(l, 'approved')}>Approve</Button>}{l.status === 'pending' && <Button size="sm" variant="outline" onClick={() => review(l, 'rejected')}>Reject</Button>}{l.status === 'approved' && <Button size="sm" variant="outline" onClick={() => review(l, 'suspended')}>Suspend</Button>}</div>
        </div>)}
      </div>}

      {tab === 'pricing' && <div className="space-y-2">
        <p className="text-muted-foreground">Base fare × city multiplier, never below the city minimum. Base/per-km fares per service are set below in BIXGO Super-App.</p>
        <input className="form-input" placeholder={`Cari kota / provinsi (${GLOBAL_CITIES.length})`} value={q} onChange={e => setQ(e.target.value)}/>
        {!match.length && <p className="text-center text-muted-foreground">Tidak ditemukan.</p>}
        {match.map(c => <div key={c.id} className="grid grid-cols-[1fr_80px_110px] items-end gap-2 rounded-xl border border-border p-2">
          <b>{c.city}<span className="block font-normal text-muted-foreground">{c.country}</span></b>
          <label>× Mult<input className="form-input mt-1" type="number" step="0.1" value={pricing[c.id]?.mult ?? 1} onChange={e => setP(c.id, 'mult', Number(e.target.value))}/></label>
          <label>Min (Rp)<input className="form-input mt-1" type="number" value={pricing[c.id]?.minIdr ?? 0} onChange={e => setP(c.id, 'minIdr', Number(e.target.value))}/></label>
        </div>)}
        <p className="text-muted-foreground">Travel catalog (preview): {Object.values(TRAVEL_CATALOG).flat().length} items — eSIM, hotels, lounges.</p>
        <Button className="w-full" disabled={busy} onClick={() => onSave(s)}>Save city pricing</Button>
      </div>}

      {tab === 'history' && <div className="space-y-2">
        <input className="form-input" placeholder="Cari kota / provinsi" value={q} onChange={e => setQ(e.target.value)}/>
        <div className="grid grid-cols-2 gap-1">{summary.filter(x => hit(x.c) && (q.trim() || x.n > 0)).slice(0, 12).map(x => <div key={x.c.id} className="rounded-xl border border-border p-2"><b>{x.c.city}</b><p className="text-muted-foreground">{x.n} bookings · {x.done} done</p><p>Gross {money(x.gross)}</p><p className="text-muted-foreground">Commission {money(x.comm)} · Franchise {money(x.fr)}</p></div>)}</div>
        <div className="flex gap-1"><select className="form-input" value={city} onChange={e => setCity(e.target.value)}><option value="all">All cities</option>{GLOBAL_CITIES.map(c => <option key={c.id} value={c.id}>{c.city}</option>)}</select>
          <select className="form-input" value={status} onChange={e => setStatus(e.target.value)}><option value="all">All status</option>{STATUS.map(x => <option key={x} value={x}>{LABEL[x]}</option>)}</select></div>
        {filtered.slice(0, 80).map(b => <div key={b.id} className="flex justify-between gap-2 border-b border-border py-1"><span className="min-w-0">{new Date(b.created_at).toLocaleDateString()} · {b.city} · {b.vehicle || BIXGO_SERVICES.find(x => x.key === b.service)?.name} · {LABEL[b.status]}{b.cancel_reason && <span className="block break-words text-muted-foreground">{b.cancel_reason}{b.cancel_note ? ` · ${b.cancel_note}` : ''}</span>}</span><b className="shrink-0">{money(Number(b.total_idr))}</b></div>)}
        {!filtered.length && <p className="text-center text-muted-foreground">No bookings for this filter.</p>}
      </div>}
      <p className="text-[10px] text-muted-foreground">Bookings are member requests. No payment is captured; settle fares with the driver outside the app until a payment rule exists.</p>
    </div>
  </AdminFold>;
}
