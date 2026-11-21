import { useEffect, useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { FileText, Image as ImageIcon, Mic, Lock, Phone, Video, MessageCircle, Coins, Users, Radio } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BixAvatar } from '@/components/BixAvatar';
import { readContacts, CONTACTS_EVENT, type BixContact } from '@/lib/bix-contacts';
import { startBixCall } from '@/components/BixCall';

type VaultMsg = { id: string; kind: string; media_path: string | null; meta: { name?: string; size?: number; mime?: string } | null; created_at: string; sender_id: string; recipient_id: string };
const KINDS = [['all', 'Semua'], ['image', 'Foto'], ['file', 'Dokumen'], ['voice', 'Suara']] as const;

/** Boardroom: presentation wrapper around the existing group-meeting rooms (no new call engine). */
export function BoardroomStage({ children }: { children: ReactNode }) {
  return <section className="bcs-board">
    <div className="bcs-board-hero"><Radio size={18}/><div><b>Boardroom</b><small>Ruang suara eksekutif · host, speaker & audiens</small></div></div>
    <div className="bcs-board-podium" aria-hidden>{[0, 1, 2].map(i => <span key={i} className="bcs-ring"><Mic size={16}/></span>)}</div>
    <p className="bcs-note">Buat atau masuk ruang dengan kode di bawah. Kontrol mik, speaker dan keluar ada di layar panggilan.</p>
    {children}
  </section>;
}

/** Secure Vault: lists media the member already sent/received via chat (RLS limits rows to own conversations). */
export function SecureVault({ me }: { me: string }) {
  const [rows, setRows] = useState<VaultMsg[] | null>(null);
  const [k, setK] = useState<string>('all');
  useEffect(() => { if (!me) return; void (async () => {
    const { data } = await supabase.from('bix_messages' as never).select('id,kind,media_path,meta,created_at,sender_id,recipient_id').not('media_path', 'is', null).is('deleted_at', null).order('created_at', { ascending: false }).limit(120);
    setRows((data as VaultMsg[] | null) ?? []);
  })(); }, [me]);
  const open = async (m: VaultMsg) => { if (!m.media_path) return; const { data } = await supabase.storage.from('bix-chat').createSignedUrl(m.media_path, 600); if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener'); };
  const list = (rows ?? []).filter(r => k === 'all' || r.kind === k || (k === 'voice' && r.kind !== 'image' && r.kind !== 'file'));
  return <section className="bcs-vault">
    <div className="bcs-board-hero"><Lock size={18}/><div><b>Secure Vault</b><small>Lampiran dari percakapan Anda · hanya Anda dan lawan bicara</small></div></div>
    {rows && <div className="bcs-vstats">{([['image','Foto',ImageIcon],['file','Dokumen',FileText],['voice','Suara',Mic]] as const).map(([v,l,I])=>{const n=rows.filter(r=>v==='voice'?(r.kind!=='image'&&r.kind!=='file'):r.kind===v).length;return <div key={v}><I size={15}/><b>{n}</b><small>{l}</small><i style={{width:`${rows.length?Math.round(n/rows.length*100):0}%`}}/></div>;})}</div>}
    <div className="bcs-chips">{KINDS.map(([v, l]) => <button key={v} type="button" className={k === v ? 'is-on' : ''} onClick={() => setK(v)}>{l}</button>)}</div>
    {rows === null ? <p className="bcs-note">Memuat…</p> : list.length === 0 ? <p className="bcs-note">Belum ada lampiran.</p> :
      <ul className="bcs-vault-grid">{list.map(m => { const I = m.kind === 'image' ? ImageIcon : m.kind === 'file' ? FileText : Mic; return <li key={m.id}><button type="button" onClick={() => void open(m)}>
        <I size={22}/><b>{m.meta?.name ?? (m.kind === 'image' ? 'Foto' : m.kind === 'file' ? 'Dokumen' : 'Voice note')}</b>
        <small>{m.sender_id === me ? 'Terkirim' : 'Diterima'} · {new Date(m.created_at).toLocaleDateString([], { day: '2-digit', month: 'short' })}</small></button></li>; })}</ul>}
  </section>;
}

/** Contact profiles from saved contacts; actions reuse existing call/chat/BIX PAY paths. */
export function ContactProfiles({ onChat }: { onChat: (id: string, name: string) => void }) {
  const [list, setList] = useState<BixContact[]>([]);
  const [sel, setSel] = useState<BixContact | null>(null);
  useEffect(() => { const r = () => setList(readContacts()); r(); window.addEventListener(CONTACTS_EVENT, r); return () => window.removeEventListener(CONTACTS_EVENT, r); }, []);
  if (sel) return <section className="bcs-profile">
    <button type="button" className="bcs-back" onClick={() => setSel(null)}>← Kontak</button>
    <div className="bcs-profile-card"><BixAvatar userId={sel.id} name={sel.name}/><h2>@{sel.name}</h2>{sel.code && <small>{sel.code}</small>}<span className="bcs-badge">Kontak BIX CALL</span></div>
    <div className="bcs-pass"><div><small>BIX PROTOCOL PASS</small><b>@{sel.name}</b><span>ID {sel.code || sel.id.slice(0, 8).toUpperCase()}</span></div><i aria-hidden>{Array.from({ length: 16 }, (_, j) => <em key={j} className={(sel.id.charCodeAt(j % sel.id.length) + j) % 3 ? 'on' : ''}/>)}</i></div>
    <div className="bcs-actions">
      <button type="button" onClick={() => onChat(sel.id, sel.name)}><MessageCircle size={18}/>Chat</button>
      <button type="button" onClick={() => startBixCall(sel.id, sel.name, 'voice')}><Phone size={18}/>Suara</button>
      <button type="button" onClick={() => startBixCall(sel.id, sel.name, 'video')}><Video size={18}/>Video</button>
      <Link to="/pay"><Coins size={18}/>BIX PAY</Link>
    </div>
    <p className="bcs-note">Izin panggilan tetap mengikuti paket dan privasi masing-masing member.</p>
  </section>;
  return <section className="bcs-vault">
    <div className="bcs-board-hero"><Users size={18}/><div><b>Profil Kontak</b><small>Kontak yang Anda simpan</small></div></div>
    {list.length === 0 ? <p className="bcs-note">Belum ada kontak. Cari member lalu tekan + Simpan Kontak.</p> :
      <ul className="bcs-contacts">{list.map(c => <li key={c.id}><button type="button" onClick={() => setSel(c)}><BixAvatar userId={c.id} name={c.name}/><span><b>@{c.name}</b><small>{c.code || 'BIX member'}</small></span></button></li>)}</ul>}
  </section>;
}
