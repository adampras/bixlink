import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { PhoneCall, Search, ShieldCheck } from 'lucide-react';
import { BixShell } from '@/components/BixShell';
import { MemberGate } from '@/components/MemberGate';
import { CallButtons } from '@/components/BixCall';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/call')({
  head: () => ({ meta: [{ title: 'BIX CALL — BIXLINK BIXTOK' }, { name: 'description', content: 'Voice and video calls between BIXLINK members, with private number protection.' }, { property: 'og:title', content: 'BIX CALL — BIXLINK BIXTOK' }, { property: 'og:description', content: 'Secure member-to-member voice and video calls inside BIXLINK.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: CallPage,
});

type Peer = { user_id: string; name: string; whatsapp?: string | null; can_call: boolean };
type Row = { id: string; caller_id: string; callee_id: string; kind: string; status: string; created_at: string };
const PERMS = [['all', 'Semua member'], ['friends', 'Saling follow BIXTOK'], ['network', 'Tim jaringan saya'], ['none', 'Tidak menerima']] as const;

function CallPage() {
  return <BixShell><MemberGate><CallInner/></MemberGate></BixShell>;
}

function CallInner() {
  const [me, setMe] = useState('');
  const [q, setQ] = useState('');
  const [found, setFound] = useState<Peer | null | undefined>(undefined);
  const [perm, setPerm] = useState('all');
  const [wa, setWa] = useState('');
  const [pub, setPub] = useState(false);
  const [msg, setMsg] = useState('');
  const [hist, setHist] = useState<(Row & { peer: string; peerId: string })[]>([]);

  useEffect(() => { void (async () => {
    const { data: u } = await supabase.auth.getUser(); const id = u.user?.id ?? ''; setMe(id);
    const { data: s } = await supabase.rpc('bix_call_settings' as never);
    const st = s as { permission?: string; whatsapp?: string; whatsapp_public?: boolean } | null;
    if (st) { setPerm(st.permission ?? 'all'); setWa(st.whatsapp ?? ''); setPub(!!st.whatsapp_public); }
    const { data: rows } = await supabase.from('bix_calls' as never).select('*').order('created_at', { ascending: false }).limit(15);
    const list = (rows as Row[] | null) ?? [];
    const names = new Map<string, string>();
    for (const r of list) { const pid = r.caller_id === id ? r.callee_id : r.caller_id; if (!names.has(pid)) { const { data: p } = await supabase.rpc('bix_call_peer' as never, { p_user: pid } as never); names.set(pid, (p as Peer | null)?.name ?? 'Member'); } }
    setHist(list.map(r => { const pid = r.caller_id === id ? r.callee_id : r.caller_id; return { ...r, peerId: pid, peer: names.get(pid) ?? 'Member' }; }));
  })(); }, []);

  const find = async () => { const { data } = await supabase.rpc('bix_call_find' as never, { p_query: q } as never); setFound((data as Peer | null) ?? null); };
  const save = async () => {
    const { error } = await supabase.rpc('bix_call_settings_save' as never, { p_permission: perm, p_whatsapp: wa, p_public: pub } as never);
    setMsg(error ? error.message : 'Pengaturan tersimpan'); setTimeout(() => setMsg(''), 3000);
  };

  return <main className="mx-auto max-w-xl px-4 py-6">
    <header className="mb-4 flex items-center gap-3"><span className="hub-emblem"><PhoneCall size={20}/></span><div><h1 className="hub-title font-display text-xl font-black tracking-widest">BIX CALL</h1><p className="text-[11px] text-muted-foreground">Layanan khusus BIXLINK BIXTOK · panggilan suara & video antar member</p></div></header>

    <section className="hub-group hub-tone-violet mb-3 rounded-2xl border p-3">
      <h3 className="hub-group-head"><span>Hubungi member</span></h3>
      <div className="flex gap-2"><input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && void find()} placeholder="Kode BIX-xxxxxx atau @username" className="min-w-0 flex-1 rounded-xl border bg-background/60 px-3 py-2 text-sm"/><button onClick={() => void find()} className="rounded-xl border px-3" aria-label="Cari"><Search size={16}/></button></div>
      {found === null && <p className="mt-2 text-xs text-muted-foreground">Member tidak ditemukan.</p>}
      {found && <div className="mt-3 flex items-center justify-between rounded-xl border p-2"><b className="truncate text-sm">@{found.name}</b>{found.user_id === me ? <small>Ini akun Anda</small> : found.can_call ? <CallButtons peerId={found.user_id} peerName={found.name}/> : <small className="text-muted-foreground">Tidak menerima panggilan dari Anda</small>}</div>}
    </section>

    <section className="hub-group hub-tone-violet mb-3 rounded-2xl border p-3">
      <h3 className="hub-group-head"><span>Riwayat panggilan</span></h3>
      {hist.length === 0 ? <p className="text-xs text-muted-foreground">Belum ada panggilan.</p> : <ul className="divide-y divide-border/50">{hist.map(h => <li key={h.id} className="flex items-center justify-between py-2 text-xs"><span className="min-w-0"><b className="block truncate text-sm">{h.caller_id === me ? '↗' : '↙'} @{h.peer}</b><span className="text-muted-foreground">{h.kind === 'video' ? 'Video' : 'Suara'} · {h.status === 'missed' ? 'Tidak terjawab' : h.status === 'declined' ? 'Ditolak' : h.status === 'ended' ? 'Selesai' : h.status} · {new Date(h.created_at).toLocaleString()}</span></span><CallButtons peerId={h.peerId} peerName={h.peer}/></li>)}</ul>}
    </section>

    <section className="hub-group hub-tone-silver rounded-2xl border p-3">
      <h3 className="hub-group-head"><span>Nomor & privasi</span></h3>
      <label className="text-[11px] text-muted-foreground">Nomor HP / WhatsApp (format internasional)</label>
      <input value={wa} onChange={e => setWa(e.target.value)} inputMode="tel" placeholder="+628123456789" className="mt-1 w-full rounded-xl border bg-background/60 px-3 py-2 text-sm"/>
      <label className="mt-2 flex items-center gap-2 text-xs"><input type="checkbox" checked={pub} onChange={e => setPub(e.target.checked)}/> Tampilkan tombol WhatsApp ke penelepon</label>
      <p className="mt-3 text-[11px] text-muted-foreground">Siapa yang boleh menelepon saya</p>
      <div className="mt-1 grid grid-cols-2 gap-2">{PERMS.map(([v, l]) => <button key={v} onClick={() => setPerm(v)} className={`rounded-xl border px-2 py-2 text-xs ${perm === v ? 'is-active border-primary font-bold' : ''}`}>{l}</button>)}</div>
      <button onClick={() => void save()} className="bixtok-cta mt-3 w-full">Simpan</button>
      {msg && <p className="mt-2 text-center text-xs">{msg}</p>}
      <p className="mt-3 flex items-start gap-1.5 text-[10px] text-muted-foreground"><ShieldCheck size={12} className="mt-0.5 shrink-0"/>Panggilan tersambung lewat akun BIXLINK; nomor Anda tidak pernah dibagikan kecuali Anda mengaktifkan tombol WhatsApp.</p>
    </section>
  </main>;
}
