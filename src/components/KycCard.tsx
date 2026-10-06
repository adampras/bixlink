import { useEffect, useState } from 'react';
import { BadgeCheck, Clock, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

type Kyc = { status: string; full_name: string; country: string; document_type: string; document_last4: string };

export function KycCard({ userId, compact = false }: { userId?: string; compact?: boolean }) {
  const [kyc, setKyc] = useState<Kyc | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: '', country: '', document_type: 'passport', document_last4: '' });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!userId) return; supabase.from('kyc_submissions').select('status,full_name,country,document_type,document_last4').eq('user_id', userId).maybeSingle().then(({ data }) => setKyc(data)); }, [userId]);
  if (!userId) return null;
  const submit = async () => {
    setMsg('');
    if (form.full_name.trim().length < 3 || form.country.trim().length < 2 || !/^[A-Za-z0-9]{4}$/.test(form.document_last4)) { setMsg('Fill in full name, country and the last 4 characters of your document.'); return; }
    setBusy(true);
    const row = { user_id: userId, ...form, full_name: form.full_name.trim(), country: form.country.trim(), status: 'pending', updated_at: new Date().toISOString() };
    const { error } = await supabase.from('kyc_submissions').upsert(row);
    setBusy(false);
    if (error) { setMsg('Could not submit verification. Please try again.'); return; }
    setKyc(row); setOpen(false);
  };
  const status = kyc?.status;
  const Icon = status === 'approved' ? BadgeCheck : status === 'pending' ? Clock : ShieldAlert;
  const tone = status === 'approved' ? 'text-chart-2' : status === 'pending' ? 'text-chart-3' : 'text-muted-foreground';
  const label = status === 'approved' ? 'Identity verified' : status === 'pending' ? 'Verification under review' : status === 'rejected' ? 'Verification rejected — please resubmit' : 'Identity not verified (optional)';
  return <div className={`rounded-xl border border-border p-3 ${compact ? 'mt-3 text-xs' : 'text-sm'}`}>
    <div className="flex min-w-0 items-start gap-2"><Icon size={16} className={`mt-0.5 shrink-0 ${tone}`}/><div className="min-w-0 flex-1"><b className={tone}>{label}</b><p className="mt-1 text-xs text-muted-foreground">Verification is only needed for withdrawals and may be requested during review. We store only your name, country, document type and last 4 characters.</p></div></div>
    {status !== 'approved' && status !== 'pending' && !open && <Button type="button" size="sm" variant="outline" className="mt-3 w-full rounded-full" onClick={() => setOpen(true)}>Verify identity</Button>}
    {open && <div className="mt-3 grid gap-2">
      <input className="form-input" placeholder="Full legal name" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}/>
      <input className="form-input" placeholder="Country of residence" value={form.country} onChange={e => setForm({ ...form, country: e.target.value })}/>
      <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2"><select className="form-input min-w-0" value={form.document_type} onChange={e => setForm({ ...form, document_type: e.target.value })}><option value="passport">Passport</option><option value="national_id">National ID</option><option value="driver_license">Driver license</option></select><input className="form-input min-w-0" maxLength={4} placeholder="Last 4" value={form.document_last4} onChange={e => setForm({ ...form, document_last4: e.target.value.trim() })}/></div>
      {msg && <p className="text-xs text-destructive">{msg}</p>}
      <div className="grid grid-cols-2 gap-2"><Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button type="button" size="sm" className="rounded-full" disabled={busy} onClick={submit}>{busy ? 'Submitting…' : 'Submit'}</Button></div>
    </div>}
  </div>;
}
