import { useEffect, useState } from 'react';
import { Landmark, Loader2, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { signPhotos, uploadMerchantPhoto } from '@/lib/bixgo-merchant';
import { BANKS } from '@/lib/bixgo-pay';

type Lic = { accept_qris?: boolean; accept_bank?: boolean; qris_path?: string | null; bank_name?: string; bank_account?: string; bank_holder?: string };

/** Driver's own QR and bank account for direct passenger payments. Fee is still taken as BIX gas on accept. */
export function BixgoDriverPay({ uid, lic, onSaved }: { uid: string; lic: Lic; onSaved: () => void }) {
  const [v, setV] = useState({ qris: lic.accept_qris ?? false, bank: lic.accept_bank ?? false, path: lic.qris_path ?? '', name: lic.bank_name ?? '', acc: lic.bank_account ?? '', holder: lic.bank_holder ?? '' });
  const [img, setImg] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (v.path) void signPhotos([v.path]).then(m => setImg(m[v.path] ?? '')); }, [v.path]);
  const upload = async (f?: File) => { if (!f) return; setBusy(true); try { const p = await uploadMerchantPhoto(uid, f); setV(s => ({ ...s, path: p, qris: true })); } catch (e) { toast.error((e as Error).message); } setBusy(false); };
  const save = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('bixgo_driver_set_pay', { p_qris: v.qris, p_bank: v.bank, p_qris_path: v.path, p_bank_name: v.name, p_bank_account: v.acc, p_bank_holder: v.holder });
    setBusy(false);
    if (error) toast.error(error.message); else { toast.success('Payment settings saved'); onSaved(); }
  };
  const Chip = ({ k, label }: { k: 'qris' | 'bank'; label: string }) =>
    <button onClick={() => setV({ ...v, [k]: !v[k] })} className={`flex-1 rounded-xl border py-2 font-bold ${v[k] ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground'}`}>{v[k] ? '✓ ' : ''}{label}</button>;
  return <div className="space-y-2 rounded-2xl border border-primary/30 p-3 text-[11px]">
    <h4 className="flex items-center gap-1 text-xs font-black"><QrCode className="h-3.5 w-3.5 text-primary"/>My QR &amp; bank transfer</h4>
    <div className="flex gap-2"><Chip k="qris" label="QR orders"/><Chip k="bank" label="Transfer orders"/></div>
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border p-2">
      {img ? <img src={img} alt="My payment QR" className="h-20 w-20 rounded-lg bg-background object-contain"/> : <span className="grid h-20 w-20 place-items-center rounded-lg bg-muted"><QrCode className="h-8 w-8 text-muted-foreground"/></span>}
      <span className="text-muted-foreground">{v.path ? 'Tap to replace your QRIS / e-wallet QR' : 'Upload your QRIS / e-wallet QR (max 5 MB)'}</span>
      <input type="file" accept="image/*" className="hidden" onChange={e => void upload(e.target.files?.[0])}/>
    </label>
    <div className="flex items-center gap-1 pt-1 font-bold"><Landmark className="h-3.5 w-3.5 text-primary"/>Bank account</div>
    <select value={v.name} onChange={e => setV({ ...v, name: e.target.value })} className="form-input text-xs" aria-label="Bank"><option value="">Choose bank / e-wallet</option>{BANKS.map(b => <option key={b}>{b}</option>)}</select>
    <input value={v.acc} inputMode="numeric" maxLength={30} onChange={e => setV({ ...v, acc: e.target.value.replace(/[^0-9 -]/g, '') })} placeholder="Account number" className="form-input text-xs"/>
    <input value={v.holder} maxLength={80} onChange={e => setV({ ...v, holder: e.target.value })} placeholder="Account holder name" className="form-input text-xs"/>
    <p className="text-[10px] text-muted-foreground">Passengers pay you directly. The company fee is taken from your BIX balance when you accept, and you must confirm the money arrived before finishing the trip.</p>
    <button disabled={busy} onClick={() => void save()} className="w-full rounded-full bg-primary py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">{busy ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin"/> : 'Save payment settings'}</button>
  </div>;
}

type Payee = { method: 'qris' | 'bank'; fare_idr: number; qris_path?: string | null; bank_name?: string; bank_account?: string; bank_holder?: string; paid_at?: string | null; pay_ref?: string; confirmed_at?: string | null };

/** Shown on an active QR/transfer trip: rider sees where to pay, driver confirms receipt. */
export function BixgoTripPayee({ id, role, onChange }: { id: string; role: 'rider' | 'driver'; onChange?: () => void }) {
  const [p, setP] = useState<Payee | null>(null);
  const [img, setImg] = useState('');
  const [ref, setRef] = useState('');
  const [busy, setBusy] = useState(false);
  const load = async () => { const { data } = await supabase.rpc('bixgo_trip_payee', { p_id: id }); const v = data as Payee | null; setP(v); if (v?.qris_path) void signPhotos([v.qris_path]).then(m => setImg(m[v.qris_path!] ?? '')); };
  useEffect(() => { void load(); const i = setInterval(() => void load(), 10000); return () => clearInterval(i); }, [id]);
  if (!p) return null;
  const rp = `Rp${Math.round(Number(p.fare_idr)).toLocaleString('id-ID')}`;
  const run = async (fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string) => { setBusy(true); const { error } = await fn(); setBusy(false); if (error) toast.error(error.message); else { toast.success(ok); void load(); onChange?.(); } };
  return <div className="mt-3 space-y-2 rounded-2xl border border-primary/30 p-3 text-xs">
    <b className="block text-primary">{p.method === 'qris' ? 'Pay by driver QR' : 'Bank transfer to driver'} · {rp}</b>
    {role === 'rider' && p.method === 'qris' && (img ? <img src={img} alt="Driver payment QR" className="mx-auto h-48 w-48 rounded-lg bg-background object-contain"/> : <p className="text-muted-foreground">Driver QR not available — ask the driver to show it.</p>)}
    {role === 'rider' && p.method === 'bank' && <div className="flex items-center justify-between gap-2 rounded-xl bg-muted/40 p-2"><div><p className="font-bold">{p.bank_name}</p><p className="font-mono text-sm tabular-nums">{p.bank_account}</p><p className="text-muted-foreground">a.n. {p.bank_holder}</p></div><button onClick={() => { void navigator.clipboard?.writeText(p.bank_account ?? ''); toast.success('Account number copied'); }} className="rounded-full border border-primary/50 px-3 py-1 font-bold text-primary">Copy</button></div>}
    <p className="text-muted-foreground">{p.confirmed_at ? '✓ Driver confirmed payment received' : p.paid_at ? `Passenger marked as paid${p.pay_ref ? ` · ref ${p.pay_ref}` : ''} · waiting for driver check` : 'Not paid yet'}</p>
    {role === 'rider' && !p.paid_at && <div className="flex gap-2"><input value={ref} maxLength={60} onChange={e => setRef(e.target.value)} placeholder="Reference / last 4 digits (optional)" className="form-input flex-1 text-xs"/><button disabled={busy} onClick={() => void run(() => supabase.rpc('bixgo_trip_mark_paid', { p_id: id, p_ref: ref }), 'Payment confirmation sent')} className="rounded-full bg-primary px-3 font-bold text-primary-foreground">I've paid</button></div>}
    {role === 'driver' && !p.confirmed_at && <button disabled={busy} onClick={() => void run(() => supabase.rpc('bixgo_trip_confirm_paid', { p_id: id }), 'Payment confirmed')} className="w-full rounded-full bg-primary py-2 font-bold text-primary-foreground">Money received — confirm</button>}
  </div>;
}
