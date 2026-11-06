import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Copy, Check, GraduationCap, LogOut, Radio, Send, UserPlus, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { copyText } from '@/lib/copy-text';
import { MeetingStage } from '@/components/BixGroupMeeting';

type Group = { id: string; name: string; about: string; code: string; live_code: string | null; owner_id: string };
type Msg = { id: string; sender_id: string; name: string; body: string; created_at: string };
const newCode = (n = 6) => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');

/** GROUP tab: education groups with group chat + a host-started Live Class (voice/video room). */
export function BixGroups({ me, createOnly }: { me: string; createOnly?: boolean }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState(''); const [about, setAbout] = useState('');
  const [code, setCode] = useState(''); const [msg, setMsg] = useState('');
  const [open, setOpen] = useState<Group | null>(null);
  const load = async () => {
    const { data } = await supabase.from('bix_groups').select('id,name,about,code,live_code,owner_id').order('created_at', { ascending: false });
    const list = (data as Group[] | null) ?? []; setGroups(list);
    setOpen(o => o ? list.find(g => g.id === o.id) ?? null : o);
  };
  useEffect(() => { void load(); const t = setInterval(() => { if (!document.hidden) void load(); }, 20000); return () => clearInterval(t); }, []);
  const create = async () => {
    setMsg(''); if (name.trim().length < 2) { setMsg('Enter a group name first.'); return; }
    const { data, error } = await supabase.from('bix_groups').insert({ owner_id: me, name: name.trim().slice(0, 60), about: about.trim().slice(0, 300), code: newCode(7) }).select('id,name,about,code,live_code,owner_id').single();
    if (error) { setMsg('Failed to create group.'); return; }
    setName(''); setAbout(''); await load();
    if (data) setOpen(data as Group);
  };
  const join = async () => {
    setMsg(''); const { error } = await supabase.rpc('bix_group_join', { p_code: code });
    if (error) { setMsg(error.message); return; } setCode(''); await load();
  };
  if (open) return <GroupRoom g={open} me={me} onBack={() => { setOpen(null); void load(); }} onChange={load}/>;
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
    {createOnly ? <p className="bx-grp-empty">Setelah grup dibuat, tambahkan member lewat BIX-ID atau @username di dalam grup.</p> : groups.length === 0 ? <p className="bx-grp-empty">No groups yet. Create one or join with an invite code.</p>
      : <ul className="bx-grp-list">{groups.map(g => <li key={g.id}><button type="button" onClick={() => setOpen(g)}>
        <span className="bx-grp-av"><Users size={18}/></span>
        <span className="bx-grp-meta"><b>{g.name}</b><small>{g.about || (g.owner_id === me ? 'You are the host' : 'Education group')}</small></span>
        {g.live_code && <em className="bx-grp-live"><Radio size={12}/> LIVE</em>}
      </button></li>)}</ul>}
  </section>;
}

function GroupRoom({ g, me, onBack, onChange }: { g: Group; me: string; onBack: () => void; onChange: () => Promise<void> }) {
  const [msgs, setMsgs] = useState<Msg[]>([]); const [text, setText] = useState('');
  const [live, setLive] = useState<string | null>(null); const [copied, setCopied] = useState(false); const [err, setErr] = useState('');
  const host = g.owner_id === me; const end = useRef<HTMLDivElement>(null);
  const [addQ, setAddQ] = useState(''); const [info, setInfo] = useState('');
  const addMember = async () => {
    setErr(''); setInfo(''); const { data, error } = await supabase.rpc('bix_group_add_member', { p_group: g.id, p_query: addQ });
    if (error) { setErr(error.message); return; } setAddQ(''); setInfo(`@${data as string} ditambahkan ke grup.`);
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
  return <section className="bx-grp-room">
    <header><button type="button" aria-label="Back" onClick={onBack}><ArrowLeft size={18}/></button>
      <div><b>{g.name}</b><small>Invite code {g.code}</small></div>
      <button type="button" aria-label="Copy invite code" onClick={async () => { if (await copyText(g.code)) { setCopied(true); setTimeout(() => setCopied(false), 1600); } }}>{copied ? <Check size={16}/> : <Copy size={16}/>}</button>
    </header>
    {g.live_code ? <button type="button" className="bx-grp-livebar is-on" onClick={() => setLive(g.live_code)}><Radio size={16}/> Join Live Class</button>
      : host && <button type="button" className="bx-grp-livebar" onClick={() => void startLive()}><Radio size={16}/> Start Live Class</button>}
    {host ? <div className="bx-grp-row bx-grp-add"><input className="form-input" placeholder="Tambah member: BIX-ID / @username" value={addQ} maxLength={40} onChange={e => setAddQ(e.target.value)}/>
      <button type="button" className="bx-grp-btn is-alt" disabled={addQ.trim().length < 3} onClick={() => void addMember()}><UserPlus size={15}/> Add</button></div>
      : <button type="button" className="bx-grp-leave" onClick={() => void leave()}><LogOut size={14}/> Keluar dari grup</button>}
    {err && <p className="bx-grp-msg">{err}</p>}{info && <p className="bx-grp-msg is-ok">{info}</p>}
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
  </section>;
}
