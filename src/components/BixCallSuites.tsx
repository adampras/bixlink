import { useEffect, useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, MoreVertical, Share, Crown, Film, Headphones, Archive, BadgeCheck, FileText, Image as ImageIcon, Mic, Lock, Phone, Video, MessageCircle, Coins, Users, Radio, Folder, Menu, KeyRound, ShieldCheck, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BixAvatar } from '@/components/BixAvatar';
import { readContacts, CONTACTS_EVENT, type BixContact } from '@/lib/bix-contacts';
import { startBixCall } from '@/components/BixCall';
import foxMedal from '@/assets/bixlink-fox.webp';

type VaultMsg = { id: string; kind: string; media_path: string | null; meta: { name?: string; size?: number; mime?: string } | null; created_at: string; sender_id: string; recipient_id: string };

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
const VTABS = [['doc', 'Documents', Folder], ['audio', 'Audio Recordings', Mic], ['pdf', 'PDF Pitch Decks', FileText], ['media', 'Encrypted Media', Lock]] as const;
type VTab = typeof VTABS[number][0];
const isPdf = (m: VaultMsg) => /pdf/i.test(m.meta?.mime ?? '') || /\.pdf$/i.test(m.meta?.name ?? '');
const isAudio = (m: VaultMsg) => m.kind !== 'image' && m.kind !== 'file' && !/video/i.test(m.meta?.mime ?? '');
const isMedia = (m: VaultMsg) => m.kind === 'image' || /video|image/i.test(m.meta?.mime ?? '');
const inTab = (t: VTab, m: VaultMsg) => t === 'doc' ? m.kind === 'file' : t === 'audio' ? isAudio(m) : t === 'pdf' ? isPdf(m) : isMedia(m);
const fmtSize = (n?: number) => !n ? '—' : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
const ago = (iso?: string) => { if (!iso) return 'Belum ada'; const h = (Date.now() - new Date(iso).getTime()) / 36e5; return h < 1 ? 'Updated just now' : h < 24 ? `Updated ${Math.floor(h)}h ago` : `Updated ${Math.floor(h / 24)}d ago`; };
const when = (iso: string) => { const d = new Date(iso), t = new Date(); const tm = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); const days = Math.floor((new Date(t.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 864e5); return days === 0 ? `Today, ${tm}` : days === 1 ? `Yesterday, ${tm}` : `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${tm}`; };
const badge = (m: VaultMsg) => isPdf(m) ? ['PDF', 'is-pdf'] : /presentation|ppt/i.test(`${m.meta?.mime}${m.meta?.name}`) ? ['PPT', 'is-ppt'] : isAudio(m) ? ['MP3', 'is-mp3'] : isMedia(m) ? ['LOCK', 'is-lock'] : ['DOC', 'is-doc'];
const VAULT_REF_BYTES = 1024 ** 3; // display reference only, not a storage quota

function VaultThumb({ path, video }: { path: string; video: boolean }) {
  const [u, setU] = useState<string | null>(null);
  useEffect(() => { let on = true; void supabase.storage.from('bix-chat').createSignedUrl(path, 600).then(({ data }) => { if (on && data?.signedUrl) setU(data.signedUrl); }); return () => { on = false; }; }, [path]);
  return <span className="bsv-thumb">{u ? (video ? <video src={u} muted playsInline preload="metadata"/> : <img src={u} alt="" loading="lazy"/>) : <Lock size={16}/>}{video && <i>▶</i>}</span>;
}

export function SecureVault({ me }: { me: string }) {
  const [rows, setRows] = useState<VaultMsg[] | null>(null);
  const [k, setK] = useState<VTab>('doc');
  useEffect(() => { if (!me) return; void (async () => {
    const { data } = await supabase.from('bix_messages' as never).select('id,kind,media_path,meta,created_at,sender_id,recipient_id').not('media_path', 'is', null).is('deleted_at', null).order('created_at', { ascending: false }).limit(120);
    setRows((data as VaultMsg[] | null) ?? []);
  })(); }, [me]);
  const open = async (m: VaultMsg) => { if (!m.media_path) return; const { data } = await supabase.storage.from('bix-chat').createSignedUrl(m.media_path, 600); if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener'); };
  const all = rows ?? [];
  const list = all.filter(r => inTab(k, r));
  const folders = ([['Executive Documents', (m: VaultMsg) => m.kind === 'file' && !isPdf(m)], ['Financial Reports', isPdf], ['Legal & Compliance', isMedia]] as const).map(([n, f]) => { const xs = all.filter(f); return { n, c: xs.length, u: xs[0]?.created_at }; });
  const used = all.reduce((s, m) => s + (m.meta?.size ?? 0), 0);
  const pct = Math.min(100, Math.round(used / VAULT_REF_BYTES * 100));
  return <section className="bsv">
    <header className="bsv-top"><img src={foxMedal} alt="" className="bsv-medal"/><h2>Secure Vault</h2><button type="button" aria-label="Menu" className="bsv-round"><Menu size={18}/></button></header>
    <div className="bsv-hero" aria-hidden><span className="bsv-ring"/><span className="bsv-circuit"/><span className="bsv-shield"><KeyRound size={34}/></span></div>
    <div className="bsv-status"><span className="bsv-lockbox"><Lock size={20}/></span><div><small>Vault Status</small><b>Private &amp; Secure</b></div><div className="bsv-status-r"><b>Signed Link</b><small>Akses 10 menit · RLS</small></div><ShieldCheck size={26} className="bsv-cyan"/></div>
    <div className="bsv-tabs">{VTABS.map(([v, l, I]) => <button key={v} type="button" className={k === v ? 'is-on' : ''} onClick={() => setK(v)}><I size={15}/>{l}</button>)}</div>
    <h3 className="bsv-h">Folders</h3>
    <div className="bsv-folders">{folders.map(f => <div key={f.n}><Folder size={22}/><div><b>{f.n}</b><small>{f.c} items</small></div><em>{f.u ? ago(f.u) : 'Kosong'}</em></div>)}</div>
    <h3 className="bsv-h">Files</h3>
    {rows === null ? <p className="bcs-note">Memuat…</p> : list.length === 0 ? <p className="bcs-note">Belum ada lampiran di kategori ini.</p> :
      <ul className="bsv-files">{list.map(m => { const [bt, bc] = badge(m); return <li key={m.id}>
        {isMedia(m) && m.media_path ? <VaultThumb path={m.media_path} video={/video/i.test(m.meta?.mime ?? '')}/> : <span className={`bsv-badge ${bc}`}>{bt === 'LOCK' ? <Lock size={16}/> : bt}</span>}
        <div className="bsv-fmeta"><b>{m.meta?.name ?? (m.kind === 'image' ? 'Foto' : m.kind === 'file' ? 'Dokumen' : 'Voice note')}</b><small>{(m.meta?.mime?.split('/')[1] ?? m.kind).toUpperCase()} · {fmtSize(m.meta?.size)}</small><small>{when(m.created_at)} <i className="bsv-enc"><Lock size={10}/>Private</i></small></div>
        <button type="button" className="bsv-dl" onClick={() => void open(m)}><Download size={14}/>Download</button></li>; })}</ul>}
    <footer className="bsv-foot"><span className="bsv-gauge" style={{ ['--p' as string]: `${pct}%` }}><b>{pct}%</b></span><div><b>Vault Storage</b><small>{fmtSize(used)} dari 1 GB referensi · {all.length} file</small></div><span className="bsv-secure"><ShieldCheck size={18}/>Secure</span></footer>
  </section>;
}

/** Contact profiles from saved contacts; actions reuse existing call/chat/BIX PAY paths. */
export function ContactProfiles({ onChat }: { onChat: (id: string, name: string) => void }) {
  const [list, setList] = useState<BixContact[]>([]);
  const [sel, setSel] = useState<BixContact | null>(null);
  useEffect(() => { const r = () => setList(readContacts()); r(); window.addEventListener(CONTACTS_EVENT, r); return () => window.removeEventListener(CONTACTS_EVENT, r); }, []);
  if (sel) return <ContactProfileView c={sel} onBack={() => setSel(null)} onChat={onChat}/>;
  return <section className="bcs-vault">
    <div className="bcs-board-hero"><Users size={18}/><div><b>Profil Kontak</b><small>Kontak yang Anda simpan</small></div></div>
    {list.length === 0 ? <p className="bcs-note">Belum ada kontak. Cari member lalu tekan + Simpan Kontak.</p> :
      <ul className="bcs-contacts">{list.map(c => <li key={c.id}><button type="button" onClick={() => setSel(c)}><BixAvatar userId={c.id} name={c.name}/><span><b>@{c.name}</b><small>{c.code || 'BIX member'}</small></span></button></li>)}</ul>}
  </section>;
}

const MCATS = [
  ['photos', 'Photos', ImageIcon, (m: VaultMsg) => m.kind === 'image' || /image/i.test(m.meta?.mime ?? '')],
  ['videos', 'Videos', Film, (m: VaultMsg) => /video/i.test(m.meta?.mime ?? '')],
  ['audio', 'Audio', Headphones, (m: VaultMsg) => isAudio(m) && !/video/i.test(m.meta?.mime ?? '')],
  ['docs', 'Documents', FileText, (m: VaultMsg) => m.kind === 'file' && !/zip|rar|7z|tar|archive/i.test(`${m.meta?.mime}${m.meta?.name}`) && !/image|video/i.test(m.meta?.mime ?? '')],
  ['arch', 'Archives', Archive, (m: VaultMsg) => /zip|rar|7z|tar|archive/i.test(`${m.meta?.mime}${m.meta?.name}`)],
] as const;
const pad = (n: number) => String(n).padStart(2, '0');

/** Contact profile + Media Vault: counts come from real chat attachments with this contact (RLS-scoped). */
function ContactProfileView({ c, onBack, onChat }: { c: BixContact; onBack: () => void; onChat: (id: string, name: string) => void }) {
  const [rows, setRows] = useState<VaultMsg[] | null>(null);
  const [all, setAll] = useState(false);
  useEffect(() => { void (async () => {
    const { data } = await supabase.from('bix_messages' as never).select('id,kind,media_path,meta,created_at,sender_id,recipient_id').not('media_path', 'is', null).is('deleted_at', null).or(`sender_id.eq.${c.id},recipient_id.eq.${c.id}`).order('created_at', { ascending: false }).limit(200);
    setRows((data as VaultMsg[] | null) ?? []);
  })(); }, [c.id]);
  const xs = rows ?? [];
  const counts = MCATS.map(([, , , f]) => xs.filter(f).length);
  const folders = counts.filter(n => n > 0).length;
  const open = async (m: VaultMsg) => { if (!m.media_path) return; const { data } = await supabase.storage.from('bix-chat').createSignedUrl(m.media_path, 600); if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener'); };
  return <section className="bcp">
    <header className="bcp-top"><button type="button" aria-label="Kembali" onClick={onBack}><ChevronLeft size={26}/></button><button type="button" aria-label="Opsi"><MoreVertical size={22}/></button></header>
    <div className="bcp-head">
      <div className="bcp-avatar"><span className="bcp-ring"/><img src={foxMedal} alt={`Avatar ${c.name}`}/><i className="bcp-coin" aria-hidden/></div>
      <h2>{c.name} <BadgeCheck size={22} className="bcp-verified" aria-label="Member terdaftar"/></h2>
      <small>@{c.name.toLowerCase().replace(/\s+/g, '')}.bix{c.code ? ` · ${c.code}` : ''}</small>
      <span className="bcp-vip"><Crown size={14}/>BIX MEMBER</span>
    </div>
    <div className="bcp-actions">
      <button type="button" onClick={() => startBixCall(c.id, c.name, 'voice')}><span><Phone size={24}/></span>Call</button>
      <button type="button" onClick={() => onChat(c.id, c.name)}><span><MessageCircle size={24}/></span>Message</button>
      <button type="button" onClick={() => startBixCall(c.id, c.name, 'video')}><span><Video size={24}/></span>Video</button>
      <button type="button" onClick={() => onChat(c.id, c.name)}><span><Share size={24}/></span>Share Media</button>
    </div>
    <i className="bcp-glow" aria-hidden/>
    <div className="bcp-mv">
      <div className="bcp-mv-h"><div><b>Media Vault</b><small>{rows === null ? 'Memuat…' : `${xs.length} Items • ${folders} Folders`}</small></div><button type="button" onClick={() => setAll(v => !v)}>{all ? 'Tutup' : 'View All'} <ChevronRight size={14}/></button></div>
      <div className="bcp-grid">{MCATS.map(([k, l, I], i) => <div key={k} className={`bcp-tile is-${k}`}><div><I size={18}/><b>{l}</b></div><em>{pad(counts[i] ?? 0)}</em></div>)}</div>
      {all && (xs.length === 0 ? <p className="bcs-note">Belum ada media dengan kontak ini.</p> :
        <ul className="bsv-files">{xs.map(m => <li key={m.id}><div className="bsv-fmeta"><b>{m.meta?.name ?? (m.kind === 'image' ? 'Foto' : m.kind === 'file' ? 'Dokumen' : 'Voice note')}</b><small>{fmtSize(m.meta?.size)} · {when(m.created_at)}</small></div><button type="button" className="bsv-dl" onClick={() => void open(m)}><Download size={14}/>Buka</button></li>)}</ul>)}
    </div>
  </section>;
}
