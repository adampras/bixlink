import { useEffect, useRef, useState, type ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
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
type Mem = { id: string; code: string | null; name: string; host: boolean };
const COLS = 'id,name,about,code,live_code,owner_id,avatar_path';
const newCode = (n = 6) => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');

function GroupAvatar({ g, size = 44 }: { g: Group; size?: number }) {
  const url = useSignedUrl('bix-avatars', g.avatar_path);
  return <span className="bx-grp-av" style={{ width: size, height: size }}>{url ? <img src={url} alt={`Foto grup ${g.name}`} /> : <b style={{ fontSize: size * 0.4 }}>{(g.name.trim()[0] || 'G').toUpperCase()}</b>}</span>;
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
      <Button variant="ghost" type="button" className="bx-grp-btn" onClick={() => void create()}>+ Create group</Button>
      {!createOnly && <div className="bx-grp-row">
        <input className="form-input" placeholder="Invite code" value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7))}/>
        <Button variant="ghost" type="button" className="bx-grp-btn is-alt" disabled={code.length < 6} onClick={() => void join()}>Join</Button>
      </div>}
      {msg && <p className="bx-grp-msg">{msg}</p>}
    </div>
    {createOnly ? <p className="bx-grp-empty">Setelah grup dibuat, pasang foto grup dan tambahkan member dari kontak atau jaringan Anda.</p> : groups.length === 0 ? <p className="bx-grp-empty">No groups yet. Create one or join with an invite code.</p>
      : <ul className="bx-grp-list">{groups.map(g => <li key={g.id}><Button variant="ghost" type="button" onClick={() => setOpen(g)}>
        <GroupAvatar g={g}/>
        <span className="bx-grp-meta"><b>{g.name}</b><small>{g.about || (g.owner_id === me ? 'You are the host' : 'Education group')}</small></span>
        {g.live_code && <em className="bx-grp-live"><Radio size={12}/> LIVE</em>}
      </Button></li>)}</ul>}
  </section>;
}

/** Body portal keeps roster and picker independent of chat transforms and wallpapers. */
function GroupSheet({ title, description, onClose, children }: { title: string; description: string; onClose: () => void; children: ReactNode }) {
  return <DialogPrimitive.Root open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="bx-grp-sheet" />
      <DialogPrimitive.Content className="bx-grp-sheet-box">
        <header className="bx-grp-sheet-head">
          <div><DialogPrimitive.Title>{title}</DialogPrimitive.Title><DialogPrimitive.Description>{description}</DialogPrimitive.Description></div>
          <DialogPrimitive.Close asChild><Button variant="ghost" size="icon" aria-label="Tutup"><X size={18}/></Button></DialogPrimitive.Close>
        </header>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>;
}

function MembersSheet({ g, me, roster, onClose, onAdd, onReload, onPhoto }: { g: Group; me: string; roster: Mem[]; onClose: () => void; onAdd: () => void; onReload: () => void; onPhoto: () => void }) {
  const host = g.owner_id === me; const [err, setErr] = useState('');
  const remove = async (m: Mem) => {
    if (!confirm(`Keluarkan @${m.name} dari grup?`)) return;
    const { error } = await supabase.rpc('bix_group_remove_member', { p_group: g.id, p_user: m.id });
    if (error) setErr(error.message); else onReload();
  };
  return <GroupSheet title="Anggota grup" description={`${g.name} · ${roster.length} anggota`} onClose={onClose}>
      <div className="bx-grp-info"><GroupAvatar g={g} size={76}/><b>{g.name}</b><small>Kode undangan {g.code}</small>
        {host && <Button variant="ghost" type="button" className="bx-grp-btn is-alt" onClick={onPhoto}><Camera size={14}/> {g.avatar_path ? 'Ganti foto grup' : 'Pasang foto grup'}</Button>}</div>
      {g.about && <p className="bx-grp-empty" style={{ textAlign: 'left' }}>{g.about}</p>}
      {err && <p className="bx-grp-msg">{err}</p>}
      {host && <Button variant="ghost" type="button" className="bx-grp-btn" style={{ width: '100%', marginBottom: 8 }} onClick={onAdd}><UserPlus size={14}/> Tambah anggota</Button>}
      <ul className="bx-grp-cands">
        {roster.map(m => <li key={m.id}>
          <span className="bx-grp-av" style={{ width: 36, height: 36 }}>{m.name.slice(0, 1).toUpperCase()}</span>
          <span className="bx-grp-meta"><b>@{m.name}{m.id === me ? ' (Anda)' : ''}</b><small>{m.code ? `BIX-ID ${m.code}` : 'BIX-ID —'}</small><em className="bx-grp-member-role">{m.host ? 'Host' : 'Anggota'}</em></span>
          {host && !m.host && <Button variant="ghost" type="button" className="bx-grp-btn is-alt" aria-label={`Keluarkan ${m.name}`} onClick={() => void remove(m)}><X size={14}/></Button>}
        </li>)}
      </ul>
  </GroupSheet>;
}

function AddMembers({ g, inGroup, onClose }: { g: Group; inGroup: Set<string>; onClose: () => void }) {
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
  return <GroupSheet title="Tambah anggota" description={g.name} onClose={onClose}>
      <div className="bx-grp-tabs">{(['Kontak', 'Jaringan'] as const).map(t => <Button variant="ghost" key={t} type="button" aria-pressed={tab === t} onClick={() => setTab(t)}>{t === 'Kontak' ? 'Kontak Saya' : 'Jaringan Saya'}</Button>)}</div>
      <label className="bx-grp-search"><Search size={15}/><input value={q} onChange={e => setQ(e.target.value)} placeholder="Cari nama, BIX-ID atau @username"/></label>
      <ul className="bx-grp-cands">
        {tab === 'Jaringan' && net === null && <li className="bx-grp-empty">Memuat jaringan…</li>}
        {list.map(c => { const s = inGroup.has(c.id) ? 'ok' : done[c.id]; return <li key={c.id}>
          <input type="checkbox" aria-label={`Pilih ${c.name}`} disabled={s === 'ok'} checked={!!pick[c.id]} onChange={() => toggle(c)} style={{ width: 18, height: 18, accentColor: 'var(--primary)' }}/>
          <span className="bx-grp-av" style={{ width: 36, height: 36 }}>{c.name.slice(0, 1).toUpperCase()}</span>
          <span className="bx-grp-meta"><b>{c.name}</b><small>{c.code}{c.src === 'Jaringan' ? (c.depth === 0 ? ' · Upline' : ` · L${c.depth}`) : ''}{s === 'ok' ? ' · ✓ Sudah di grup' : s ? ` · ${s}` : ''}</small></span>
          <Button variant="ghost" type="button" className="bx-grp-btn is-alt" disabled={s === 'ok' || busy === c.id} onClick={() => void add(c.code, c.id)}>{s === 'ok' ? <Check size={14}/> : <UserPlus size={14}/>}</Button>
        </li>; })}
        {!manual && list.length === 0 && (tab === 'Kontak' || net) && <li className="bx-grp-empty">{tab === 'Kontak' ? 'Belum ada kontak tersimpan.' : 'Belum ada anggota jaringan.'}</li>}
        {manual && <li><span className="bx-grp-meta"><b>Tambah “{q.trim()}”</b><small>{done['manual'] && done['manual'] !== 'ok' ? done['manual'] : 'BIX-ID atau @username'}</small></span>
          <Button variant="ghost" type="button" className="bx-grp-btn is-alt" disabled={done['manual'] === 'ok'} onClick={() => void add(q.trim(), 'manual')}>{done['manual'] === 'ok' ? <Check size={14}/> : <UserPlus size={14}/>}</Button></li>}
      </ul>
      {nPick > 0 && <Button variant="ghost" type="button" className="bx-grp-btn" style={{ width: '100%', marginTop: 8 }} disabled={!!busy} onClick={() => void addAll()}><UserPlus size={14}/> Tambahkan {nPick} anggota</Button>}
  </GroupSheet>;
}

function GroupRoom({ g, me, fresh, onBack, onChange }: { g: Group; me: string; fresh?: boolean; onBack: () => void; onChange: () => Promise<void> }) {
  const [msgs, setMsgs] = useState<Msg[]>([]); const [text, setText] = useState('');
  const [live, setLive] = useState<string | null>(null); const [copied, setCopied] = useState(false); const [err, setErr] = useState('');
  const host = g.owner_id === me; const end = useRef<HTMLDivElement>(null); const file = useRef<HTMLInputElement>(null);
  const [adding, setAdding] = useState(!!fresh && g.owner_id === me);
  const [roster, setRoster] = useState<Mem[]>([]); const [showMem, setShowMem] = useState(false);
  const loadRoster = async () => { const { data } = await supabase.rpc('bix_group_roster', { p_group: g.id }); setRoster((data as Mem[] | null) ?? []); };
  useEffect(() => { void loadRoster(); }, [g.id, adding]); // eslint-disable-line react-hooks/exhaustive-deps
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
      <Button variant="ghost" type="button" aria-label="Back" onClick={onBack}><ArrowLeft size={18}/></Button>
      <span className="bx-grp-room-av">
        <GroupAvatar g={g} size={40}/>
        {host && <Button variant="ghost" type="button" className="bx-grp-cam" aria-label="Ganti foto grup" onClick={() => file.current?.click()}><Camera size={11}/></Button>}
        <input ref={file} type="file" accept="image/*" hidden onChange={e => { void setPhoto(e.target.files?.[0]); e.target.value = ''; }}/>
      </span>
      <Button variant="ghost" type="button" className="bx-grp-room-title" aria-label="Lihat anggota grup" onClick={() => setShowMem(true)}><b>{g.name}</b><small>{roster.length} anggota · Kode {g.code}</small></Button>
      <nav className="bx-grp-actions" aria-label="Aksi grup">
        <Button variant="ghost" type="button" className="bx-grp-act" onClick={async () => { if (await copyText(g.code)) { setCopied(true); setTimeout(() => setCopied(false), 1600); } }}>{copied ? <Check size={15}/> : <Copy size={15}/>}<span>{copied ? 'Tersalin' : 'Kode'}</span></Button>
        {g.live_code ? <Button variant="ghost" type="button" className="bx-grp-act is-live" onClick={() => setLive(g.live_code)}><Radio size={15}/><span>Gabung</span></Button>
          : host && <Button variant="ghost" type="button" className="bx-grp-act" onClick={() => void startLive()}><Radio size={15}/><span>Live</span></Button>}
        {host ? <Button variant="ghost" type="button" className="bx-grp-act" onClick={() => setAdding(true)}><UserPlus size={15}/><span>Tambah</span></Button>
          : <Button variant="ghost" type="button" className="bx-grp-act" onClick={() => void leave()}><LogOut size={15}/><span>Keluar</span></Button>}
      </nav>
    </header>
    {g.live_code && <Button variant="ghost" type="button" className="bx-grp-livebar is-on" onClick={() => setLive(g.live_code)}><Radio size={14}/> Live Class berlangsung · Gabung</Button>}
    {err && <p className="bx-grp-msg">{err}</p>}
    {roster.length > 0 && <Button variant="ghost" type="button" className="bx-grp-rosterbar" onClick={() => setShowMem(true)}><Users size={14}/><span>{roster.slice(0, 3).map(m => '@' + m.name).join(', ')}</span><small>{roster.length > 3 ? `+${roster.length - 3}` : 'Anggota'}</small></Button>}
    <div className="bx-grp-feed bc-chatbox">
      {msgs.length === 0 && <p className="bx-grp-empty">Share the first lesson, tip or link with your group.</p>}
      {msgs.map(m => <div key={m.id} className={`bx-grp-msg-row${m.sender_id === me ? ' is-me' : ''}`}>
        {m.sender_id !== me && <i>@{m.name}</i>}<p>{m.body}</p><small>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
      </div>)}
      <div ref={end}/>
    </div>
    <form className="bx-grp-compose" onSubmit={e => { e.preventDefault(); void send(); }}>
      <input className="form-input" placeholder="Write a lesson or message…" value={text} maxLength={2000} onChange={e => setText(e.target.value)}/>
      <Button variant="ghost" type="submit" aria-label="Send" disabled={!text.trim()}><Send size={18}/></Button>
    </form>
    {showMem && <MembersSheet g={g} me={me} roster={roster} onClose={() => setShowMem(false)} onAdd={() => { setShowMem(false); setAdding(true); }} onReload={() => void loadRoster()} onPhoto={() => file.current?.click()}/>}
    {adding && <AddMembers g={g} inGroup={new Set(roster.map(m => m.id))} onClose={() => setAdding(false)}/>}
  </section>;
}
