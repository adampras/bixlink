import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

/** Owner 1: choose which owners (and their downlines) see the institutional staking design. */
export function AdminStakingSkin({ onMessage }: { onMessage: (m: string) => void }) {
  const q = useQuery({ queryKey: ['staking-skin-admin'], queryFn: async () => { const r = await supabase.rpc('bix_staking_skin_admin'); if (r.error) throw r.error; return r.data as { enabled: boolean; owners: { id: string; code: string }[] }; } });
  const [enabled, setEnabled] = useState(false);
  const [codes, setCodes] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (q.data) { setEnabled(q.data.enabled); setCodes(q.data.owners.map(o => o.code).join(', ')); } }, [q.data]);
  async function save() {
    setBusy(true);
    const list = codes.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
    const r = await supabase.rpc('bix_staking_skin_save', { p_enabled: enabled, p_codes: list });
    setBusy(false);
    if (r.error) return onMessage(r.error.message);
    await q.refetch(); onMessage('Desain staking per jaringan disimpan.');
  }
  return <section className="mt-6 grid gap-3 rounded-2xl border border-border bg-card p-4">
    <h3 className="font-display text-lg font-bold">Desain Staking Institusional per Jaringan</h3>
    <p className="text-xs text-muted-foreground">The selected Owner and their entire downline see the Sovereign Institutional view on the STAKE page. Staking logic remains unchanged.</p>
    <div className="flex items-center justify-between rounded-xl border border-border px-3 py-2"><span className="text-sm">Aktifkan</span><Button size="sm" variant={enabled ? 'default' : 'outline'} aria-pressed={enabled} onClick={() => setEnabled(v => !v)}>{enabled ? 'ON' : 'OFF'}</Button></div>
    <label className="text-xs font-bold uppercase text-muted-foreground">Owner member codes (separated by commas)</label>
    <input value={codes} onChange={e => setCodes(e.target.value)} placeholder="BIX-978455, BIX-123456" className="rounded-xl border border-border bg-background px-3 py-2 text-sm"/>
    <Button disabled={busy} onClick={save}>{busy ? 'Menyimpan…' : 'Save'}</Button>
  </section>;
}
