import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, X, Search, Pause, Play, ExternalLink } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { type Outlet, CARE_STATUS, signCare } from '@/lib/bixcare';

const DIV: Record<string, string> = { auto: 'AutoCare', wash: 'Wash', laundry: 'Laundry', rent: 'Rent' };
const TABS = [['pending', 'Menunggu'], ['approved', 'Akun disetujui'], ['rejected', 'Ditolak'], ['suspended', 'Ditangguhkan']] as const;

export function AdminBixcare({ onMessage }: { onMessage: (m: string) => void }) {
  const [all, setAll] = useState<Outlet[]>([]);
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('pending');
  const [q, setQ] = useState('');
  const [div, setDiv] = useState('');
  const [logos, setLogos] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    const { data, error } = await supabase.from('bixcare_outlets').select('*').order('created_at', { ascending: false });
    if (error) return onMessage(error.message);
    const list = (data ?? []) as Outlet[]; setAll(list);
    setLogos(await signCare(list.map(o => o.logo_path)));
  }, [onMessage]);
  useEffect(() => { void load(); }, [load]);

  const set = async (o: Outlet, status: string, needNote = false) => {
    let note = '';
    if (needNote) { note = window.prompt(`Alasan untuk ${o.name}?`) ?? ''; if (!note.trim()) return; }
    const patch: Record<string, unknown> = { status, review_note: note };
    if (status !== 'approved') patch.is_open = false;
    const { error } = await supabase.from('bixcare_outlets').update(patch).eq('id', o.id);
    onMessage(error ? error.message : `${o.name} → ${CARE_STATUS[status] ?? status}.`); void load();
  };
  const toggleOpen = async (o: Outlet) => {
    const { error } = await supabase.from('bixcare_outlets').update({ is_open: !o.is_open }).eq('id', o.id);
    onMessage(error ? error.message : `${o.name} ${o.is_open ? 'ditutup' : 'dibuka'}.`); void load();
  };

  const count = (s: string) => all.filter(o => o.status === s).length;
  const shown = useMemo(() => all.filter(o => o.status === tab && (!div || o.division === div) && `${o.name} ${o.city} ${o.phone} ${o.owner_id}`.toLowerCase().includes(q.toLowerCase())), [all, tab, div, q]);

  return <div className="mt-6 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><h2 className="text-lg font-bold">BIXCARE · Mitra layanan</h2><p className="text-xs text-muted-foreground">Bengkel, cuci, laundry & rental. Setujui pengajuan dan kelola akun mitra.</p></div>
      <Link to="/care" className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold"><ExternalLink size={14}/>Buka BIXCARE</Link>
    </div>
    <div className="flex flex-wrap gap-2" role="tablist">{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`rounded-full px-3 py-1.5 text-xs font-bold ${tab === k ? 'bg-primary text-primary-foreground' : 'border border-border'}`}>{l} ({count(k)})</button>)}</div>
    <div className="flex flex-wrap gap-2">
      <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-card px-3"><Search size={14}/><input className="w-full bg-transparent py-2 text-sm outline-none" placeholder="Cari nama, kota, WhatsApp" value={q} onChange={e => setQ(e.target.value)}/></div>
      <select className="rounded-full border border-border bg-card px-3 text-sm" value={div} onChange={e => setDiv(e.target.value)}><option value="">Semua kategori</option>{Object.entries(DIV).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
    </div>
    <div className="grid gap-2">
      {shown.map(o => <div key={o.id} className="grid gap-3 rounded-2xl border border-border/60 bg-card/70 p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
        {logos[o.logo_path ?? ''] ? <img src={logos[o.logo_path!]} alt="" className="h-12 w-12 rounded-xl object-cover"/> : <div className="grid h-12 w-12 place-items-center rounded-xl bg-muted text-xs font-bold">{o.name.slice(0, 2).toUpperCase()}</div>}
        <div className="min-w-0 text-xs">
          <p className="truncate text-sm font-bold">{o.name} <span className="font-normal text-muted-foreground">· {DIV[o.division] ?? o.division}</span>{o.status === 'approved' && <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${o.is_open ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>{o.is_open ? 'BUKA' : 'TUTUP'}</span>}</p>
          <p className="text-muted-foreground">{o.city} · {o.address || '—'} · WA {o.phone || '—'}</p>
          <p className="text-muted-foreground">Bank: {o.bank_name ? `${o.bank_name} ${o.bank_account} a.n. ${o.bank_holder}` : '—'} · QRIS {o.qris_path ? 'ada' : 'belum'} · Akun {o.owner_id.slice(0, 8)}…</p>
          {o.review_note && <p className="text-destructive">Catatan: {o.review_note}</p>}
        </div>
        <div className="flex flex-wrap gap-1">
          {o.status !== 'approved' && <button onClick={() => set(o, 'approved')} className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"><Check size={14}/>Setujui</button>}
          {o.status === 'pending' && <button onClick={() => set(o, 'rejected', true)} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-bold"><X size={14}/>Tolak</button>}
          {o.status === 'approved' && <>
            <button onClick={() => toggleOpen(o)} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-bold">{o.is_open ? <Pause size={14}/> : <Play size={14}/>}{o.is_open ? 'Tutup' : 'Buka'}</button>
            <button onClick={() => set(o, 'suspended', true)} className="rounded-full border border-border px-3 py-1.5 text-xs font-bold">Tangguhkan</button>
            <button onClick={() => set(o, 'rejected', true)} className="rounded-full border border-destructive px-3 py-1.5 text-xs font-bold text-destructive">Cabut izin</button>
          </>}
        </div>
      </div>)}
      {!shown.length && <p className="py-8 text-center text-sm text-muted-foreground">Tidak ada mitra di daftar ini.</p>}
    </div>
  </div>;
}
