import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, Copy, Check, GraduationCap, LogOut, Radio, Search, Send, UserPlus, Users, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { copyText } from '@/lib/copy-text';
import { MeetingStage } from '@/components/BixGroupMeeting';
import { useSignedUrl } from '@/components/BixAvatar';
import { shrinkImage } from '@/lib/bix-avatar';
import { readContacts } from '@/lib/bix-contacts';

type Group = { id: string; name: string; about: string; code: string; live_code: string | null; owner_id: string; avatar_path: string | null };
type Msg = { id: string; sender_id: string; name: string; body: string; created_at: string };
type Cand = { id: string; code: string; name: string; src: 'Kontak' | 'Jaringan'; depth?: number };
const COLS = 'id,name,about,code,live_code,owner_id,avatar_path';
const newCode = (n = 6) => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');

function GroupAvatar({ g, size = 44 }: { g: Group; size?: number }) {
  const url = useSignedUrl('bix-avatars', g.avatar_path);
  return <span className="bx-grp-av" style={{ width: size, height: size }}>{url ? <img src={url} alt="" /> : <Users size={size * 0.42} />}</span>;
}

/** GROUP tab: education groups with group chat + a host-started Live Class (voice/video room). */
export function BixGroups({ me, createOnly }: { me: string; createOnly?: boolean }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState(''); const [about, setAbout] = useState('');
  const [code, setCode] = useState(''); const [msg, setMsg] = useState('');
  const [open, setOpen] = useState<Group | null>(null); const [fresh, setFresh] = useState(false);
  const load = async () => {
    const { data } = await supabase.from('bix_groups').select(COLS).order('created_at', { ascending: false });
    const list = (data as Group[] | null) ?? []; setGroups(list);
    setOpen(o => o ? list.find(g => g.id === o.id) ?? null : o);
  };
  useEffect(() => { void load(); const t = setInterval(() => { if (!document.hidden) void load(); }, 20000); return () => clearInterval(t); }, []);
  const create = async () => {
    setMsg(''); if (name.trim().length < 2) { setMsg('Enter a group name first.'); return; }
    const { data, error } = await supabase.from('bix_groups').insert({ owner_id: me, name: name.trim().slice(0, 60), about: about.trim().slice(0, 300), code: newCode(7) }).select(COLS).single();
    if (error) { setMsg('Failed to create group.'); return; }
    setName(''); setAbout(''); await load();
    if (data) { setFresh(true); setOpen(data as Group); }
  };
  const join = async () => {
    setMsg(''); const { error } = await supabase.rpc('bix_group_join', { p_code: code });
    if (error) { setMsg(error.message); return; } setCode(''); await load();
  };
  if (open) return <GroupRoom g={open} me={me} fresh={fresh} onBack={() => { setOpen(null); setFresh(false); void load(); }} onChange={load}/>;
  return <section className="bx-grp">
    <div className="bx-grp-card">
      <div className="bx-grp-head"><GraduationCap size={18}/><b>Education Groups</b><small>Group chat + Live Class</small></div>
      <input className="form-input" placeholder="Group name, e.g. Crypto Basics Class" value={name} maxLength={60} onChange={e => setName(e.target.value)}/>
      <input className="form-input" placeholder="Short description (optional)" value={about} maxLength={300} onChange={e => setAbout(e.target.value)}/>
      <button type="button" className="bx-grp-btn" onClick={() => void create()}>+ Create group</button>
      {!createOnly && <div className="bx-grp-row">
        <input className="form-input" placeholder="Invite code" value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7))}/>
        <button type="button" className="bx-grp-btn is-alt" disabled={code.length < 6} onClick={() => void join()}>Join</button>
      </div>}
      {msg && <p className="bx-grp-msg">{msg}</p>}
    </div>
    {createOnly ? <p className="bx-grp-empty">Setelah grup dibuat, pasang foto grup dan tambahkan member dari kontak atau jaringan Anda.</p> : groups.length === 0 ? <p className="bx-grp-empty">No groups yet. Create one or join with an invite code.</p>
      : <ul className="bx-grp-list">{groups.map(g => <li key={g.id}><button type="button" onClick={() => setOpen(g)}>
        <GroupAvatar g={g}/>
        <span className="bx-grp-meta"><b>{g.name}</b><small>{g.about || (g.owner_id === me ? 'You are the host' : 'Education group')}</small></span>
        {g.live_code && <em className="bx-grp-live"><Radio size={12}/> LIVE</em>}
      </button></li>)}</ul>}
  </section>;
}

function AddMembers({ g, onClose }: { g: Group; onClose: () => void }) {
  const [tab, setTab] = useState<'Kontak' | 'Jaringan'>(() => readContacts().length ? 'Kontak' : 'Jaringan');
  const [net, setNet] = useState<Cand[] | null>(null); const [q, setQ] = useState('');
  const [done, setDone] = useState<Record<string, string>>({}); const [busy, setBusy] = useState('');
  const contacts: Cand[] = readContacts().map(c => ({ id: c.id, code: c.code, name: c.name, src: 'Kontak' }));
  useEffect(() => { void supabase.rpc('bix_group_candidates').then(({ data }) => setNet(((data as { id: string; code: string; name: string; depth: number }[] | null) ?? []).filter(x => x.code).map(x => ({ ...x, src: 'Jaringan' as const })))); }, []);
  const list = (tab === 'Kontak' ? contacts : net ?? []).filter(c => `${c.code} ${c.name}`.toLowerCase().includes(q.trim().toLowerCase().replace(/^@/, '')));
  const add = async (query: string, key: string) => {
    setBusy(key); const { error } = await supabase.rpc('bix_group_add_member', { p_group: g.id, p_query: query });
    setBusy(''); setDone(d => ({ ...d, [key]: error ? error.message : 'ok' }));
  };
  const [pick, setPick] = useState<Record<string, string>>({});
  const toggle = (c: Cand) => setPick(p => { const n = { ...p }; if (n[c.id]) delete n[c.id]; else n[c.id] = c.code; return n; });
  const addAll = async () => { for (const [id, code] of Object.entries(pick)) await add(code, id); setPick({}); };
  const nPick = Object.keys(pick).length;
  const manual = q.trim().length >= 3 && list.length === 0;
  return <div className="bx-grp-sheet" role="dialog" aria-label="Tambah anggota">
    <div className="bx-grp-sheet-box">
      <header><b>Tambah anggota · ketuk + untuk menambah</b><button type="button" aria-label="Tutup" onClick={onClose}><X size={18}/></button></header>
      <div className="bx-grp-tabs">{(['Kontak', 'Jaringan'] as const).map(t => <button key={t} type="button" aria-pressed={tab === t} onClick={() => setTab(t)}>{t === 'Kontak' ? 'Kontak Saya' : 'Jaringan Saya'}</button>)}</div>
      <label className="bx-grp-search"><Search size={15}/><input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari nama, BIX-ID atau @username"/></label>
      <ul className="bx-grp-cands">
        {tab === 'Jaringan' && net === null && <li className="bx-grp-empty">Memuat jaringan…</li>}
        {list.map(c => { const s = done[c.id]; return <li key={c.id}>
          <input type="checkbox" aria-label={`Pilih ${c.name}`} disabled={s === 'ok'} checked={!!pick[c.id]} onChange={() => toggle(c)} style={{ width: 18, height: 18, accentColor: 'var(--primary)' }}/>
          <span className="bx-grp-av" style={{ width: 36, height: 36 }}>{c.name.slice(0, 1).toUpperCase()}</span>
          <span className="bx-grp-meta"><b>{c.name}</b><small>{c.code}{c.src === 'Jaringan' ? (c.depth === 0 ? ' · Upline' : ` · L${c.depth}`) : ''}{s && s !== 'ok' ? ` · ${s}` : ''}</small></span>
          <button type="button" className="bx-grp-btn is-alt" disabled={s === 'ok' || busy === c.id} onClick={() => void add(c.code, c.id)}>{s === 'ok' ? <Check size={14}/> : <UserPlus size={14}/>}</button>
        </li>; })}
        {!manual && list.length === 0 && (tab === 'Kontak' || net) && <li className="bx-grp-empty">{tab === 'Kontak' ? 'Belum ada kontak tersimpan.' : 'Belum ada anggota jaringan.'}</li>}
        {manual && <li><span className="bx-grp-meta"><b>Tambah “{q.trim()}”</b><small>{done['manual'] && done['manual'] !== 'ok' ? done['manual'] : 'BIX-ID atau @username'}</small></span>
          <button type="button" className="bx-grp-btn is-alt" disabled={done['manual'] === 'ok'} onClick={() => void add(q.trim(), 'manual')}>{done['manual'] === 'ok' ? <Check size={14}/> : <UserPlus size={14}/>}</button></li>}
      </ul>
      {nPick > 0 && <button type="button" className="bx-grp-btn" style={{ width: '100%', marginTop: 8 }} disabled={!!busy} onClick={() => void addAll()}><UserPlus size={14}/> Tambahkan {nPick} anggota</button>}
    </div>
  </div>;
}

function GroupRoom({ g, me, fresh, onBack, onChange }: { g: Group; me: string; fresh?: boolean; onBack: () => void; onChange: () => Promise<void> }) {
  const [msgs, setMsgs] = useState<Msg[]>([]); const [text, setText] = useState('');
  const [live, setLive] = useState<string | null>(null); const [copied, setCopied] = useState(false); const [err, setErr] = useState('');
  const host = g.owner_id === me; const end = useRef<HTMLDivElement>(null); const file = useRef<HTMLInputElement>(null);
  const [adding, setAdding] = useState(!!fresh && g.owner_id === me);
  const setPhoto = async (f?: File) => {
    if (!f) return; setErr('');
    try {
      const blob = await shrinkImage(f); const path = `${me}/group-${g.id}-${crypto.randomUUID().slice(0, 8)}.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`;
      const up = await supabase.storage.from('bix-avatars').upload(path, blob, { contentType: blob.type });
      if (up.error) throw new Error(up.error.message);
      const { error } = await supabase.rpc('bix_group_set_avatar', { p_group: g.id, p_path: path });
      if (error) { await supabase.storage.from('bix-avatars').remove([path]); throw new Error(error.message); }
      if (g.avatar_path) void supabase.storage.from('bix-avatars').remove([g.avatar_path]);
      await onChange();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Gagal mengunggah foto.'); }
  };
  const leave = async () => {
    if (!confirm(`Keluar dari grup ${g.name}?`)) return;
    const { error } = await supabase.from('bix_group_members').delete().eq('group_id', g.id).eq('user_id', me);
    if (error) { setErr('Gagal keluar dari grup.'); return; } onBack();
  };
  const load = async () => { const { data } = await supabase.rpc('bix_group_feed', { p_group: g.id }); setMsgs(((data as Msg[] | null) ?? []).slice().reverse()); };
  useEffect(() => { void load(); const t = setInterval(() => { if (!document.hidden) void load(); }, 5000); return () => clearInterval(t); }, [g.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [msgs.length]);
  const send = async () => {
    const b = text.trim(); if (!b) return; setText('');
    const { error } = await supabase.from('bix_group_messages').insert({ group_id: g.id, sender_id: me, body: b.slice(0, 2000) });
    if (error) setErr('Message failed to send.'); else void load();
  };
  const startLive = async () => {
    setErr(''); const c = newCode();
    const { error } = await supabase.from('bix_call_rooms').insert({ host_id: me, title: `${g.name} · Live Class`.slice(0, 60), code: c, video: true });
    if (error) { setErr('Could not start Live Class.'); return; }
    await supabase.from('bix_groups').update({ live_code: c }).eq('id', g.id);
    await supabase.from('bix_group_messages').insert({ group_id: g.id, sender_id: me, body: '🔴 Live Class started — tap "Join Live Class" above.' });
    await onChange(); setLive(c);
  };
  const leaveLive = async () => {
    if (host && live) { await supabase.from('bix_groups').update({ live_code: null }).eq('id', g.id); }
    setLive(null); await onChange();
  };
  if (live) return <MeetingStage code={live} me={me} onLeave={() => void leaveLive()}/>;
  return <section className="bx-grp-room is-full">
    <header>
      <button type="button" aria-label="Back" onClick={onBack}><ArrowLeft size={18}/></button>
      <span className="bx-grp-room-av">
        <GroupAvatar g={g} size={40}/>
        {host && <button type="button" className="bx-grp-cam" aria-label="Ganti foto grup" onClick={() => file.current?.click()}><Camera size={11}/></button>}
        <input ref={file} type="file" accept="image/*" hidden onChange={e => { void setPhoto(e.target.files?.[0]); e.target.value = ''; }}/>
      </span>
      <div><b>{g.name}</b><small>Kode {g.code}</small></div>
      <button type="button" aria-label="Copy invite code" onClick={async () => { if (await copyText(g.code)) { setCopied(true); setTimeout(() => setCopied(false), 1600); } }}>{copied ? <Check size={16}/> : <Copy size={16}/>}</button>
      {g.live_code ? <button type="button" className="is-live" aria-label="Join Live Class" onClick={() => setLive(g.live_code)}><Radio size={16}/></button>
        : host && <button type="button" aria-label="Start Live Class" onClick={() => void startLive()}><Radio size={16}/></button>}
      {host ? <button type="button" aria-label="Tambah anggota" onClick={() => setAdding(true)}><UserPlus size={16}/></button>
        : <button type="button" aria-label="Keluar dari grup" onClick={() => void leave()}><LogOut size={16}/></button>}
    </header>
    {g.live_code && <button type="button" className="bx-grp-livebar is-on" onClick={() => setLive(g.live_code)}><Radio size={14}/> Live Class berlangsung · Gabung</button>}
    {err && <p className="bx-grp-msg">{err}</p>}
    <div className="bx-grp-feed bc-chatbox">
      {msgs.length === 0 && <p className="bx-grp-empty">Share the first lesson, tip or link with your group.</p>}
      {msgs.map(m => <div key={m.id} className={`bx-grp-msg-row${m.sender_id === me ? ' is-me' : ''}`}>
        {m.sender_id !== me && <i>@{m.name}</i>}<p>{m.body}</p><small>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
      </div>)}
      <div ref={end}/>
    </div>
    <form className="bx-grp-compose" onSubmit={e => { e.preventDefault(); void send(); }}>
      <input className="form-input" placeholder="Write a lesson or message…" value={text} maxLength={2000} onChange={e => setText(e.target.value)}/>
      <button type="submit" aria-label="Send" disabled={!text.trim()}><Send size={18}/></button>
    </form>
    {adding && <AddMembers g={g} onClose={() => setAdding(false)}/>}
  </section>;
}
