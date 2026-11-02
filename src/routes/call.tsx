import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { PhoneCall, Search, ShieldCheck, MessageCircle, Phone, Video, Lock, Send, ArrowLeft, Crown, ImagePlus, Mic, Square, Coins } from 'lucide-react';
import { MemberGate } from '@/components/MemberGate';
import { startBixCall, enableBixNotifications } from '@/components/BixCall';
import { useMember } from '@/lib/useMember';
import { supabase } from '@/integrations/supabase/client';
import { BixShell } from '@/components/BixShell';
import heroImg from '@/assets/bixcall-hero-3d.jpg';

export const Route = createFileRoute('/call')({
  head: () => ({ meta: [{ title: 'BIX CALL & CHAT — BIXLINK' }, { name: 'description', content: 'Private chat, voice and video calls between BIXLINK members, unlocked by staking tier.' }, { property: 'og:title', content: 'BIX CALL & CHAT — BIXLINK' }, { property: 'og:description', content: 'Secure member-to-member chat and calls inside BIXLINK.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: CallPage,
});

type Peer = { user_id: string; name: string; whatsapp?: string | null; can_call: boolean };
type Row = { id: string; caller_id: string; callee_id: string; kind: string; status: string; created_at: string };
type Tier = { stake: number; chat: boolean; voice: boolean; video: boolean; vip: boolean; tier: string; chat_enabled: boolean; min: { chat: number; voice: number; video: number; vip: number } };
type Thread = { peer: string; name: string; body: string; at: string; mine: boolean; unread: number };
type Msg = { id: string; sender_id: string; recipient_id: string; body: string; created_at: string; read_at: string | null; kind?: string; media_path?: string | null; meta?: { amount?: number; note?: string | null } | null };
const urlCache = new Map<string, string>();
function ChatMedia({ m }: { m: Msg }) {
  const [url, setUrl] = useState(m.media_path ? urlCache.get(m.media_path) ?? '' : '');
  useEffect(() => { const p = m.media_path; if (!p || url) return; void supabase.storage.from('bix-chat').createSignedUrl(p, 3600).then(({ data }) => { if (data?.signedUrl) { urlCache.set(p, data.signedUrl); setUrl(data.signedUrl); } }); }, [m.media_path, url]);
  if (m.kind === 'pay') return <span className="comm-paycard"><b>🪙 {Number(m.meta?.amount ?? 0).toLocaleString('en-US', { maximumFractionDigits: 4 })} BIX</b><small>BIX PAY · terkirim{m.meta?.note ? ` · ${m.meta.note}` : ''}</small></span>;
  if (!url) return <span className="comm-media-wait">Memuat…</span>;
  if (m.kind === 'image') return <a href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt="Foto chat" className="comm-img" loading="lazy"/></a>;
  return <audio src={url} controls preload="none" className="comm-audio"/>;
}
const PERMS = [['all', 'Semua member'], ['friends', 'Saling follow'], ['network', 'Tim jaringan'], ['none', 'Tidak menerima']] as const;
const TIER_LABEL: Record<string, string> = { free: 'FREE · Chat', voice: 'CALLER · Suara', video: 'PRO · Video HD', vip: '👑 VIP CALLER' };

function CallPage() {
  const { user, ready } = useMember();
  const [perm, setPerm] = useState<string>('granted');
  useEffect(() => { setPerm(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission); }, []);
  const back = () => { if (window.history.length > 1) window.history.back(); else window.location.href = '/'; };
  return <BixShell><div className="bixcall-page">
    <button type="button" className="bixcall-back" aria-label="Kembali" onClick={back}><ArrowLeft size={18}/></button>
    <section className="bixcall-hero"><img src={heroImg} alt="BIX CALL 3D" width={1024} height={640}/><div><b>BIX CALL</b><small>Chat · Suara · Video — khusus member BIXLINK</small></div></section>
    {perm === 'default' && <button type="button" className="bixcall-notify" onClick={() => void enableBixNotifications().then(p => setPerm(String(p)))}>🔔 Aktifkan notifikasi chat & panggilan</button>}
    <MemberGate ready={ready} signedIn={!!user} title="BIX CALL"><CallInner/></MemberGate>
  </div></BixShell>;
}

function CallInner() {
  const [me, setMe] = useState('');
  const [tab, setTab] = useState<'chat' | 'call' | 'privacy'>('chat');
  const [tier, setTier] = useState<Tier | null>(null);
  const [chatWith, setChatWith] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => { void (async () => {
    const { data: u } = await supabase.auth.getUser(); setMe(u.user?.id ?? '');
    const { data } = await supabase.rpc('bix_comm_me' as never); setTier(data as Tier | null);
    const sp = new URLSearchParams(window.location.search); const c = sp.get('chat');
    if (c) setChatWith({ id: c, name: sp.get('n') ?? 'Member' });
  })(); }, []);

  if (chatWith) return <ChatRoom me={me} peer={chatWith} tier={tier} onBack={() => setChatWith(null)}/>;

  return <main className="mx-auto max-w-xl px-4 py-5">
    <header className="comm-head">
      <span className="hub-emblem"><PhoneCall size={20}/></span>
      <div className="min-w-0 flex-1"><h1 className="hub-title font-display text-lg font-black tracking-widest">BIX CALL & CHAT</h1>
        <p className="comm-status"><i/>QUANTUM ENCRYPTED · LINE READY</p></div>
      {tier && <span className={`comm-tier is-${tier.tier}`}>{TIER_LABEL[tier.tier]}</span>}
    </header>

    <nav className="comm-tabs" role="tablist">
      {([['chat', MessageCircle, 'Chat'], ['call', Phone, 'Panggilan'], ['privacy', ShieldCheck, 'Privasi']] as const).map(([k, I, l]) =>
        <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'is-on' : ''} onClick={() => setTab(k)}><I size={15}/>{l}</button>)}
    </nav>

    {tab === 'chat' && <ChatTab me={me} tier={tier} onOpen={(id, name) => setChatWith({ id, name })}/>}
    {tab === 'call' && <CallTab me={me} tier={tier} onChat={(id, name) => setChatWith({ id, name })}/>}
    {tab === 'privacy' && <PrivacyTab tier={tier}/>}
  </main>;
}

type Found = Peer & { code?: string | null; via?: string };
const VIA: Record<string, string> = { id: 'BIX-ID', username: 'Username', whatsapp: 'WhatsApp' };
function FindMember({ me, tier, onChat }: { me: string; tier: Tier | null; onChat: (id: string, name: string) => void }) {
  const [q, setQ] = useState('');
  const [found, setFound] = useState<Found | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => { try { setRecent(JSON.parse(localStorage.getItem('bixcall-recent') ?? '[]')); } catch { /* ignore */ } }, []);
  const find = async (term = q) => {
    const t = term.trim(); if (t.length < 3) return;
    setBusy(true); setQ(t);
    const { data } = await supabase.rpc('bix_call_find' as never, { p_query: t } as never);
    setBusy(false); setFound((data as Found | null) ?? null);
    if (data) { const r = [t, ...recent.filter(x => x !== t)].slice(0, 3); setRecent(r); localStorage.setItem('bixcall-recent', JSON.stringify(r)); }
  };
  const copy = (c: string) => { void navigator.clipboard?.writeText(c); try { navigator.vibrate?.(10); } catch { /* optional */ } };
  return <section className="comm-card">
    <h3 className="comm-h">Lacak member</h3>
    <div className="comm-search"><Search size={15}/><input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && void find()} placeholder="BIX-ID, @username atau no. WA"/>
      {q && <button type="button" className="comm-clear" aria-label="Hapus" onClick={() => { setQ(''); setFound(undefined); }}>✕</button>}
      <button onClick={() => void find()} disabled={busy}>{busy ? '…' : 'Cari'}</button></div>
    <div className="comm-chips"><span>BIX-ID</span><span>@Username</span><span>No. WA</span>
      {recent.map(r => <button key={r} onClick={() => void find(r)}>↺ {r}</button>)}</div>
    {found === null && <p className="mt-2 text-xs text-muted-foreground">Member tidak ditemukan. Nomor WA hanya bisa dilacak jika pemiliknya mengaktifkan tombol WhatsApp.</p>}
    {found && <div className="comm-peer"><span className="comm-ava">{found.name.slice(0, 1).toUpperCase()}</span>
      <span className="min-w-0 flex-1"><b className="block truncate">@{found.name}</b>
        <span className="comm-meta">{found.code && <button onClick={() => copy(found.code!)}>{found.code} ⧉</button>}{found.whatsapp && <i>WA terhubung</i>}{found.via && <small>via {VIA[found.via]}</small>}</span></span>
      {found.user_id === me ? <small>Akun Anda</small> : <ActionButtons peerId={found.user_id} name={found.name} tier={tier} canCall={found.can_call} onChat={onChat}/>}</div>}
  </section>;
}

function ActionButtons({ peerId, name, tier, canCall, onChat }: { peerId: string; name: string; tier: Tier | null; canCall: boolean; onChat: (id: string, name: string) => void }) {
  const [hint, setHint] = useState('');
  const call = (k: 'voice' | 'video') => {
    if (!tier?.[k]) { setHint(`Butuh staking aktif $${tier?.min[k] ?? '-'} untuk ${k === 'voice' ? 'panggilan suara' : 'video call'}`); setTimeout(() => setHint(''), 3500); return; }
    if (!canCall) { setHint('Member ini tidak menerima panggilan dari Anda'); setTimeout(() => setHint(''), 3500); return; }
    startBixCall(peerId, name, k);
  };
  return <span className="comm-actions">
    <button aria-label="Chat" onClick={() => onChat(peerId, name)}><MessageCircle size={15}/></button>
    <button aria-label="Panggilan suara" className={tier?.voice ? '' : 'is-locked'} onClick={() => call('voice')}>{tier?.voice ? <Phone size={15}/> : <Lock size={13}/>}</button>
    <button aria-label="Video call" className={tier?.video ? '' : 'is-locked'} onClick={() => call('video')}>{tier?.video ? <Video size={15}/> : <Lock size={13}/>}</button>
    {hint && <em className="comm-hint">{hint} · <Link to="/stake">Staking</Link></em>}
  </span>;
}

function ChatTab({ me, tier, onOpen }: { me: string; tier: Tier | null; onOpen: (id: string, name: string) => void }) {
  const [threads, setThreads] = useState<Thread[] | null>(null);
  useEffect(() => {
    const load = async () => { const { data } = await supabase.rpc('bix_chat_threads' as never); setThreads((data as Thread[] | null) ?? []); };
    void load(); const t = setInterval(() => void load(), 6000); return () => clearInterval(t);
  }, []);
  return <>
    {tier && !tier.chat && <p className="comm-lock"><Lock size={13}/>{tier.chat_enabled ? `BIX CHAT terbuka mulai staking $${tier.min.chat}.` : 'BIX CHAT sedang ditutup Admin.'}</p>}
    <FindMember me={me} tier={tier} onChat={onOpen}/>
    <section className="comm-card"><h3 className="comm-h">Percakapan</h3>
      {threads === null ? <p className="text-xs text-muted-foreground">Memuat…</p> : threads.length === 0 ? <p className="text-xs text-muted-foreground">Belum ada chat. Cari member di atas untuk mulai mengobrol.</p> :
        <ul className="comm-list">{threads.map(t => <li key={t.peer}><button onClick={() => onOpen(t.peer, t.name)}><span className="comm-ava">{t.name.slice(0, 1).toUpperCase()}</span>
          <span className="min-w-0 flex-1 text-left"><b className="block truncate text-sm">@{t.name}</b><small className="block truncate text-muted-foreground">{t.mine ? 'Anda: ' : ''}{t.body}</small></span>
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
  return <>
    <TierLadder tier={tier}/>
    <FindMember me={me} tier={tier} onChat={onChat}/>
    <section className="comm-card"><h3 className="comm-h">Riwayat panggilan</h3>
      {hist.length === 0 ? <p className="text-xs text-muted-foreground">Belum ada panggilan.</p> : <ul className="comm-list">{hist.map(h => <li key={h.id} className="comm-row">
        <span className={`comm-dir ${h.status === 'missed' || h.status === 'declined' ? 'is-miss' : ''}`}>{h.caller_id === me ? '↗' : '↙'}</span>
        <span className="min-w-0 flex-1"><b className="block truncate text-sm">@{h.peer}</b><small className="text-muted-foreground">{h.kind === 'video' ? 'Video' : 'Suara'} · {h.status === 'missed' ? 'Tidak terjawab' : h.status === 'declined' ? 'Ditolak' : h.status === 'ended' ? 'Selesai' : h.status} · {new Date(h.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</small></span>
        <ActionButtons peerId={h.peerId} name={h.peer} tier={tier} canCall={h.canCall} onChat={onChat}/></li>)}</ul>}
    </section>
  </>;
}

function TierLadder({ tier }: { tier: Tier | null }) {
  if (!tier) return null;
  const steps = [['chat', MessageCircle, 'Chat', tier.min.chat], ['voice', Phone, 'Suara', tier.min.voice], ['video', Video, 'Video HD', tier.min.video], ['vip', Crown, 'VIP', tier.min.vip]] as const;
  return <section className="comm-card"><h3 className="comm-h">Fasilitas paket Anda · staking ${Number(tier.stake).toFixed(0)}</h3>
    <div className="comm-ladder">{steps.map(([k, I, l, m]) => <div key={k} className={tier[k] ? 'is-on' : ''}><I size={16}/><b>{l}</b><small>{Number(m) > 0 ? `$${m}+` : 'Gratis'}</small>{!tier[k] && <Lock size={10} className="comm-ladder-lock"/>}</div>)}</div>
    {!tier.vip && <Link to="/stake" className="comm-upgrade">Naikkan paket staking untuk membuka fasilitas berikutnya →</Link>}
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
    setMsg(error ? error.message : 'Pengaturan tersimpan'); setTimeout(() => setMsg(''), 3000);
  };
  return <>
    <TierLadder tier={tier}/>
    <section className="comm-card">
      <h3 className="comm-h">Siapa yang boleh menghubungi saya</h3>
      <div className="comm-perms">{PERMS.map(([v, l]) => <button key={v} onClick={() => setPerm(v)} className={perm === v ? 'is-on' : ''}>{l}</button>)}</div>
      <h3 className="comm-h mt-4">Nomor HP / WhatsApp</h3>
      <input value={wa} onChange={e => setWa(e.target.value)} inputMode="tel" placeholder="+628123456789" className="comm-input"/>
      <label className="comm-check"><input type="checkbox" checked={pub} onChange={e => setPub(e.target.checked)}/>Tampilkan tombol WhatsApp ke penelepon</label>
      <button onClick={() => void save()} className="comm-save">Simpan</button>
      {msg && <p className="mt-2 text-center text-xs">{msg}</p>}
      <p className="mt-3 flex items-start gap-1.5 text-[10px] text-muted-foreground"><ShieldCheck size={12} className="mt-0.5 shrink-0"/>Chat dan panggilan tersambung lewat akun BIXLINK; nomor Anda tidak pernah dibagikan kecuali Anda mengaktifkan tombol WhatsApp.</p>
    </section>
  </>;
}

function ChatRoom({ me, peer, tier, onBack }: { me: string; peer: { id: string; name: string }; tier: Tier | null; onBack: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [canCall, setCanCall] = useState(false);
  const [name, setName] = useState(peer.name);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const locked = !!tier && !tier.chat;

  useEffect(() => {
    void supabase.rpc('bix_call_peer' as never, { p_user: peer.id } as never).then(({ data }) => { const p = data as Peer | null; if (p) { setCanCall(p.can_call); setName(p.name); } });
    const load = async () => {
      const { data } = await supabase.from('bix_messages' as never).select('*').or(`and(sender_id.eq.${me},recipient_id.eq.${peer.id}),and(sender_id.eq.${peer.id},recipient_id.eq.${me})`).order('created_at', { ascending: false }).limit(80);
      setMsgs(((data as Msg[] | null) ?? []).reverse());
      void supabase.rpc('bix_chat_read' as never, { p_peer: peer.id } as never);
    };
    if (!me) return;
    void load(); const t = setInterval(() => void load(), 3000); return () => clearInterval(t);
  }, [me, peer.id]);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs.length]);

  const send = async () => {
    const b = text.trim(); if (!b) return;
    setText('');
    const { data, error } = await supabase.rpc('bix_chat_send' as never, { p_to: peer.id, p_body: b } as never);
    if (error) { setErr(error.message); setText(b); setTimeout(() => setErr(''), 4000); return; }
    setMsgs(m => [...m, data as unknown as Msg]);
  };
  const fail = (e: string) => { setErr(e); setTimeout(() => setErr(''), 4000); };
  const upload = async (blob: Blob, kind: 'image' | 'voice', ext: string) => {
    if (blob.size > 10 * 1024 * 1024) return fail('File maksimal 10 MB');
    setBusy(true);
    const path = `${me}/${peer.id}/${crypto.randomUUID()}.${ext}`;
    const up = await supabase.storage.from('bix-chat').upload(path, blob, { contentType: blob.type || 'application/octet-stream' });
    if (up.error) { setBusy(false); return fail(up.error.message); }
    const { data, error } = await supabase.rpc('bix_chat_send_media' as never, { p_to: peer.id, p_kind: kind, p_path: path, p_body: '' } as never);
    setBusy(false);
    if (error) return fail(error.message);
    setMsgs(m => [...m, data as unknown as Msg]);
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
    } catch { fail('Izin mikrofon ditolak'); }
  };
  const [payOpen, setPayOpen] = useState(false);
  const [amt, setAmt] = useState('');
  const [note, setNote] = useState('');
  const pay = async () => {
    const a = Number(amt); if (!(a > 0)) return fail('Masukkan jumlah BIX');
    setBusy(true);
    const { data, error } = await supabase.rpc('bix_chat_pay' as never, { p_to: peer.id, p_amount: a, p_note: note } as never);
    setBusy(false);
    if (error) return fail(error.message);
    setPayOpen(false); setAmt(''); setNote(''); try { navigator.vibrate?.(20); } catch { /* optional */ }
    setMsgs(m => [...m, data as unknown as Msg]);
  };

  return <main className="comm-room mx-auto max-w-xl">
    <header className="comm-room-head">
      <button onClick={onBack} aria-label="Kembali"><ArrowLeft size={18}/></button>
      <span className="comm-ava">{name.slice(0, 1).toUpperCase()}</span>
      <span className="min-w-0 flex-1"><b className="block truncate text-sm">@{name}</b><small className="comm-status"><i/>ENCRYPTED CHAT</small></span>
      <ActionButtons peerId={peer.id} name={name} tier={tier} canCall={canCall} onChat={() => {}}/>
    </header>
    <div className="comm-msgs">
      {msgs.length === 0 && <p className="text-center text-xs text-muted-foreground">Mulai percakapan dengan @{name}</p>}
      {msgs.map(m => <p key={m.id} className={`${m.sender_id === me ? 'is-me' : ''}${m.kind && m.kind !== 'text' ? ' is-media' : ''}`}>{m.kind && m.kind !== 'text' ? <ChatMedia m={m}/> : m.body}<small>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{m.sender_id === me && (m.read_at ? ' ✓✓' : ' ✓')}</small></p>)}
      <div ref={end}/>
    </div>
    {err && <p className="comm-err">{err}</p>}
    {busy && <p className="comm-busy">Mengirim…</p>}
    {payOpen && <div className="comm-payform"><b>🪙 Kirim BIX ke @{name}</b><input inputMode="decimal" value={amt} onChange={e => setAmt(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="Jumlah BIX" className="comm-input"/><input value={note} onChange={e => setNote(e.target.value)} maxLength={120} placeholder="Catatan (opsional)" className="comm-input"/><div><button type="button" onClick={() => setPayOpen(false)}>Batal</button><button type="button" className="comm-save" onClick={() => void pay()} disabled={busy}>Kirim BIX</button></div><small>Transfer instan lewat BIX PAY dari saldo BIX Wallet Anda.</small></div>}
    <form className="comm-compose" onSubmit={e => { e.preventDefault(); void send(); }}>
      <button type="button" aria-label="Kirim BIX" className="comm-pay" onClick={() => setPayOpen(v => !v)} disabled={locked}><Coins size={16}/></button>
      <button type="button" aria-label="Kirim foto" className="comm-pay" onClick={() => fileRef.current?.click()} disabled={locked || busy}><ImagePlus size={16}/></button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void upload(f, 'image', (f.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 5)); }}/>
      {recording ? <span className="comm-rec"><i/>Merekam… ketuk ■ untuk kirim</span> : <input value={text} onChange={e => setText(e.target.value)} maxLength={1000} placeholder={tier && !tier.chat ? 'Chat terkunci' : 'Tulis pesan…'} disabled={locked}/>}
      {text.trim() ? <button type="submit" aria-label="Kirim"><Send size={16}/></button> : <button type="button" aria-label={recording ? 'Stop & kirim' : 'Rekam pesan suara'} className={recording ? 'is-rec' : ''} onClick={() => void toggleRec()} disabled={locked || busy}>{recording ? <Square size={14}/> : <Mic size={16}/>}</button>}
    </form>
  </main>;
}
