import { useEffect, useState } from 'react';
import { BadgeCheck, Clock, Lock, ShieldAlert, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { usePublicConfig } from '@/lib/useMember';

type Kyc = { status: string; full_name: string; country: string; document_type: string; document_last4: string; id_path?: string | null; selfie_path?: string | null; review_note?: string | null };

/** Identity verification: name/country/doc last-4 + private ID & selfie photos; approval unlocks a display-only 50 BIX locked welcome reward. */
export function KycCard({ userId, compact = false }: { userId?: string | undefined; compact?: boolean }) {
  const { data: config } = usePublicConfig();
  const enabled = config?.readiness.kycEnabled === true;
  const [kyc, setKyc] = useState<Kyc | null>(null);
  const [reward, setReward] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: '', country: '', phone: '', document_type: 'passport', document_last4: '' });
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!userId || !enabled) return;
    supabase.from('kyc_submissions').select('status,full_name,country,document_type,document_last4,id_path,selfie_path,review_note').eq('user_id', userId).maybeSingle().then(({ data }) => setKyc(data));
    supabase.from('bix_kyc_rewards').select('amount').eq('user_id', userId).maybeSingle().then(({ data }) => setReward(data ? Number(data.amount) : null));
  }, [userId, enabled]);
  if (!userId) return null;
  if (!enabled) return compact ? null : <div className="kyc-card rounded-xl border border-border p-3 text-xs text-muted-foreground"><Lock size={14} className="mr-1 inline"/>Identity verification opens soon. Verified members receive a 50 BIX locked welcome reward.</div>;
  const up = async (f: File, kind: string) => {
    const ext = (f.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${userId}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('bix-kyc').upload(path, f, { upsert: true, contentType: f.type });
    if (error) throw error; return path;
  };
  const submit = async () => {
    setMsg('');
    if (form.full_name.trim().length < 3 || form.country.trim().length < 2 || !/^[A-Za-z0-9]{4}$/.test(form.document_last4)) { setMsg('Fill in full name, country and the last 4 characters of your document.'); return; }
    if (!idFile || !selfie) { setMsg('Upload a photo of your ID and a selfie holding your ID.'); return; }
    if (idFile.size > 8e6 || selfie.size > 8e6) { setMsg('Each photo must be under 8 MB.'); return; }
    setBusy(true);
    try {
      const [id_path, selfie_path] = await Promise.all([up(idFile, 'id'), up(selfie, 'selfie')]);
      const row = { user_id: userId, full_name: form.full_name.trim(), country: form.country.trim(), phone: form.phone.trim() || null, document_type: form.document_type, document_last4: form.document_last4, id_path, selfie_path, status: 'pending', updated_at: new Date().toISOString() };
      const { error } = await supabase.from('kyc_submissions').upsert(row);
      if (error) throw error;
      setKyc(row); setOpen(false);
    } catch { setMsg('Could not submit verification. Please try again.'); }
    setBusy(false);
  };
  const status = kyc?.status;
  const Icon = status === 'approved' ? BadgeCheck : status === 'pending' ? Clock : ShieldAlert;
  const tone = status === 'approved' ? 'text-chart-2' : status === 'pending' ? 'text-chart-3' : 'text-muted-foreground';
  const label = status === 'approved' ? 'Identity verified' : status === 'pending' ? 'Verification under review' : status === 'rejected' ? 'Verification rejected — please resubmit' : 'Identity not verified';
  return <div className={`kyc-card rounded-xl border border-border p-3 ${compact ? 'mt-3 text-xs' : 'text-sm'}`}>
    <div className="flex min-w-0 items-start gap-2"><Icon size={16} className={`mt-0.5 shrink-0 ${tone}`}/><div className="min-w-0 flex-1"><b className={tone}>{label}</b>
      {status === 'rejected' && kyc?.review_note && <p className="mt-1 text-xs text-destructive">{kyc.review_note}</p>}
      <p className="mt-1 text-xs text-muted-foreground">3 steps: personal data · ID photo · selfie with ID. Photos are stored in a private encrypted folder visible only to you and the review team.</p></div></div>
    {reward !== null && <div className="kyc-reward mt-3 flex items-center justify-between rounded-lg px-3 py-2"><span className="flex items-center gap-1.5 text-xs font-bold"><Lock size={13}/>Welcome reward · LOCKED</span><b className="numeric">+{reward.toFixed(2)} BIX</b></div>}
    {status !== 'approved' && reward === null && <p className="mt-2 text-[11px] text-primary">Verify now and receive 50 BIX locked welcome reward (not withdrawable or tradable until released).</p>}
    {status !== 'approved' && status !== 'pending' && !open && <Button type="button" size="sm" variant="outline" className="mt-3 w-full rounded-full" onClick={() => setOpen(true)}>Verify identity</Button>}
    {open && <div className="mt-3 grid gap-2">
      <input className="form-input" placeholder="Full legal name" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}/>
      <div className="grid grid-cols-2 gap-2"><input className="form-input min-w-0" placeholder="Country" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })}/><input className="form-input min-w-0" inputMode="tel" placeholder="WhatsApp (optional)" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}/></div>
      <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2"><select className="form-input min-w-0" value={form.document_type} onChange={e => setForm({ ...form, document_type: e.target.value })}><option value="passport">Passport</option><option value="national_id">National ID</option><option value="driver_license">Driver license</option></select><input className="form-input min-w-0" maxLength={4} placeholder="Last 4" value={form.document_last4} onChange={e => setForm({ ...form, document_last4: e.target.value.trim() })}/></div>
      <label className="kyc-drop"><Upload size={14}/><span>{idFile ? `✓ ${idFile.name}` : 'ID document photo'}</span><input type="file" accept="image/*" className="sr-only" onChange={e => setIdFile(e.target.files?.[0] ?? null)}/></label>
      <label className="kyc-drop"><Upload size={14}/><span>{selfie ? `✓ ${selfie.name}` : 'Selfie holding your ID'}</span><input type="file" accept="image/*" capture="user" className="sr-only" onChange={e => setSelfie(e.target.files?.[0] ?? null)}/></label>
      {msg && <p className="text-xs text-destructive">{msg}</p>}
      <div className="grid grid-cols-2 gap-2"><Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button type="button" size="sm" className="rounded-full" disabled={busy} onClick={submit}>{busy ? 'Uploading…' : 'Submit'}</Button></div>
    </div>}
  </div>;
}
