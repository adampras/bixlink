import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { normalizeAgency, type AgencyConfig, type AgencyApplication, type AgencyTier } from '@/lib/agency';
import type { Json } from '@/integrations/supabase/types';

export function AdminAgency() {
  const qc = useQueryClient();
  const [cfg, setCfg] = useState<AgencyConfig | null>(null);
  const [msg, setMsg] = useState('');
  useEffect(() => { supabase.rpc('bix_agency_config').then(r => setCfg(normalizeAgency(r.data))); }, []);
  const apps = useQuery({ queryKey: ['agency-apps'], queryFn: async () => ((await supabase.from('bix_agency_applications').select('*').order('created_at', { ascending: false }).limit(100)).data ?? []) as AgencyApplication[] });
  if (!cfg) return null;
  const setTier = (k: 'national' | 'city', f: keyof AgencyTier, v: number | boolean) => setCfg({ ...cfg, [k]: { ...cfg[k], [f]: v } });
  const save = async () => { setMsg(''); const r = await supabase.rpc('bix_agency_save', { p_config: cfg as unknown as Json }); if (r.error) setMsg(r.error.message); else { setCfg(normalizeAgency(r.data)); setMsg('Tersimpan.'); qc.invalidateQueries({ queryKey: ['agency-config'] }); } };
  const review = async (id: string, status: string) => { const r = await supabase.rpc('bix_agency_review', { p_id: id, p_status: status, p_note: '' }); setMsg(r.error ? r.error.message : `Status: ${status}`); apps.refetch(); };
  const num = 'w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm';
  const field = (k: 'national' | 'city', f: keyof AgencyTier, label: string) => <label className="text-[11px] text-muted-foreground">{label}<input type="number" className={num} value={Number(cfg[k][f] ?? 0)} onChange={e => setTier(k, f, Number(e.target.value))}/></label>;
  return <section className="mt-8 grid max-w-3xl gap-4 rounded-xl border border-border p-4">
    <h2 className="font-display text-xl font-black">PRESALE KEAGENAN (Negara / Kota)</h2>
    <div className="flex items-center justify-between"><span className="text-sm font-bold">Program {cfg.enabled ? 'OPEN' : 'CLOSE'}</span><Switch checked={cfg.enabled} onCheckedChange={v => setCfg({ ...cfg, enabled: v })}/></div>
    {(['national', 'city'] as const).map(k => <div key={k} className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between"><b className="text-sm">{k === 'national' ? 'National Sovereign Partner' : 'City Custody Hub'}</b><Switch checked={cfg[k].enabled} onCheckedChange={v => setTier(k, 'enabled', v)}/></div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {field(k, 'minUsd', 'Min USD')}{field(k, 'maxUsd', 'Max USD')}{field(k, 'overridePct', 'Override %')}{k === 'national' ? field(k, 'perCountry', 'Slot / negara') : field(k, 'perCity', 'Slot / kota')}
      </div>
    </div>)}
    <Button onClick={save} className="rounded-full">Save agency settings</Button>
    {msg && <p className="text-sm text-chart-3">{msg}</p>}
    <h3 className="font-bold">Pengajuan ({apps.data?.length ?? 0})</h3>
    <div className="grid gap-2">{(apps.data ?? []).map(a => <div key={a.id} className="rounded-lg border border-border p-3 text-xs">
      <div className="flex flex-wrap justify-between gap-2"><b>{a.tier === 'national' ? 'National' : 'City'} · {a.country}{a.city ? ` · ${a.city}` : ''}</b><span className="uppercase">{a.status}</span></div>
      <p className="numeric text-muted-foreground">${Number(a.commitment_usd).toLocaleString()} · {a.contact}{a.license_no ? ` · ${a.license_no}` : ''}</p>
      <div className="mt-2 flex gap-2">{a.status === 'pending' && <><Button size="sm" onClick={() => review(a.id, 'approved')}>Setujui</Button><Button size="sm" variant="outline" onClick={() => review(a.id, 'rejected')}>Reject</Button></>}{a.status === 'approved' && <Button size="sm" variant="destructive" onClick={() => review(a.id, 'revoked')}>Cabut lisensi</Button>}</div>
    </div>)}</div>
  </section>;
}
