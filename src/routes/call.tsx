import { createFileRoute, Link } from '@tanstack/react-router';
import { createPortal } from 'react-dom';
const COMM_TABS: string[] = ['chat', 'group', 'updates', 'call', 'community', 'setting', 'newgroup'];
import { useEffect, useRef, useState } from 'react';
import { Search, ShieldCheck, MessageCircle, Phone, Video, Lock, Send, ArrowLeft, Crown, ImagePlus, Mic, Square, Coins, Paperclip, X } from 'lucide-react';
import { MemberGate } from '@/components/MemberGate';
import callGateImg from '@/assets/eco/call.png';
import { startBixCall } from '@/components/BixCall';
import { BixGroupMeeting } from '@/components/BixGroupMeeting';
import { BixGroups } from '@/components/BixGroups';
import { useMember } from '@/lib/useMember';
import { CommunityTab, NotifyCard } from '@/components/BixCommExtras';
import { supabase } from '@/integrations/supabase/client';
import { BixShell } from '@/components/BixShell';
import { BixAvatar, useBixCard } from '@/components/BixAvatar';
import { StoryBar } from '@/components/BixStories';
import { pushNotify } from '@/lib/bix-push';
import { compressImage } from '@/lib/bix-image';
import { Camera, MoreVertical, QrCode, ScanLine, UserPlus, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { QrScanner } from '@/components/QrScanner';
import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { getBixPay } from '@/lib/bixlink.functions';
import { CONTACTS_EVENT, addContact, readContacts, removeContact, parseBixId, type BixContact } from '@/lib/bix-contacts';
import { ChatThemePicker } from '@/components/ChatThemePicker';
import { playDtmf, getRingVolume, setRingVolume, RINGTONES, getRingId, setRingId, startChosenRingtone, saveDeviceRingtone, loadDeviceRingtone, clearDeviceRingtone } from '@/lib/bix-tones';
import { EcoLogo } from '@/components/EcoLogo';
import { ecosystemHead } from '@/lib/ecosystem-seo';
import { NativeDeviceSettings } from '@/components/NativeDeviceSettings';

export const Route = createFileRoute('/call')({
  head: () => ecosystemHead('/call', 'BIX CALL — Chat, Panggilan Suara & Video | BIXLINK', 'Kenali BIX CALL untuk chat, panggilan suara, video dan grup antaranggota BIXLINK. Akun diperlukan; akses mengikuti ketentuan layanan.'),
  validateSearch: (s: Record<string, unknown>): CallSearch => {
    const out: CallSearch = {}; const t = s['tab'], c = s['chat'], n = s['n'];
    if (typeof t === 'string' && COMM_TABS.includes(t)) out.tab = t as CommTab;
    if (typeof c === 'string') out.chat = c;
    if (typeof n === 'string') out.n = n;
    return out;
  },
  component: CallPage,
});
type CommTab = 'chat' | 'group' | 'updates' | 'call' | 'community' | 'setting' | 'newgroup';
type CallSearch = { tab?: CommTab; chat?: string; n?: string };

type Peer = { user_id: string; name: string; whatsapp?: string | null; can_call: boolean; avatar_path?: string | null; status_text?: string | null };
type Row = { id: string; caller_id: string; callee_id: string; kind: string; status: string; created_at: string };
type Tier = { stake: number; chat: boolean; voice: boolean; video: boolean; vip: boolean; tier: string; chat_enabled: boolean; min: { chat: number; voice: number; video: number; vip: number } };
type Thread = { peer: string; name: string; body: string; at: string; mine: boolean; unread: number; online?: boolean };
type Msg = { id: string; sender_id: string; recipient_id: string; body: string; created_at: string; read_at: string | null; delivered_at?: string | null; reactions?: Record<string, string>; pinned_at?: string | null; kind?: string; media_path?: string | null; meta?: { amount?: number; note?: string | null; name?: string; size?: number; mime?: string; status?: string } | null; reply_to?: string | null; reply_body?: string | null; forwarded?: boolean; deleted_at?: string | null; hidden_by?: string[] };
type PeerState = { online?: boolean; typing?: boolean; last_seen?: string | null };
const seenText = (s: PeerState) => s.typing ? 'typing…' : s.online ? 'online' : s.last_seen ? `last seen ${new Date(s.last_seen).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}` : 'ENCRYPTED CHAT';
const urlCache = new Map<string, string>();
const REACTS = ['👍', '❤️', '😂', '😮', '🙏', '🔥'];
const fmtSize = (n = 0) => n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
const fileIcon = (name = '') => { const e = name.split('.').pop()?.toLowerCase() ?? ''; return e === 'pdf' ? 'PDF' : ['xls', 'xlsx', 'csv'].includes(e) ? 'XLS' : ['doc', 'docx'].includes(e) ? 'DOC' : ['ppt', 'pptx'].includes(e) ? 'PPT' : ['zip', 'rar'].includes(e) ? 'ZIP' : 'FILE'; };
const fmtBix = (n?: number) => Number(n ?? 0).toLocaleString('en-US', { maximumFractionDigits: 4 });
function VoiceNote({ url }: { url: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [rate, setRate] = useState(1);
  const next = () => { const r = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1; setRate(r); if (ref.current) ref.current.playbackRate = r; };
  return <span className="comm-voice"><audio ref={ref} src={url} controls preload="none" className="comm-audio" onPlay={e => { e.currentTarget.playbackRate = rate; }}/><button type="button" className="comm-rate" onClick={next} aria-label="Kecepatan putar">{rate}×</button></span>;
}
function ChatMedia({ m, me, onAct }: { m: Msg; me: string; onAct: (m: Msg, a: 'pay' | 'decline' | 'cancel') => void }) {
  const [url, setUrl] = useState(m.media_path ? urlCache.get(m.media_path) ?? '' : '');
  useEffect(() => { const p = m.media_path; if (!p || url) return; void supabase.storage.from('bix-chat').createSignedUrl(p, 3600, m.kind === 'file' ? { download: m.meta?.name || true } : undefined).then(({ data }) => { if (data?.signedUrl) { urlCache.set(p, data.signedUrl); setUrl(data.signedUrl); } }); }, [m.media_path, url, m.kind, m.meta?.name]);
  if (m.kind === 'pay') return <span className="comm-paycard"><b>🪙 {fmtBix(m.meta?.amount)} BIX</b><small>BIX PAY · terkirim{m.meta?.note ? ` · ${m.meta.note}` : ''}</small></span>;
  if (m.kind === 'request') {
    const st = m.meta?.status ?? 'open'; const mine = m.sender_id === me;
    return <span className={`comm-reqcard is-${st}`}><em>🧾 TAGIHAN BIX</em><b>{fmtBix(m.meta?.amount)} BIX</b>{m.meta?.note && <small>{m.meta.note}</small>}
      {st === 'open' ? (mine ? <span className="comm-req-act"><i>Waiting for payment</i><button type="button" onClick={() => onAct(m, 'cancel')}>Batalkan</button></span>
        : <span className="comm-req-act"><button type="button" className="is-pay" onClick={() => onAct(m, 'pay')}>Pay Now</button><button type="button" onClick={() => onAct(m, 'decline')}>Reject</button></span>)
        : <i className="comm-req-st">{st === 'paid' ? '✓ Lunas via BIX PAY' : st === 'declined' ? 'Rejected' : 'Dibatalkan'}</i>}
    </span>;
  }
  if (!url) return <span className="comm-media-wait">Loading…</span>;
  if (m.kind === 'image') return <a href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt="Chat photo" className="comm-img" loading="lazy"/></a>;
  if (m.kind === 'file' && (m.meta?.mime ?? '').startsWith('video/')) return <video src={url} controls playsInline preload="metadata" className="comm-img"/>;
  if (m.kind === 'file') return <a className="comm-filecard" href={url} target="_blank" rel="noopener noreferrer"><i>{fileIcon(m.meta?.name)}</i><span><b>{m.meta?.name ?? 'Dokumen'}</b><small>{fmtSize(m.meta?.size)} · Unduh</small></span></a>;
  return <VoiceNote url={url}/>;
}
const PERMS = [['all', 'All members'], ['friends', 'Saling follow'], ['network', 'Network team'], ['none', 'Not accepting']] as const;
const TIER_LABEL: Record<string, string> = { free: 'FREE · Chat', voice: 'CALLER · Voice', video: 'PRO · Video HD', vip: '👑 VIP CALLER' };

function CallPage() {
  const { user, ready } = useMember();
  if (ready && !user) return <BixCallGate/>;
  return <BixShell><div className="bixcall-page">
    <MemberGate ready={ready} signedIn={!!user} title="BIX CALL"><CallInner/></MemberGate>
  </div></BixShell>;
}

function BixCallGate() {
  return <main className="bcg" aria-label="BIX CALL sign in">
    <div className="bcg-stars" aria-hidden/>
    <div className="bcg-wave" aria-hidden>{Array.from({ length: 28 }, (_, n) => <i key={n} style={{ animationDelay: `${(n % 7) * 0.18}s`, height: `${18 + ((n * 37) % 60)}%` }}/>)}</div>
    <Link to="/" className="bcg-back"><ArrowLeft className="size-4"/>Ecosystem</Link>
    <section className="bcg-card">
      <div className="bcg-orb"><i className="bcg-ring"/><i className="bcg-ring bcg-ring-2"/><img src={callGateImg} alt="" width={816} height={816}/></div>
      <h1 className="bcg-title">BIX CALL</h1>
      <p className="bcg-sub">Encrypted voice &amp; HD video — private, crystal-clear, community-powered.</p>
      <div className="bcg-chips"><span><ShieldCheck className="size-3.5"/>Encrypted</span><span><Mic className="size-3.5"/>Studio Voice</span><span><Video className="size-3.5"/>HD Video</span></div>
      <Link to="/register" className="bcg-cta">Join BIX CALL free</Link>
      <Link to="/auth" className="bcg-ghost">Sign in</Link>
      <small className="bcg-note">No deposit needed — just chat and call.</small>
    </section>
  </main>;
}

function CallInner() {
  const [me, setMe] = useState('');
  const tab: CommTab = Route.useSearch().tab ?? 'chat';
  const [tier, setTier] = useState<Tier | null>(null);
  const [chatWith, setChatWith] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => { void (async () => {
    const { data: u } = await supabase.auth.getUser(); setMe(u.user?.id ?? '');
    const { data } = await supabase.rpc('bix_comm_me' as never); setTier(data as Tier | null);
    const sp = new URLSearchParams(window.location.search); const c = sp.get('chat');
    if (c) setChatWith({ id: c, name: sp.get('n') ?? 'Member' });
  })(); }, []);
  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } setChatWith(null); window.scrollTo({ top: 0 }); }, [tab]);

  if (chatWith) return <ChatRoom me={me} peer={chatWith} tier={tier} onBack={() => setChatWith(null)}/>;
  const open = (id: string, name: string) => setChatWith({ id, name });
  const TITLE: Record<CommTab, string> = { chat: 'CHAT', group: 'GROUP', updates: 'UPDATES', call: 'CALLS', community: 'COMMUNITY', setting: 'SETTINGS', newgroup: 'NEW GROUP' };
  const view: CommTab = tab;

  return <main className="mx-auto w-full px-3 py-4">
    <div className="bc-head">
      <div className="bc-head__search"><FindMember bar me={me} tier={tier} onChat={open}/></div>
      <ContactQr/>
      <CommMenu/>
    </div>
    <div className="comm-subhead"><EcoLogo id="call" size={18}/><b>{TITLE[view]}</b>{tier && <span className={`comm-tier is-${tier.tier}`}>{TIER_LABEL[tier.tier]}</span>}</div>

    {view === 'chat' && <><SavedContacts onChat={open}/><ChatTab me={me} tier={tier} onOpen={open}/></>}
    {view === 'group' && <BixGroups me={me}/>}
    {view === 'newgroup' && <BixGroups me={me} createOnly/>}
    {view === 'updates' && <StoryBar me={me} myName="Saya" list/>}
    {view === 'call' && <><CallTab me={me} tier={tier} onChat={open}/><BixGroupMeeting me={me} tier={tier}/></>}
    {view === 'community' && <CommunityTab render={(id, name) => <ActionButtons peerId={id} name={name} tier={tier} canCall onChat={open}/>}/>}
    {view === 'setting' && <><ChatThemePicker/><NotifyCard/><PrivacyTab tier={tier}/><h3 className="comm-h mt-5">Community</h3><CommunityTab render={(id, name) => <ActionButtons peerId={id} name={name} tier={tier} canCall onChat={open}/>}/></>}
  </main>;
}

/** Settings shortcut only (themes, ringtone, notifications, privacy) — tab navigation stays in the dock. */
function CommMenu() {
  const [o, setO] = useState(false);
  const go = [['setting', 'Pengaturan · Tema & Dering'], ['newgroup', '+ Grup Baru'], ['community', 'Komunitas']] as const;
  return <span className="comm-kebab"><button type="button" aria-label="Pengaturan BIX CALL" aria-expanded={o} onClick={() => setO(v => !v)}><MoreVertical size={18}/></button>
    {o && <span className="comm-kebab-menu" role="menu" onClick={() => setO(false)}>{go.map(([t, l]) => <Link key={t} to="/call" search={{ tab: t }} role="menuitem">{l}</Link>)}</span>}</span>;
}

/** Bare 6-digit numbers are BIX-IDs: 123456 → BIX-123456. */
const normQuery = (t: string) => /^\d{6}$/.test(t.trim()) ? `BIX-${t.trim()}` : t;
function SaveContactBtn({ id, name, code }: { id: string; name: string; code?: string | null | undefined }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => { setSaved(readContacts().some(c => c.id === id)); }, [id]);
  return <button type="button" className="bc-save-contact" disabled={saved} onClick={() => { addContact({ id, name, code: code ?? '' }); setSaved(true); try { navigator.vibrate?.(15); } catch { /* optional */ } }}>{saved ? '✓ Tersimpan' : '+ Simpan Kontak'}</button>;
}
type Found = Peer & { code?: string | null; via?: string };
const VIA: Record<string, string> = { id: 'BIX-ID', username: 'Username', whatsapp: 'WhatsApp' };
function FindMember({ me, tier, onChat, bar }: { bar?: boolean; me: string; tier: Tier | null; onChat: (id: string, name: string) => void }) {
  const [q, setQ] = useState('');
  const [found, setFound] = useState<Found | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => { try { setRecent(JSON.parse(localStorage.getItem('bixcall-recent') ?? '[]')); } catch { /* ignore */ } }, []);
  useEffect(() => { if (!bar) return; const h = (e: Event) => { const t = (e as CustomEvent<string>).detail; if (t) { void find(t); window.scrollTo({ top: 0, behavior: 'smooth' }); } }; window.addEventListener('bix-find', h); return () => window.removeEventListener('bix-find', h); });
  const find = async (term = q) => {
    const t = term.trim(); if (t.length < 3) return;
    setBusy(true); setQ(t);
    const { data } = await supabase.rpc('bix_call_find' as never, { p_query: normQuery(t) } as never);
    setBusy(false); setFound((data as Found | null) ?? null);
    if (data) { const r = [t, ...recent.filter(x => x !== t)].slice(0, 3); setRecent(r); localStorage.setItem('bixcall-recent', JSON.stringify(r)); }
  };
  const copy = (c: string) => { void navigator.clipboard?.writeText(c); try { navigator.vibrate?.(10); } catch { /* optional */ } };
  return <section className={bar ? 'bc-wrap' : 'comm-card'}>
    {!bar && <h3 className="comm-h">Lacak member</h3>}
    <div className={bar ? 'bc-bar' : 'comm-search'}>{bar ? <span className="bc-logo" aria-label="BIX CALL"><svg viewBox="0 0 40 40" width="40" height="40" aria-hidden><defs><linearGradient id="bcg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#FFF1A8"/><stop offset=".5" stopColor="#FFD700"/><stop offset="1" stopColor="#B8860B"/></linearGradient></defs><circle cx="20" cy="20" r="18.5" fill="#07050c" stroke="url(#bcg)" strokeWidth="1.4"/><path d="M28 9.5a13 13 0 0 1 3.6 6.5M30.5 6.5a17 17 0 0 1 4.6 8.5" fill="none" stroke="#A855F7" strokeWidth="1.6" strokeLinecap="round"/><text x="19" y="25.5" textAnchor="middle" fontSize="14" fontWeight="900" fontFamily="system-ui,sans-serif" letterSpacing="-.5" fill="url(#bcg)">BC</text></svg><i/></span> : <Search size={15}/>}<input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && void find()} placeholder={bar ? "Cari BIX-ID, @username, no. WA…" : "BIX-ID, @username atau no. WA"}/>
      {q && <button type="button" className="comm-clear" aria-label="Delete" onClick={() => { setQ(''); setFound(undefined); }}>✕</button>}
      <button onClick={() => void find()} disabled={busy} aria-label="Search">{busy ? '…' : bar ? <Search size={15}/> : 'Cari'}</button></div>
    {(!bar || q) && <div className="comm-chips"><span>BIX-ID</span><span>@Username</span><span>No. WA</span>
      {recent.map(r => <button key={r} onClick={() => void find(r)}>↺ {r}</button>)}</div>}
    {found === null && <p className="mt-2 text-xs text-muted-foreground">Member not found. WA number can only be tracked if the owner enables the WhatsApp button.</p>}
    {found && <div className="comm-peer"><BixAvatar userId={found.user_id} name={found.name}/>
      <span className="min-w-0 flex-1"><b className="block truncate">@{found.name}</b>{found.status_text && <em className="comm-statusline">{found.status_text}</em>}
        <span className="comm-meta">{found.code && <button onClick={() => copy(found.code!)}>{found.code} ⧉</button>}{found.whatsapp && <i>WA connected</i>}{found.via && <small>via {VIA[found.via]}</small>}</span></span>
      {found.user_id === me ? <small>Your account</small> : <ActionButtons peerId={found.user_id} name={found.name} tier={tier} canCall={found.can_call} onChat={onChat}/>}</div>}
    {found && found.user_id !== me && <SaveContactBtn id={found.user_id} name={found.name} code={found.code}/>}
  </section>;
}

function ActionButtons({ peerId, name, tier, canCall, onChat }: { peerId: string; name: string; tier: Tier | null; canCall: boolean; onChat: (id: string, name: string) => void }) {
  const [hint, setHint] = useState('');
  const call = (k: 'voice' | 'video') => {
    if (!tier?.[k]) { setHint(`Requires an active stake of $${tier?.min[k] ?? '-'} for ${k === 'voice' ? 'voice calls' : 'video calls'}`); setTimeout(() => setHint(''), 3500); return; }
    if (!canCall) { setHint('This member does not accept calls from you'); setTimeout(() => setHint(''), 3500); return; }
    startBixCall(peerId, name, k);
  };
  return <span className="comm-actions">
    <button aria-label="Chat" onClick={() => onChat(peerId, name)}><MessageCircle size={15}/></button>
    <button aria-label="Voice call" className={tier?.voice ? '' : 'is-locked'} onClick={() => call('voice')}>{tier?.voice ? <Phone size={15}/> : <Lock size={13}/>}</button>
    <button aria-label="Video call" className={tier?.video ? '' : 'is-locked'} onClick={() => call('video')}>{tier?.video ? <Video size={15}/> : <Lock size={13}/>}</button>
    <Link to="/pay" aria-label={`Kirim BIX ke @${name}`} title="Kirim BIX PAY" className="comm-pay-btn"><Coins size={15}/></Link>
    {hint && <em className="comm-hint">{hint} · <Link to="/stake">Staking</Link></em>}
  </span>;
}

function ChatTab({ me, tier, onOpen }: { me: string; tier: Tier | null; onOpen: (id: string, name: string) => void }) {
  const [threads, setThreads] = useState<Thread[] | null>(null);
  useEffect(() => {
    const load = async () => { void supabase.rpc('bix_chat_sync' as never, {} as never); void supabase.rpc('bix_chat_delivered' as never); const { data } = await supabase.rpc('bix_chat_threads' as never); setThreads((data as Thread[] | null) ?? []); };
    void load(); const t = setInterval(() => void load(), 6000); return () => clearInterval(t);
  }, []);
  return <>
    {tier && !tier.chat && <p className="comm-lock"><Lock size={13}/>{tier.chat_enabled ? `BIX CHAT unlocks with staking from $${tier.min.chat}.` : 'BIX CHAT is currently closed by Admin.'}</p>}
    <StoryBar me={me} myName="Saya"/>
    <section className="comm-card"><h3 className="comm-h">Percakapan</h3>
      {threads === null ? <p className="text-xs text-muted-foreground">Loading…</p> : threads.length === 0 ? <p className="text-xs text-muted-foreground">No chats yet. Search for members above to start chatting.</p> :
        <ul className="comm-list">{threads.map(t => <li key={t.peer}><button onClick={() => onOpen(t.peer, t.name)}><BixAvatar userId={t.peer} name={t.name} online={t.online}/>
          <span className="min-w-0 flex-1 text-left"><b className="block truncate text-sm">@{t.name}</b><small className="block truncate text-muted-foreground">{t.mine ? 'You: ' : ''}{t.body}</small></span>
          <span className="text-right"><small className="block text-[10px] text-muted-foreground">{new Date(t.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>{t.unread > 0 && <i className="comm-badge">{t.unread}</i>}</span></button></li>)}</ul>}
    </section>
  </>;
}

function CallTab({ me, tier, onChat }: { me: string; tier: Tier | null; onChat: (id: string, name: string) => void }) {
  const [hist, setHist] = useState<(Row & { peer: string; peerId: string; canCall: boolean })[]>([]);
  useEffect(() => { if (!me) return; void (async () => {
    const { data: rows } = await supabase.from('bix_calls' as never).select('*').order('created_at', { ascending: false }).limit(15);
    const list = (rows as Row[] | null) ?? []; const peers = new Map<string, Peer | null>();
    for (const r of list) { const pid = r.caller_id === me ? r.callee_id : r.caller_id; if (!peers.has(pid)) { const { data: p } = await supabase.rpc('bix_call_peer' as never, { p_user: pid } as never); peers.set(pid, p as Peer | null); } }
    setHist(list.map(r => { const pid = r.caller_id === me ? r.callee_id : r.caller_id; const p = peers.get(pid); return { ...r, peerId: pid, peer: p?.name ?? 'Member', canCall: !!p?.can_call }; }));
  })(); }, [me]);
  const [pad, setPad] = useState(false);
  return <>
    {pad && <Dialpad me={me} tier={tier} onChat={onChat}/>}
    <button type="button" className={`comm-fab${pad ? ' is-open' : ''}`} aria-label={pad ? 'Close dial pad' : 'Open dial pad'} onClick={() => setPad(v => !v)}>{pad ? <X size={22}/> : <Phone size={22}/>}</button>
    <section className="comm-card"><h3 className="comm-h">Call history</h3>
      {hist.length === 0 ? <p className="text-xs text-muted-foreground">No calls yet.</p> : <ul className="comm-list">{hist.map(h => <li key={h.id} className="comm-row">
        <span className={`comm-dir ${h.status === 'missed' || h.status === 'declined' ? 'is-miss' : h.caller_id === me ? 'is-out' : 'is-in'}`}>{h.caller_id === me ? '↗' : '↙'}</span>
        <span className="min-w-0 flex-1"><b className="block truncate text-sm">@{h.peer}</b><small className="text-muted-foreground"><em className={`comm-hbadge ${h.status === 'missed' || h.status === 'declined' ? 'is-miss' : h.caller_id === me ? 'is-out' : 'is-in'}`}>{h.status === 'missed' ? 'Tak terjawab' : h.status === 'declined' ? 'Rejected' : h.caller_id === me ? 'Leave' : 'Join'}</em> {h.kind === 'video' ? 'Video' : 'Voice'} · {new Date(h.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</small></span>
        <button type="button" className="bc-redial" aria-label={`Panggil ulang @${h.peer}`} onClick={() => startBixCall(h.peerId, h.peer, h.kind === 'video' ? 'video' : 'voice')}>{h.kind === 'video' ? <Video size={16}/> : <Phone size={16}/>}</button>
        <ActionButtons peerId={h.peerId} name={h.peer} tier={tier} canCall={h.canCall} onChat={onChat}/></li>)}</ul>}
    </section>
  </>;
}

const PAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
const SUB: Record<string, string> = { '2': 'ABC', '3': 'DEF', '4': 'GHI', '5': 'JKL', '6': 'MNO', '7': 'PQRS', '8': 'TUV', '9': 'WXYZ', '0': '+' };
function Dialpad({ me, tier, onChat }: { me: string; tier: Tier | null; onChat: (id: string, name: string) => void }) {
  const [num, setNum] = useState('');
  const [found, setFound] = useState<Found | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const press = (k: string) => { playDtmf(k); try { navigator.vibrate?.(8); } catch { /* optional */ } setFound(undefined); setNum(n => (n + k).slice(0, 20)); };
  const find = async () => {
    const t = num.trim(); if (t.length < 3) return;
    setBusy(true); const { data } = await supabase.rpc('bix_call_find' as never, { p_query: normQuery(t) } as never); setBusy(false);
    setFound((data as Found | null) ?? null);
  };
  return <section className="comm-card comm-dial">
    <h3 className="comm-h">Dial pad</h3>
    <div className="comm-dial-num"><input value={num} onChange={e => { setNum(e.target.value.slice(0, 20)); setFound(undefined); }} inputMode="tel" placeholder="BIX-ID or WA number"/>
      {num && <button type="button" aria-label="Delete digit" onClick={() => { setNum(n => n.slice(0, -1)); setFound(undefined); }}>⌫</button>}</div>
    <div className="comm-dial-pad">{PAD.map(k => <button key={k} type="button" onClick={() => press(k)}><b>{k}</b><small>{SUB[k] ?? ''}</small></button>)}</div>
    <button type="button" className="comm-dial-go" onClick={() => void find()} disabled={busy || num.trim().length < 3}><Phone size={18}/>{busy ? 'Mencari…' : 'Search & call'}</button>
    {found === null && <p className="mt-2 text-center text-xs text-muted-foreground">Member not found.</p>}
    {found && <div className="comm-peer"><BixAvatar userId={found.user_id} name={found.name}/><b className="min-w-0 flex-1 truncate">@{found.name}</b>
      {found.user_id === me ? <small>Your account</small> : <ActionButtons peerId={found.user_id} name={found.name} tier={tier} canCall={found.can_call} onChat={onChat}/>}</div>}
    {found && found.user_id !== me && <SaveContactBtn id={found.user_id} name={found.name} code={found.code}/>}
  </section>;
}

function TierLadder({ tier }: { tier: Tier | null }) {
  if (!tier) return null;
  const steps = [['chat', MessageCircle, 'Chat', tier.min.chat], ['voice', Phone, 'Voice', tier.min.voice], ['video', Video, 'Video HD', tier.min.video], ['vip', Crown, 'VIP', tier.min.vip]] as const;
  return <section className="comm-card"><h3 className="comm-h">Fasilitas paket Anda · staking ${Number(tier.stake).toFixed(0)}</h3>
    <div className="comm-ladder">{steps.map(([k, I, l, m]) => <div key={k} className={tier[k] ? 'is-on' : ''}><I size={16}/><b>{l}</b><small>{Number(m) > 0 ? `$${m}+` : 'Gratis'}</small>{!tier[k] && <Lock size={10} className="comm-ladder-lock"/>}</div>)}</div>
    {!tier.vip && <Link to="/stake" className="comm-upgrade">Upgrade staking package to unlock the next features →</Link>}
  </section>;
}

function PrivacyTab({ tier }: { tier: Tier | null }) {
  const [perm, setPerm] = useState('all');
  const [wa, setWa] = useState('');
  const [pub, setPub] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => { void (async () => {
    const { data: s } = await supabase.rpc('bix_call_settings' as never);
    const st = s as { permission?: string; whatsapp?: string; whatsapp_public?: boolean } | null;
    if (st) { setPerm(st.permission ?? 'all'); setWa(st.whatsapp ?? ''); setPub(!!st.whatsapp_public); }
  })(); }, []);
  const save = async () => {
    const { error } = await supabase.rpc('bix_call_settings_save' as never, { p_permission: perm, p_whatsapp: wa, p_public: pub } as never);
    try { navigator.vibrate?.(15); } catch { /* optional */ }
    setMsg(error ? error.message : 'Settings saved'); setTimeout(() => setMsg(''), 3000);
  };
  return <>
    <TierLadder tier={tier}/>
    <CallDiagnostics/>
    <NativeDeviceSettings/>
    <section className="comm-card">
      <h3 className="comm-h">Who can contact me</h3>
      <div className="comm-perms">{PERMS.map(([v, l]) => <button key={v} onClick={() => setPerm(v)} className={perm === v ? 'is-on' : ''}>{l}</button>)}</div>
      <h3 className="comm-h mt-4">Nomor HP / WhatsApp</h3>
      <input value={wa} onChange={e => setWa(e.target.value)} inputMode="tel" placeholder="+628123456789" className="comm-input"/>
      <label className="comm-check"><input type="checkbox" checked={pub} onChange={e => setPub(e.target.checked)}/>Show WhatsApp button to callers</label>
      <RingSetting/>
      <button onClick={() => void save()} className="comm-save">Save</button>
      {msg && <p className="mt-2 text-center text-xs">{msg}</p>}
      <p className="mt-3 flex items-start gap-1.5 text-[10px] text-muted-foreground"><ShieldCheck size={12} className="mt-0.5 shrink-0"/>Chats and calls connect through your BIXLINK account; your number is never shared unless you enable the WhatsApp button.</p>
    </section>
  </>;
}

type PermState = 'granted' | 'denied' | 'prompt' | 'unsupported';
function CallDiagnostics() {
  const [st, setSt] = useState<Record<'mic' | 'cam' | 'notif', PermState>>({ mic: 'prompt', cam: 'prompt', notif: 'prompt' });
  const check = async () => {
    const q = async (n: string): Promise<PermState> => { try { const r = await navigator.permissions.query({ name: n as PermissionName }); return r.state as PermState; } catch { return 'prompt'; } };
    const notif: PermState = typeof Notification === 'undefined' ? 'unsupported' : Notification.permission === 'default' ? 'prompt' : Notification.permission as PermState;
    setSt({ mic: await q('microphone'), cam: await q('camera'), notif });
  };
  useEffect(() => { void check(); }, []);
  const ask = async () => {
    try { const m = await navigator.mediaDevices.getUserMedia({ audio: true, video: true }); m.getTracks().forEach(t => t.stop()); } catch { /* denied */ }
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') await Notification.requestPermission().catch(() => 'default');
    void check();
  };
  const L: Record<PermState, string> = { granted: '✓ Aktif', denied: '✕ Ditolak', prompt: '• Belum diizinkan', unsupported: '— Tidak didukung' };
  const rows = [['Mikrofon', st.mic], ['Kamera', st.cam], ['Notifikasi', st.notif]] as const;
  return <section className="comm-card"><h3 className="comm-h">Diagnostik perangkat</h3>
    <ul className="bc-diag">{rows.map(([n, v]) => <li key={n}><span>{n}</span><b className={`is-${v}`}>{L[v]}</b></li>)}</ul>
    {rows.some(([, v]) => v === 'denied') && <p className="mt-2 text-[11px] text-muted-foreground">Izin yang ditolak harus diaktifkan lewat Setelan HP → Aplikasi → BIXLINK / Chrome → Izin.</p>}
    <div className="bc-diag-act"><button type="button" onClick={() => void ask()}>Minta izin</button><button type="button" onClick={() => window.dispatchEvent(new Event('bix-call-sim'))}>📞 Uji panggilan masuk</button></div>
  </section>;
}

function RingSetting() {
  const [v, setV] = useState(0.7);
  const [id, setId] = useState('lux');
  const [dev, setDev] = useState('');
  const [note, setNote] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const stopRef = useRef<(() => void) | null>(null);
  useEffect(() => { setV(getRingVolume()); setId(getRingId()); void loadDeviceRingtone().then(f => setDev(f?.name ?? '')); return () => stopRef.current?.(); }, []);
  const test = (rid = id) => { stopRef.current?.(); const stop = startChosenRingtone(rid); stopRef.current = stop; setTimeout(() => { stop(); if (stopRef.current === stop) stopRef.current = null; }, 4000); };
  const pick = (rid: string) => { if (rid === 'device' && !dev) { fileRef.current?.click(); return; } setId(rid); setRingId(rid); test(rid); };
  const upload = async (f: File) => {
    if (!f.type.startsWith('audio/')) { setNote('Select an audio file (MP3, M4A, WAV, OGG).'); return; }
    if (f.size > 8 * 1024 * 1024) { setNote('Maksimal 8 MB.'); return; }
    await saveDeviceRingtone(f); setDev(f.name); setId('device'); setRingId('device'); setNote('Ringtone saved on this phone'); test('device');
  };
  return <><h3 className="comm-h mt-4">Nada dering BIX CALL</h3>
    <div className="comm-ring"><input type="range" min={0} max={1} step={0.1} value={v} aria-label="Volume nada dering" onChange={e => { const n = Number(e.target.value); setV(n); setRingVolume(n); }}/>
      <span>{v === 0 ? 'Senyap' : `${Math.round(v * 100)}%`}</span><button type="button" onClick={() => test()}>▶ Tes</button></div>
    <div className="comm-ring-list">{RINGTONES.map(r => <button key={r.id} type="button" className={id === r.id ? 'is-on' : ''} onClick={() => pick(r.id)}>
      <span>{r.id === 'device' ? `📱 ${dev ? dev : r.name}` : `🔔 ${r.name}`}</span><small>{id === r.id ? '✓ Dipakai' : '▶'}</small></button>)}</div>
    <div className="comm-ring mt-2"><button type="button" onClick={() => fileRef.current?.click()}>📁 {dev ? 'Change tone from phone' : 'Select tone from phone'}</button>
      {dev && <button type="button" onClick={() => { void clearDeviceRingtone(); setDev(''); if (id === 'device') { setId('lux'); setRingId('lux'); } }}>Delete</button>}</div>
    <input ref={fileRef} type="file" accept="audio/*" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void upload(f); }}/>
    {note && <p className="mt-1 text-center text-[10px] text-muted-foreground">{note}</p>}</>;
}

const QUICK = ['Halo! 👋', 'Can you talk now?', 'Sebentar ya', 'Siap 👍', 'Cek BIX PAY 🪙', 'Thank you 🙏'];
function ChatRoom({ me, peer, tier, onBack }: { me: string; peer: { id: string; name: string }; tier: Tier | null; onBack: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [calls, setCalls] = useState<Row[]>([]);
  const tick = useRef(0);
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [canCall, setCanCall] = useState(false);
  const [name, setName] = useState(peer.name);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<PeerState>({});
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [menu, setMenu] = useState<Msg | null>(null);
  const [fwd, setFwd] = useState<Msg | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const typingAt = useRef(0);
  const locked = !!tier && !tier.chat;
  const peerCard = useBixCard(peer.id);

  const sync = async (typing: boolean) => {
    const { data } = await supabase.rpc('bix_chat_sync' as never, { p_peer: peer.id, p_typing: typing } as never);
    if (data) setState(data as PeerState);
  };
  useEffect(() => {
    void supabase.rpc('bix_call_peer' as never, { p_user: peer.id } as never).then(({ data }) => { const p = data as Peer | null; if (p) { setCanCall(p.can_call); setName(p.name); } });
    const load = async () => {
      const { data } = await supabase.from('bix_messages' as never).select('*').or(`and(sender_id.eq.${me},recipient_id.eq.${peer.id}),and(sender_id.eq.${peer.id},recipient_id.eq.${me})`).order('created_at', { ascending: false }).limit(80);
      setMsgs(((data as Msg[] | null) ?? []).filter(m => !(m.hidden_by ?? []).includes(me)).reverse());
      void supabase.rpc('bix_chat_read' as never, { p_peer: peer.id } as never);
      if (++tick.current % 5 === 1) { const { data: cl } = await supabase.from('bix_calls' as never).select('id,caller_id,callee_id,kind,status,created_at').or(`and(caller_id.eq.${me},callee_id.eq.${peer.id}),and(caller_id.eq.${peer.id},callee_id.eq.${me})`).order('created_at', { ascending: false }).limit(30); setCalls((cl as Row[] | null) ?? []); }
    };
    if (!me) return;
    void load(); void sync(false);
    const t = setInterval(() => void load(), 3000);
    const s = setInterval(() => void sync(Date.now() - typingAt.current < 4000), 2500);
    return () => { clearInterval(t); clearInterval(s); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, peer.id]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs.length]);
  // Full-screen room that tracks the visible area, so the keyboard never pushes the page up.
  const roomRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const vv = window.visualViewport; const el = roomRef.current;
    document.documentElement.classList.add('comm-room-open');
    const fit = () => { if (!el) return; const h = vv?.height ?? window.innerHeight; el.style.height = `${h}px`; el.style.transform = `translateY(${vv?.offsetTop ?? 0}px)`; window.scrollTo(0, 0); end.current?.scrollIntoView({ block: 'end' }); };
    fit(); vv?.addEventListener('resize', fit); vv?.addEventListener('scroll', fit);
    return () => { vv?.removeEventListener('resize', fit); vv?.removeEventListener('scroll', fit); document.documentElement.classList.remove('comm-room-open'); };
  }, []);

  const onType = (v: string) => {
    setText(v);
    const first = Date.now() - typingAt.current > 4000;
    typingAt.current = v ? Date.now() : 0;
    if (v && first) void sync(true);
  };
  const fail = (e: string) => { setErr(e); setTimeout(() => setErr(''), 4000); };
  const added = (data: unknown) => { setMsgs(m => [...m, data as Msg]); pushNotify('chat', (data as Msg | null)?.id); };

  const send = async () => {
    const b = text.trim(); if (!b) return;
    setText(''); typingAt.current = 0;
    const r = replyTo; setReplyTo(null);
    const { data, error } = await supabase.rpc('bix_chat_send' as never, { p_to: peer.id, p_body: b, p_reply: r?.id ?? null } as never);
    if (error) { fail(error.message); setText(b); setReplyTo(r); return; }
    void supabase.rpc('bix_chat_read' as never, { p_peer: peer.id } as never);
    added(data);
  };
  const upload = async (blob: Blob, kind: 'image' | 'voice', ext: string, to = peer.id, forwarded = false) => {
    if (blob.size > 10 * 1024 * 1024) { fail('File maksimal 10 MB'); return false; }
    setBusy(true);
    const path = `${me}/${to}/${crypto.randomUUID()}.${ext}`;
    const up = await supabase.storage.from('bix-chat').upload(path, blob, { contentType: blob.type || 'application/octet-stream' });
    if (up.error) { setBusy(false); fail(up.error.message); return false; }
    const r = forwarded ? null : replyTo; if (!forwarded) setReplyTo(null);
    const { data, error } = await supabase.rpc('bix_chat_send_media' as never, { p_to: to, p_kind: kind, p_path: path, p_body: '', p_reply: r?.id ?? null, p_forwarded: forwarded } as never);
    setBusy(false);
    if (error) { fail(error.message); return false; }
    if (to === peer.id) added(data); else pushNotify('chat', (data as Msg | null)?.id);
    return true;
  };
  const rec = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const toggleRec = async () => {
    if (rec.current) { rec.current.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const r = new MediaRecorder(stream); const chunks: Blob[] = []; const t0 = Date.now();
      r.ondataavailable = e => chunks.push(e.data);
      r.onstop = () => { stream.getTracks().forEach(t => t.stop()); rec.current = null; setRecording(false);
        if (Date.now() - t0 < 700) return; const type = r.mimeType || 'audio/webm'; void upload(new Blob(chunks, { type }), 'voice', type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'); };
      r.start(); rec.current = r; setRecording(true); setTimeout(() => { if (rec.current === r) r.stop(); }, 120000);
    } catch { fail('Microphone permission denied'); }
  };
  const [payOpen, setPayOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [amt, setAmt] = useState('');
  const [note, setNote] = useState('');
  const pay = async () => {
    const a = Number(amt); if (!(a > 0)) return fail('Enter BIX amount');
    setBusy(true);
    const { data, error } = await supabase.rpc('bix_chat_pay' as never, { p_to: peer.id, p_amount: a, p_note: note } as never);
    setBusy(false);
    if (error) return fail(error.message);
    setPayOpen(false); setAmt(''); setNote(''); try { navigator.vibrate?.(20); } catch { /* optional */ }
    added(data);
  };

  const remove = async (m: Msg, everyone: boolean) => {
    setMenu(null);
    const { data, error } = await supabase.rpc('bix_chat_delete' as never, { p_id: m.id, p_everyone: everyone } as never);
    if (error) return fail(error.message);
    const p = (data as { path?: string | null } | null)?.path;
    if (p) void supabase.storage.from('bix-chat').remove([p]);
    setMsgs(list => everyone ? list.map(x => x.id === m.id ? { ...x, deleted_at: new Date().toISOString(), body: 'Message deleted', kind: 'text', media_path: null } : x) : list.filter(x => x.id !== m.id));
  };
  const forward = async (m: Msg, to: { id: string; name: string }) => {
    setFwd(null);
    if (m.kind === 'image' || m.kind === 'voice') {
      if (!m.media_path) return fail('Attachment unavailable');
      setBusy(true);
      const dl = await supabase.storage.from('bix-chat').download(m.media_path);
      setBusy(false);
      if (dl.error || !dl.data) return fail('Failed to load attachment');
      const ext = (m.media_path.split('.').pop() || 'bin').slice(0, 5);
      if (await upload(dl.data, m.kind, ext, to.id, true)) toastOk(`Diteruskan ke @${to.name}`);
      return;
    }
    const { data, error } = await supabase.rpc('bix_chat_send' as never, { p_to: to.id, p_body: m.body, p_forwarded: true } as never);
    if (error) return fail(error.message);
    if (to.id === peer.id) added(data); else { pushNotify('chat', (data as Msg | null)?.id); toastOk(`Diteruskan ke @${to.name}`); }
  };
  const docRef = useRef<HTMLInputElement>(null);
  const [payMode, setPayMode] = useState<'send' | 'request'>('send');
  const sendFile = async (f: File) => {
    if (f.size > 10 * 1024 * 1024) return fail('File maksimal 10 MB');
    setBusy(true);
    const ext = (f.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'bin';
    const path = `${me}/${peer.id}/${crypto.randomUUID()}.${ext}`;
    const up = await supabase.storage.from('bix-chat').upload(path, f, { contentType: f.type || 'application/octet-stream' });
    if (up.error) { setBusy(false); return fail(up.error.message); }
    const { data, error } = await supabase.rpc('bix_chat_send_file' as never, { p_to: peer.id, p_path: path, p_name: f.name, p_size: f.size, p_mime: f.type } as never);
    setBusy(false);
    if (error) return fail(error.message);
    added(data);
  };
  const camRef = useRef<HTMLInputElement>(null);
  const sendPicked = async (f: File) => {
    if (f.type.startsWith('video/')) {
      if (f.size > 10 * 1024 * 1024) return fail('Video maksimal 10 MB');
      return sendFile(f);
    }
    setBusy(true);
    const b = await compressImage(f);
    setBusy(false);
    await upload(b, 'image', b === f ? (f.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 5) : 'jpg');
  };
  const request = async () => {
    const a = Number(amt); if (!(a > 0)) return fail('Enter BIX amount');
    setBusy(true);
    const { data, error } = await supabase.rpc('bix_chat_request' as never, { p_to: peer.id, p_amount: a, p_note: note } as never);
    setBusy(false);
    if (error) return fail(error.message);
    setPayOpen(false); setAmt(''); setNote(''); added(data);
  };
  const reqAct = async (m: Msg, a: 'pay' | 'decline' | 'cancel') => {
    if (a === 'pay' && !window.confirm(`Pay ${fmtBix(m.meta?.amount)} BIX to @${name} via BIX PAY?`)) return;
    setBusy(true);
    const { data, error } = await supabase.rpc('bix_chat_request_act' as never, { p_id: m.id, p_action: a } as never);
    setBusy(false);
    if (error) return fail(error.message);
    const st = a === 'pay' ? 'paid' : a === 'decline' ? 'declined' : 'cancelled';
    setMsgs(l => l.map(x => x.id === m.id ? { ...x, meta: { ...x.meta, status: st } } : x));
    if (a === 'pay') { try { navigator.vibrate?.(20); } catch { /* optional */ } added(data); }
  };
  const react = async (m: Msg, e: string) => {
    setMenu(null);
    const { data, error } = await supabase.rpc('bix_chat_react' as never, { p_id: m.id, p_emoji: e } as never);
    if (error) return fail(error.message);
    setMsgs(l => l.map(x => x.id === m.id ? { ...x, reactions: (data as Record<string, string> | null) ?? {} } : x));
  };
  const pin = async (m: Msg, on: boolean) => {
    setMenu(null);
    const { error } = await supabase.rpc('bix_chat_pin' as never, { p_id: m.id, p_pin: on } as never);
    if (error) return fail(error.message);
    const now = new Date().toISOString();
    setMsgs(l => l.map(x => x.id === m.id ? { ...x, pinned_at: on ? now : null } : on ? { ...x, pinned_at: null } : x));
  };
  const [ok, setOk] = useState('');
  const toastOk = (t: string) => { setOk(t); setTimeout(() => setOk(''), 2500); };

  // long-press to open the message menu
  const press = useRef<number | undefined>(undefined);
  const holdStart = (m: Msg) => { if (m.deleted_at) return; press.current = window.setTimeout(() => { try { navigator.vibrate?.(12); } catch { /* optional */ } setMenu(m); }, 420); };
  const holdEnd = () => { window.clearTimeout(press.current); };
  const findMsg = (id?: string | null) => msgs.find(x => x.id === id);
  const pinned = msgs.find(x => x.pinned_at && !x.deleted_at);
  const jump = (id: string) => document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  return <main ref={roomRef} className="comm-room is-full mx-auto max-w-xl">
    <header className="comm-room-head">
      <button onClick={async () => { await supabase.rpc('bix_chat_read' as never, { p_peer: peer.id } as never); onBack(); }} aria-label="Back"><ArrowLeft size={18}/></button>
      <BixAvatar userId={peer.id} name={name} online={state.online}/>
      <span className="min-w-0 flex-1"><b className="block truncate text-sm">@{name}</b><small className={`comm-status${state.typing ? ' is-typing' : state.online ? ' is-online' : ' is-off'}`}><i/>{seenText(state)}</small>{peerCard?.status_text && <em className="comm-statusline">{peerCard.status_text}</em>}</span>
      <ActionButtons peerId={peer.id} name={name} tier={tier} canCall={canCall} onChat={() => {}}/>
    </header>
    {pinned && <button type="button" className="comm-pinbar" onClick={() => jump(pinned.id)}><b>📌 Disematkan</b><span>{pinned.body}</span></button>}
    <div className="comm-msgs">
      {msgs.length === 0 && <p className="text-center text-xs text-muted-foreground">Mulai percakapan dengan @{name}</p>}
      {[...msgs.map(m => ({ at: m.created_at, m, c: null as Row | null })), ...calls.map(c => ({ at: c.created_at, m: null as Msg | null, c }))].sort((a, b) => a.at.localeCompare(b.at)).map(({ m, c }) => {
        if (c) { const out = c.caller_id === me; const missed = ['missed', 'declined', 'cancelled', 'ringing'].includes(c.status); return <div key={`call-${c.id}`} className={`comm-calllog ${missed ? 'is-missed' : ''}`}>
          <span>{c.kind === 'video' ? <Video size={14}/> : <Phone size={14}/>}{missed ? (out ? 'Panggilan tidak dijawab' : 'Panggilan tak terjawab') : out ? 'Panggilan keluar' : 'Panggilan masuk'} · {c.kind === 'video' ? 'Video' : 'Suara'}</span>
          <small>{new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
          <button type="button" aria-label="Panggil balik" onClick={() => startBixCall(peer.id, name, c.kind === 'video' ? 'video' : 'voice')}>Panggil balik</button>
        </div>; }
        if (!m) return null;
        const mine = m.sender_id === me;
        const q = m.reply_to ? findMsg(m.reply_to) : undefined;
        return <p key={m.id} id={`msg-${m.id}`} onDoubleClick={() => { if (!m.deleted_at && !locked) void react(m, '❤️'); }} className={`${mine ? 'is-me' : ''}${m.kind && m.kind !== 'text' ? ' is-media' : ''}${m.deleted_at ? ' is-deleted' : ''}`}
          onPointerDown={() => holdStart(m)} onPointerUp={holdEnd} onPointerLeave={holdEnd} onContextMenu={e => { e.preventDefault(); if (!m.deleted_at) setMenu(m); }}>
          {m.forwarded && !m.deleted_at && <em className="comm-fwd">↪ Diteruskan</em>}
          {m.reply_to && !m.deleted_at && <span className="comm-quote"><b>{q ? (q.sender_id === me ? 'Anda' : `@${name}`) : 'Balasan'}</b>{q?.deleted_at ? 'Pesan dihapus' : q?.body ?? m.reply_body ?? 'Pesan sebelumnya'}</span>}
          {m.deleted_at ? <span>🚫 {mine ? 'Anda menghapus pesan ini' : 'Pesan ini telah dihapus'}</span> : m.kind && m.kind !== 'text' ? <ChatMedia m={m} me={me} onAct={(x, a) => void reqAct(x, a)}/> : m.body}
          <small>{m.pinned_at && '📌 '}{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{mine && !m.deleted_at && <span className={`comm-tick ${m.read_at ? 'is-read' : m.delivered_at ? 'is-delivered' : 'is-sent'}`} aria-label={m.read_at ? 'Dibaca (centang 2 hijau)' : m.delivered_at ? 'Diterima perangkat' : 'Terkirim, penerima offline'}>{m.read_at || m.delivered_at ? ' ✓✓' : ' ✓'}</span>}</small>
          {!m.deleted_at && Object.keys(m.reactions ?? {}).length > 0 && <span className="comm-reacts">{Object.entries(Object.values(m.reactions ?? {}).reduce<Record<string, number>>((a, e) => { a[e] = (a[e] ?? 0) + 1; return a; }, {})).map(([e, n]) => <button type="button" key={e} className={m.reactions?.[me] === e ? 'is-mine' : ''} onClick={ev => { ev.stopPropagation(); void react(m, e); }}>{e}{n > 1 && <i>{n}</i>}</button>)}</span>}
          {!m.deleted_at && <button type="button" className="comm-more" aria-label="Opsi pesan" onClick={() => setMenu(m)}>⋯</button>}
        </p>;
      })}
      {state.typing && <p className="comm-typing" aria-live="polite"><i/><i/><i/></p>}
      <div ref={end}/>
    </div>
    {err && <p className="comm-err">{err}</p>}
    {ok && <p className="comm-busy">{ok}</p>}
    {busy && <p className="comm-busy">Mengirim…</p>}
    {menu && <div className="comm-sheet-bg" onClick={() => setMenu(null)}><div className="comm-sheet" role="menu" onClick={e => e.stopPropagation()}>
      <p className="comm-sheet-preview">{menu.body}</p>
      <div className="comm-reactbar">{REACTS.map(e => <button type="button" key={e} className={menu.reactions?.[me] === e ? 'is-mine' : ''} onClick={() => void react(menu, e)} aria-label={`Reaksi ${e}`}>{e}</button>)}</div>
      <button type="button" onClick={() => { setReplyTo(menu); setMenu(null); }} disabled={locked}>↩ Balas</button>
      {menu.kind !== 'pay' && menu.kind !== 'request' && menu.kind !== 'file' && <button type="button" onClick={() => { setFwd(menu); setMenu(null); }} disabled={locked}>↪ Teruskan</button>}
      {(!menu.kind || menu.kind === 'text') && <button type="button" onClick={() => { void navigator.clipboard?.writeText(menu.body); setMenu(null); toastOk('Disalin'); }}>⧉ Salin</button>}
      <button type="button" onClick={() => void pin(menu, !menu.pinned_at)}>📌 {menu.pinned_at ? 'Lepas sematan' : 'Sematkan'}</button>
      <button type="button" onClick={() => void remove(menu, false)}>🗑 Hapus untuk saya</button>
      {menu.sender_id === me && menu.kind !== 'pay' && <button type="button" className="danger" onClick={() => void remove(menu, true)}>🗑 Hapus untuk semua</button>}
      <button type="button" className="ghost" onClick={() => setMenu(null)}>Batal</button>
    </div></div>}
    {fwd && <ForwardSheet me={me} msg={fwd} onPick={to => void forward(fwd, to)} onClose={() => setFwd(null)}/>}
    {payOpen && <div className="comm-payform"><div className="comm-paytabs"><button type="button" className={payMode === 'send' ? 'is-on' : ''} onClick={() => setPayMode('send')}>🪙 Kirim BIX</button><button type="button" className={payMode === 'request' ? 'is-on' : ''} onClick={() => setPayMode('request')}>🧾 Minta BIX</button></div><input inputMode="decimal" value={amt} onChange={e => setAmt(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="Jumlah BIX" className="comm-input"/><input value={note} onChange={e => setNote(e.target.value)} maxLength={120} placeholder="Catatan (opsional)" className="comm-input"/><div><button type="button" onClick={() => setPayOpen(false)}>Batal</button><button type="button" className="comm-save" onClick={() => void (payMode === 'send' ? pay() : request())} disabled={busy}>{payMode === 'send' ? 'Kirim BIX' : 'Kirim Tagihan'}</button></div><small>{payMode === 'send' ? 'Transfer instan lewat BIX PAY dari saldo BIX Wallet Anda.' : `@${name} menerima kartu tagihan dan bisa membayar dengan satu ketukan.`}</small></div>}
    {replyTo && <div className="comm-replybar"><span><b>↩ Membalas {replyTo.sender_id === me ? 'diri sendiri' : `@${name}`}</b>{replyTo.body}</span><button type="button" aria-label="Batal balas" onClick={() => setReplyTo(null)}>✕</button></div>}
    {!locked && !recording && !replyTo && <div className="comm-quick">{QUICK.map(q => <button key={q} type="button" onClick={() => onType(text ? `${text} ${q}` : q)}>{q}</button>)}</div>}
    <form className="comm-compose" onSubmit={e => { e.preventDefault(); void send(); }}>
      <span className="bc-plus-wrap"><button type="button" aria-label="Lampiran" aria-expanded={menuOpen} className="bc-plus" onClick={() => setMenuOpen(v => !v)} disabled={locked}>{menuOpen ? '×' : '+'}</button></span>
      {menuOpen && <div className="bc-attach-bg" onClick={() => setMenuOpen(false)}><div className="bc-attach" role="menu" onClick={e => e.stopPropagation()}>
        <button type="button" onClick={() => { setMenuOpen(false); setPayOpen(true); }}><i className="is-gold"><Coins size={20}/></i>Kirim BIX</button>
        <button type="button" disabled={busy} onClick={() => { setMenuOpen(false); fileRef.current?.click(); }}><i className="is-violet"><ImagePlus size={20}/></i>Foto & Video</button>
        <button type="button" disabled={busy} onClick={() => { setMenuOpen(false); camRef.current?.click(); }}><i className="is-teal"><Camera size={20}/></i>Kamera</button>
        <button type="button" disabled={busy} onClick={() => { setMenuOpen(false); docRef.current?.click(); }}><i className="is-blue"><Paperclip size={20}/></i>Dokumen</button>
      </div></div>}
      <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void sendPicked(f); }}/>
      <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void sendPicked(f); }}/>
      <input ref={docRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.zip" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void sendFile(f); }}/>
      {recording ? <span className="comm-rec"><i/>Merekam… ketuk ■ untuk kirim</span> : <input value={text} onChange={e => onType(e.target.value)} maxLength={1000} placeholder={tier && !tier.chat ? 'Chat terkunci' : 'Tulis pesan…'} disabled={locked} aria-label="Tulis pesan"/>}
      {text.trim() ? <button type="submit" aria-label="Kirim"><Send size={16}/></button> : <button type="button" aria-label={recording ? 'Stop & kirim' : 'Rekam pesan suara'} className={recording ? 'is-rec' : ''} onClick={() => void toggleRec()} disabled={locked || busy}>{recording ? <Square size={14}/> : <Mic size={16}/>}</button>}
    </form>
  </main>;
}

function ForwardSheet({ me, msg, onPick, onClose }: { me: string; msg: Msg; onPick: (to: { id: string; name: string }) => void; onClose: () => void }) {
  const [threads, setThreads] = useState<Thread[] | null>(null);
  useEffect(() => { void supabase.rpc('bix_chat_threads' as never).then(({ data }) => setThreads((data as Thread[] | null) ?? [])); }, []);
  return <div className="comm-sheet-bg" onClick={onClose}><div className="comm-sheet" role="dialog" aria-label="Teruskan pesan" onClick={e => e.stopPropagation()}>
    <b className="comm-sheet-title">↪ Teruskan ke…</b>
    <p className="comm-sheet-preview">{msg.body}</p>
    {threads === null ? <small>Loading…</small> : threads.filter(t => t.peer !== me).length === 0 ? <small>Belum ada percakapan lain.</small> :
      <ul className="comm-fwd-list">{threads.filter(t => t.peer !== me).map(t => <li key={t.peer}><button type="button" onClick={() => onPick({ id: t.peer, name: t.name })}><span className={`comm-ava${t.online ? ' is-online' : ''}`}>{t.name.slice(0, 1).toUpperCase()}</span><b>@{t.name}</b></button></li>)}</ul>}
    <button type="button" className="ghost" onClick={onClose}>Batal</button>
  </div></div>;
}

/** My BIX-ID QR + scanner: scanning another member's QR saves them straight into this device's contacts. */
function ContactQr() {
  const [open, setOpen] = useState(false);
  const [scan, setScan] = useState(false);
  const [msg, setMsg] = useState('');
  const [hit, setHit] = useState<{ id: string; name: string; code: string } | null>(null);
  const load = useServerFn(getBixPay);
  const mine = useQuery({ queryKey: ['bix-pay'], queryFn: () => load(), enabled: open });
  const code = mine.data?.code ?? '';
  const saveFrom = async (raw: string) => {
    const id = parseBixId(raw);
    if (!id) { setMsg('QR ini bukan BIX-ID member.'); return; }
    const { data } = await supabase.rpc('bix_call_find' as never, { p_query: id } as never);
    const f = data as { user_id: string; name: string } | null;
    if (!f) { setMsg(`${id} tidak ditemukan.`); return; }
    if (id === code) { setMsg('Itu BIX-ID Anda sendiri.'); return; }
    const c = (f as { code?: string }).code ?? id;
    addContact({ id: f.user_id, name: f.name, code: c }); setHit({ id: f.user_id, name: f.name, code: c }); setScan(false); setOpen(false); window.dispatchEvent(new CustomEvent('bix-find', { detail: c })); try { navigator.vibrate?.(20); } catch { /* optional */ }
    setMsg(`@${f.name} (${id}) tersimpan di kontak.`);
  };
  return <>
    <button type="button" className="bc-qr-btn" aria-label="QR kontak BIX-ID" onClick={() => { setMsg(''); setHit(null); setOpen(true); }}><QrCode size={18}/></button>
    {open && createPortal(<div className="bc-qr-overlay" onClick={() => setOpen(false)}>
      <div role="dialog" aria-label="QR kontak" className="bc-qr-card" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between"><b className="font-display text-sm tracking-widest">BIX CALL · QR KONTAK</b><button type="button" aria-label="Close" onClick={() => setOpen(false)}><X size={18}/></button></div>
        <div className="pay-qr-plate mt-4">{code ? <QRCodeSVG value={code} size={220} level="M" marginSize={0} className="bc-qr-svg"/> : <div className="grid size-[200px] place-items-center text-xs text-muted-foreground">Memuat…</div>}</div>
        <p className="numeric mt-3 text-center text-lg font-black text-chart-3">{code || '—'}</p>
        <p className="mt-1 text-center text-[11px] text-muted-foreground">Member lain memindai QR ini untuk menyimpan BIX-ID Anda sebagai kontak.</p>
        <button type="button" className="bc-qr-scan mt-4" onClick={() => setScan(true)}><ScanLine size={16}/> Pindai & simpan kontak</button>
        {msg && <p role="status" className="mt-3 text-center text-xs text-chart-2">{msg}</p>}
        {hit && <div className="bc-qr-hit"><b>@{hit.name}</b><small>{hit.code}</small><div>
          <button type="button" onClick={() => { setOpen(false); window.location.assign(`/call?chat=${hit.id}&n=${encodeURIComponent(hit.name)}`); }}><MessageCircle size={14}/> Chat</button>
          <button type="button" onClick={() => { setOpen(false); startBixCall(hit.id, hit.name, 'voice'); }}><Phone size={14}/> Call</button>
          <Link to="/pay" onClick={() => setOpen(false)}><Coins size={14}/> BIX PAY</Link></div></div>}
      </div></div>, document.body)}
    {scan && <QrScanner title="Pindai QR BIX-ID" hint={msg || 'Arahkan kamera ke QR BIX-ID member'} continuous onClose={() => setScan(false)} onResult={raw => void saveFrom(raw)}/>}
  </>;
}

function SavedContacts({ onChat }: { onChat: (id: string, name: string) => void }) {
  const [list, setList] = useState<BixContact[]>([]);
  useEffect(() => { const r = () => setList(readContacts()); r(); window.addEventListener(CONTACTS_EVENT, r); return () => window.removeEventListener(CONTACTS_EVENT, r); }, []);
  if (!list.length) return null;
  return <section className="comm-card"><h3 className="comm-h"><UserPlus size={13} className="mr-1 inline"/>Kontak tersimpan</h3>
    {list.map(c => <div key={c.id} className="comm-peer"><BixAvatar userId={c.id} name={c.name}/><span className="min-w-0 flex-1"><b className="block truncate">@{c.name}</b><span className="comm-meta"><small className="numeric">{c.code}</small></span></span>
      <span className="comm-actions"><button aria-label="Chat" onClick={() => onChat(c.id, c.name)}><MessageCircle size={15}/></button><button aria-label="Hapus kontak" onClick={() => removeContact(c.id)}><Trash2 size={14}/></button></span></div>)}
  </section>;
}
