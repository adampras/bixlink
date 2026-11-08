import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { HUB_ITEMS } from '@/lib/dock-hub';

type Cfg = { mode: 'off' | 'scoped' | 'public'; owner2_design: boolean; owner2_locked: string[] };
type Wl = { user_id: string; code: string | null; name: string | null };
const ECOS = HUB_ITEMS.filter(i => !['home', 'profile', 'settings'].includes(i.id));

/** Owner 1: design release track + Admin 2 network isolation and ecosystem locks. */
export function AdminDesignRelease({ onMessage }: { onMessage: (m: string) => void }) {
  const qc = useQueryClient();
  const [cfg, setCfg] = useState<Cfg>({ mode: 'scoped', owner2_design: false, owner2_locked: [] });
  const [wl, setWl] = useState<Wl[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const apply = (d: unknown) => { const x = d as { config: Cfg; whitelist: Wl[] }; setCfg({ ...x.config, owner2_locked: x.config.owner2_locked ?? [] }); setWl(x.whitelist ?? []); };
  useEffect(() => { supabase.rpc('bix_design_admin' as never).then(({ data, error }) => error ? onMessage(error.message) : apply(data)); }, []);
  const save = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('bix_design_save' as never, { p_mode: cfg.mode, p_owner2_design: cfg.owner2_design, p_locked: cfg.owner2_locked } as never);
    setBusy(false); if (error) return onMessage(error.message);
    qc.invalidateQueries({ queryKey: ['bix-design-access'] }); onMessage('Pengaturan rilis desain tersimpan.');
  };
  const setId = async (query: string, on: boolean) => {
    if (!query.trim()) return; setBusy(true);
    const { data, error } = await supabase.rpc('bix_design_whitelist_set' as never, { p_query: query, p_on: on } as never);
    setBusy(false); if (error) return onMessage(error.message); apply(data); setQ('');
  };
  const toggleEco = (id: string) => setCfg(c => ({ ...c, owner2_locked: c.owner2_locked.includes(id) ? c.owner2_locked.filter(x => x !== id) : [...c.owner2_locked, id] }));
  const pill = (on: boolean) => `rounded-full border px-3 py-1.5 text-xs font-bold ${on ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground'}`;

  return <div className="space-y-5 text-sm">
    <section>
      <h3 className="font-bold">Desain baru · siapa yang melihat</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {([['off', 'Mati (semua desain lama)'], ['scoped', 'Admin 1 + jaringan + ID terpilih'], ['public', 'Rilis publik']] as const).map(([v, l]) => <button key={v} type="button" className={pill(cfg.mode === v)} onClick={() => setCfg(c => ({ ...c, mode: v }))}>{l}</button>)}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Admin 2 & seluruh downline-nya selalu mengikuti saklar Admin 2 di bawah, apa pun mode ini.</p>
    </section>
    <section>
      <h3 className="font-bold">Saklar Admin 2 & jaringan</h3>
      <div className="mt-2 flex gap-2">
        <button type="button" className={pill(!cfg.owner2_design)} onClick={() => setCfg(c => ({ ...c, owner2_design: false }))}>Kunci · desain lama</button>
        <button type="button" className={pill(cfg.owner2_design)} onClick={() => setCfg(c => ({ ...c, owner2_design: true }))}>Buka · ikut desain baru</button>
      </div>
      <p className="mt-3 text-xs font-bold">Ekosistem untuk Admin 2 & jaringan (ketuk untuk kunci/buka)</p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ECOS.map(e => { const locked = cfg.owner2_locked.includes(e.id); return <button key={e.id} type="button" onClick={() => toggleEco(e.id)} className={`rounded-xl border px-3 py-2 text-left text-xs ${locked ? 'border-destructive/60 bg-destructive/10' : 'border-border'}`}><b>{e.label}</b><span className={`ml-1 ${locked ? 'text-destructive' : 'text-primary'}`}>{locked ? '🔒 Terkunci' : '● Terbuka'}</span></button>; })}
      </div>
    </section>
    <Button disabled={busy} onClick={save}>Simpan pengaturan</Button>
    <section>
      <h3 className="font-bold">ID terpilih (+ seluruh downline)</h3>
      <div className="mt-2 flex gap-2"><input value={q} onChange={e => setQ(e.target.value)} placeholder="BIX-ID atau @username" className="w-full rounded-xl border border-border bg-background px-3 py-2"/><Button disabled={busy} onClick={() => setId(q, true)}>Tambah</Button></div>
      <ul className="mt-2 space-y-1">{wl.length ? wl.map(w => <li key={w.user_id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-xs"><span><b>{w.code ?? w.user_id.slice(0, 8)}</b> {w.name ?? ''}</span><button type="button" className="text-destructive" onClick={() => setId(w.code ?? w.user_id, false)}>Cabut</button></li>) : <li className="text-xs text-muted-foreground">Belum ada ID tambahan.</li>}</ul>
    </section>
  </div>;
}
