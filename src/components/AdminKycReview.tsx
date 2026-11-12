import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

type Row = { user_id: string; full_name: string; country: string; document_type: string; document_last4: string; phone: string | null; id_path: string | null; selfie_path: string | null; status: string; created_at: string };

/** Admin KYC queue; access is enforced by RLS (is_bix_admin) on rows and the private bix-kyc files. */
export function AdminKycReview() {
  const [rows, setRows] = useState<Row[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const load = async () => {
    const { data } = await supabase.from('kyc_submissions').select('user_id,full_name,country,document_type,document_last4,phone,id_path,selfie_path,status,created_at').eq('status', 'pending').order('created_at').limit(50);
    setRows((data ?? []) as Row[]);
  };
  useEffect(() => { void load(); }, []);
  const view = async (p: string | null) => {
    if (!p) return;
    const { data } = await supabase.storage.from('bix-kyc').createSignedUrl(p, 120);
    if (data?.signedUrl) setUrls(u => ({ ...u, [p]: data.signedUrl }));
  };
  const act = async (id: string, status: 'approved' | 'rejected') => {
    const review_note = status === 'rejected' ? (window.prompt('Reason for rejection') || 'Documents unclear') : null;
    await supabase.from('kyc_submissions').update({ status, review_note, updated_at: new Date().toISOString() }).eq('user_id', id);
    void load();
  };
  return <section className="ex-panel rounded-2xl p-4">
    <h2 className="mb-3 text-xs font-black tracking-widest text-primary">KYC REVIEW QUEUE · {rows.length}</h2>
    {!rows.length && <p className="text-xs text-muted-foreground">No pending verifications.</p>}
    <div className="grid gap-3">{rows.map(r => <div key={r.user_id} className="rounded-xl border border-border p-3 text-xs">
      <b className="text-sm">{r.full_name}</b> · {r.country} · {r.document_type} ••{r.document_last4}{r.phone ? ` · ${r.phone}` : ''}
      <div className="mt-2 flex gap-2">{[r.id_path, r.selfie_path].map((p, i) => p && (urls[p] ? <a key={p} href={urls[p]} target="_blank" rel="noreferrer"><img src={urls[p]} alt={i ? 'Selfie' : 'ID'} className="h-20 w-28 rounded-md object-cover"/></a> : <Button key={p} size="sm" variant="outline" onClick={() => view(p)}>{i ? 'View selfie' : 'View ID'}</Button>))}</div>
      <div className="mt-2 grid grid-cols-2 gap-2"><Button size="sm" variant="ghost" onClick={() => act(r.user_id, 'rejected')}>Reject</Button><Button size="sm" onClick={() => act(r.user_id, 'approved')}>Approve · +20 BIX locked</Button></div>
    </div>)}</div>
  </section>;
}
