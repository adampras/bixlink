import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { HUB_ITEMS } from '@/lib/dock-hub';

type Cfg = { mode: 'off' | 'scoped' | 'public'; chrono?: boolean; card?: string; owner2_design: boolean; owner2_locked: string[] };
type Wl = { user_id: string; code: string | null; name: string | null };
const CARD_SKINS = [['quartz', 'White Quartz'], ['obsidian', 'Obsidian Gold'], ['emerald', 'Imperial Emerald'], ['corsa', 'Titanium Corsa'], ['amethyst', 'Royal Amethyst']] as const;
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
  const setChrono = async (on: boolean) => {
    setBusy(true);
    const { data, error } = await supabase.rpc('bix_design_set_chrono' as never, { p_on: on } as never);
    setBusy(false); if (error) return onMessage(error.message);
    setCfg(c => ({ ...c, chrono: !!(data as { chrono?: boolean })?.chrono })); qc.invalidateQueries({ queryKey: ['bix-design-access'] });
    onMessage(on ? 'Model Chronograph RM aktif untuk Admin 1 & jaringan.' : 'Model Chronograph RM dimatikan.');
  };
  const setCard = async (skin: string) => {
    setBusy(true);
    const { data, error } = await supabase.rpc('bix_design_set_card' as never, { p_skin: skin } as never);
    setBusy(false); if (error) return onMessage(error.message);
    setCfg(c => ({ ...c, card: (data as { card?: string })?.card ?? skin })); qc.invalidateQueries({ queryKey: ['bix-design-access'] });
    onMessage('Warna kartu saldo tersimpan.');
  };
  const setId = async (query: string, on: boolean) => {
    if (!query.trim()) return; setBusy(true);
    const { data, error } = await supabase.rpc('bix_design_whitelist_set' as never, { p_query: query, p_on: on } as never);
    setBusy(false); if (error) return onMessage(error.message); apply(data); setQ('');
  };
  const [orbit, setOrbit] = useState<string>('scoped');
  useEffect(() => { supabase.rpc('bix_hub_orbit_access' as never).then(({ data }) => { const m = (data as { mode?: string } | null)?.mode; if (m) setOrbit(m); }); }, []);
  const saveOrbit = async (m: string) => {
    setBusy(true); const { error } = await supabase.rpc('bix_hub_orbit_set' as never, { p_mode: m } as never); setBusy(false);
    if (error) return onMessage(error.message); setOrbit(m); qc.invalidateQueries({ queryKey: ['bix-hub-orbit'] });
    onMessage(m === 'public' ? 'HUB Orbit dibuka untuk publik.' : m === 'scoped' ? 'HUB Orbit hanya Admin 1 + ID terpilih.' : 'HUB Orbit dimatikan.');
  };
  const [flt, setFlt] = useState<string>('scoped');
  useEffect(() => { supabase.rpc('bix_hub_float_access' as never).then(({ data }) => { const m = (data as { mode?: string } | null)?.mode; if (m) setFlt(m); }); }, []);
  const saveFlt = async (m: string) => {
    setBusy(true); const { error } = await supabase.rpc('bix_hub_float_set' as never, { p_mode: m } as never); setBusy(false);
    if (error) return onMessage(error.message); setFlt(m); qc.invalidateQueries({ queryKey: ['bix-hub-float'] });
    onMessage(m === 'public' ? 'HUB Float dibuka untuk publik.' : m === 'scoped' ? 'HUB Float hanya Admin 1 + ID terpilih.' : 'HUB Float dimatikan.');
  };
  const [pt, setPt] = useState(false);
  useEffect(() => { supabase.rpc('bix_presale_test_state' as never).then(({ data }) => setPt(!!(data as { enabled?: boolean } | null)?.enabled)); }, []);
  const savePt = async (on: boolean) => {
    setBusy(true); const { error } = await supabase.rpc('bix_presale_test_set' as never, { p_on: on } as never); setBusy(false);
    if (error) return onMessage(error.message); setPt(on); onMessage(on ? 'Tes beli presale virtual aktif untuk Admin 1 + ID terpilih.' : 'Tes beli presale virtual dimatikan.');
  };
  const toggleEco = (id: string) => setCfg(c => ({ ...c, owner2_locked: c.owner2_locked.includes(id) ? c.owner2_locked.filter(x => x !== id) : [...c.owner2_locked, id] }));
  const pill = (on: boolean) => `rounded-full border px-3 py-1.5 text-xs font-bold ${on ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground'}`;

  return <div className="space-y-5 text-sm">
    <section>
      <h3 className="font-bold">Tes beli Presale · wallet virtual</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" disabled={busy} className={pill(!pt)} onClick={() => savePt(false)}>Tutup</button>
        <button type="button" disabled={busy} className={pill(pt)} onClick={() => savePt(true)}>Aktif · Admin 1 + ID terpilih</button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Pembelian tes ditandai TEST: tidak memotong saldo, tidak masuk pool, bonus, atau klaim BIX. ID terpilih juga melihat wallet Admin 1 saat deposit/presale tanpa mengubah upline, omset, atau bonus.</p>
    </section>
    <section>
      <h3 className="font-bold">HUB Orbit · ikon lingkaran minimalis</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {([['off', 'Tutup'], ['scoped', 'Admin 1 + ID terpilih'], ['public', 'Buka untuk publik']] as const).map(([v, l]) => <button key={v} type="button" disabled={busy} className={pill(orbit === v)} onClick={() => saveOrbit(v)}>{l}</button>)}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Akun terpilih = daftar ID desain di bawah. Tersimpan langsung.</p>
    </section>
    <section>
      <h3 className="font-bold">HUB Float · ikon 3D melayang satu halaman</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {([['off', 'Tutup'], ['scoped', 'Admin 1 + ID terpilih'], ['public', 'Buka untuk publik']] as const).map(([v, l]) => <button key={v} type="button" disabled={busy} className={pill(flt === v)} onClick={() => saveFlt(v)}>{l}</button>)}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Latar kaca putih tipis, tekan-tahan lalu geser untuk efek memudar & terbalik. Jika aktif, menggantikan HUB Orbit.</p>
    </section>
    <section>
      <h3 className="font-bold">Desain baru · siapa yang melihat</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {([['off', 'Mati (semua desain lama)'], ['scoped', 'Admin 1 + jaringan + ID terpilih'], ['public', 'Rilis publik']] as const).map(([v, l]) => <button key={v} type="button" className={pill(cfg.mode === v)} onClick={() => setCfg(c => ({ ...c, mode: v }))}>{l}</button>)}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Admin 2 & seluruh downline-nya selalu mengikuti saklar Admin 2 di bawah, apa pun mode ini.</p>
    </section>
    <section>
      <h3 className="font-bold">Model Chronograph RM · Profit & Wallet</h3>
      <div className="mt-2 flex gap-2">
        <button type="button" disabled={busy} className={pill(!cfg.chrono)} onClick={() => setChrono(false)}>Tutup · model saat ini</button>
        <button type="button" disabled={busy} className={pill(!!cfg.chrono)} onClick={() => setChrono(true)}>Buka · Chronograph</button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Hanya Admin 1, jaringannya & ID terpilih. Admin 2 dan jaringannya tidak pernah melihat model ini. Langsung tersimpan.</p>
      <h4 className="mt-4 text-xs font-bold">Warna latar kartu saldo (Wallet)</h4>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {CARD_SKINS.map(([v, l]) => <button key={v} type="button" disabled={busy} onClick={() => setCard(v)} className={`chrono-skin-pick ${(cfg.card ?? 'obsidian') === v ? 'is-on' : ''}`} data-skin={v}><i/><span>{l}</span></button>)}
      </div>
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
