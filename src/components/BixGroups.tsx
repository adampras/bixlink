import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Camera, Copy, Check, GraduationCap, MoreVertical, LogOut, Radio, Search, Send, Share2, UserPlus, Users, X, Lock, MessageSquare, FileText, Settings, ShieldCheck, Crown, Hexagon, Link2, ChevronLeft, SlidersHorizontal, Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { copyText } from '@/lib/copy-text';
import { MeetingStage } from '@/components/BixGroupMeeting';
import { useSignedUrl } from '@/components/BixAvatar';
import { shrinkImage } from '@/lib/bix-avatar';
import { readContacts } from '@/lib/bix-contacts';
import { ProposalsTab, TreasuryTab } from '@/components/BixGroupGov';

type Group = { id: string; name: string; about: string; code: string; live_code: string | null; owner_id: string; avatar_path: string | null; admins_only?: boolean; invite_limit?: number | null; invite_uses?: number; invite_expires_at?: string | null };
type Msg = { id: string; sender_id: string; name: string; body: string; created_at: string };
type Cand = { id: string; code: string; name: string; src: 'Kontak' | 'Jaringan'; depth?: number };
type Mem = { id: string; code: string | null; name: string; host: boolean; admin?: boolean; last_seen?: string | null };
const presence = (iso?: string | null): 'online' | 'away' | 'offline' => { if (!iso) return 'offline'; const m = (Date.now() - new Date(iso).getTime()) / 6e4; return m < 3 ? 'online' : m < 60 ? 'away' : 'offline'; };
const inactive = (iso?: string | null) => !iso || Date.now() - new Date(iso).getTime() > 7 * 864e5;
const COLS = 'id,name,about,code,live_code,owner_id,avatar_path,admins_only,invite_limit,invite_uses,invite_expires_at';
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
  const [tools, setTools] = useState(false); const [act, setAct] = useState<Group | null>(null);
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
  useEffect(() => {
    const j = new URLSearchParams(window.location.search).get('join')?.toUpperCase();
    if (!j || !/^[A-Z0-9]{6,7}$/.test(j)) return;
    window.history.replaceState(null, '', '/call?tab=group');
    void (async () => {
      const { error } = await supabase.rpc('bix_group_join', { p_code: j });
      if (error) { setMsg(error.message); return; }
      const { data } = await supabase.from('bix_groups').select(COLS).eq('code', j).maybeSingle();
      await load(); if (data) setOpen(data as Group); else setMsg('Berhasil bergabung ke grup.');
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  if (open) { const room = <div className="bixcall-page bx-grp-portal"><GroupRoom g={open} me={me} fresh={fresh} onBack={() => { setOpen(null); setFresh(false); void load(); }} onChange={load}/></div>; return typeof document === 'undefined' ? room : createPortal(room, document.body); }
  return <section className="bx-grp">
    {!createOnly && <div className="bx-grp-top"><b>Grup</b><span className="comm-kebab"><button type="button" aria-label="Menu grup" aria-expanded={tools} onClick={() => setTools(v => !v)}><MoreVertical size={18}/></button></span></div>}
    {(createOnly || tools) && <div className="bx-grp-card">
      <div className="bx-grp-head"><GraduationCap size={16}/><b>Education Groups</b><small>Chat · Live Class · Host & Admin</small></div>
      <input className="form-input" placeholder="Group name, e.g. Crypto Basics Class" value={name} maxLength={60} onChange={e => setName(e.target.value)}/>
      <input className="form-input" placeholder="Short description (optional)" value={about} maxLength={300} onChange={e => setAbout(e.target.value)}/>
      <Button variant="ghost" type="button" className="bx-grp-btn" onClick={() => void create()}>+ Create group</Button>
      {!createOnly && <div className="bx-grp-row">
        <input className="form-input" placeholder="Invite code" value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7))}/>
        <Button variant="ghost" type="button" className="bx-grp-btn is-alt" disabled={code.length < 6} onClick={() => void join()}>Join</Button>
      </div>}
    </div>}
    {!createOnly && groups.length > 0 && <div className="bx-grp-hero"><b>Group Command</b><div className="bx-grp-hero-stats"><span><b>{groups.length}</b><small>Grup</small></span><span><b>{groups.filter(g => g.owner_id === me).length}</b><small>Anda kelola</small></span><span><b>{groups.filter(g => g.live_code).length}</b><small>Live</small></span></div></div>}
    {msg && <p className="bx-grp-msg">{msg}</p>}
    {createOnly ? <p className="bx-grp-empty">Setelah grup dibuat, pasang foto grup dan tambahkan member dari kontak atau jaringan Anda.</p> : groups.length === 0 ? <p className="bx-grp-empty">No groups yet. Create one or join with an invite code.</p>
      : <ul className="bx-grp-list">{groups.map(g => <li key={g.id} className="bx-grp-li"><Button variant="ghost" type="button" onClick={() => setOpen(g)}>
        <GroupAvatar g={g}/>
        <span className="bx-grp-meta"><span className="bx-grp-name"><b>{g.name}</b>{g.owner_id === me && <em className="bx-grp-tag">HOST</em>}</span><small>{g.about || (g.owner_id === me ? 'Anda Host grup ini' : 'Grup edukasi')}</small></span>
        {g.live_code && <em className="bx-grp-live"><Radio size={12}/> LIVE</em>}
      </Button><button type="button" className="bx-grp-more" aria-label={`Opsi ${g.name}`} onClick={() => setAct(g)}><MoreVertical size={16}/></button></li>)}</ul>}
    {act && createPortal(<div className="comm-sheet-bg" onClick={() => setAct(null)}><div className="comm-sheet" role="menu" onClick={e => e.stopPropagation()}>
      <b className="comm-sheet-title">{act.name}</b>
      <button type="button" onClick={() => { const a = act; setAct(null); setOpen(a); }}>💬 Buka grup</button>
      <button type="button" onClick={() => { const a = act; setAct(null); setOpen(a); }}>ℹ️ Info grup & kelola admin</button>
      <button type="button" onClick={() => { const a = act; setAct(null); void shareGroup(a).then(setMsg); }}>🔗 Undang via link</button>
      <button type="button" className="ghost" onClick={() => setAct(null)}>Batal</button>
    </div></div>, document.body)}
  </section>;
}

/** Body portal keeps roster and picker independent of chat transforms and wallpapers. */
const inviteLink = (g: Group) => `https://bixlink.com/call?tab=group&join=${g.code}`;
async function shareGroup(g: Group): Promise<string> {
  const url = inviteLink(g); const text = `Gabung grup "${g.name}" di BIX CALL BIXLINK.`;
  try { if (navigator.share) { await navigator.share({ title: g.name, text, url }); return ''; } } catch { return ''; }
  return (await copyText(`${text} ${url}`)) ? 'Link undangan tersalin — tempel ke chat mana saja.' : 'Gagal menyalin link.';
}

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
  const [o1, setO1] = useState(false);
  useEffect(() => { void supabase.rpc('bix_is_owner1').then(({ data }) => setO1(Boolean(data))); }, []);
  const host = g.owner_id === me || o1; const meAdmin = roster.some(m => m.id === me && m.admin); const manage = host || meAdmin; const [err, setErr] = useState('');
  const [tab, setTab] = useState<'overview' | 'members' | 'proposals' | 'treasury' | 'settings'>('overview');
  const [filt, setFilt] = useState<'all' | 'founders' | 'mods' | 'members' | 'inactive'>('all');
  const [lim, setLim] = useState('50'); const [days, setDays] = useState('7');
  const resetInvite = async () => { const { error } = await supabase.rpc('bix_group_invite_reset' as never, { p_group: g.id, p_limit: lim === 'none' ? null : Number(lim), p_days: days === 'none' ? null : Number(days) } as never); if (error) setErr(error.message); else { setErr('Link undangan baru dibuat.'); onReload(); } };
  const expLeft = (() => { if (!g.invite_expires_at) return 'never'; const ms = new Date(g.invite_expires_at).getTime() - Date.now(); if (ms <= 0) return 'expired'; return `${Math.floor(ms / 864e5)}d ${Math.floor(ms / 36e5) % 24}h`; })();
  const online = roster.filter(m => presence(m.last_seen) === 'online').length;
  const [rowMenu, setRowMenu] = useState<string | null>(null); const [only, setOnly] = useState(!!g.admins_only); const [copied, setCopied] = useState(false);
  const setAdmin = async (m: Mem, on: boolean) => {
    const { error } = await supabase.rpc('bix_group_set_admin', { p_group: g.id, p_user: m.id, p_on: on });
    if (error) setErr(error.message); else { setErr(on ? `@${m.name} sekarang Admin grup.` : `@${m.name} bukan admin lagi.`); onReload(); }
  };
  const remove = async (m: Mem) => {
    if (!confirm(`Keluarkan @${m.name} dari grup?`)) return;
    const { error } = await supabase.rpc('bix_group_remove_member', { p_group: g.id, p_user: m.id });
    if (error) setErr(error.message); else onReload();
  };
  const toggleOnly = async (v: boolean) => {
    setOnly(v); const { error } = await supabase.from('bix_groups').update({ admins_only: v } as never).eq('id', g.id);
    if (error) { setOnly(!v); setErr('Gagal menyimpan izin.'); } else onReload();
  };
  const copyLink = async () => { const ok = await copyText(inviteLink(g)); setCopied(ok); setErr(ok ? 'Link undangan tersalin.' : 'Gagal menyalin link.'); setTimeout(() => setCopied(false), 1600); };
  const founders = roster.filter(m => m.host).length; const mods = roster.filter(m => m.admin && !m.host).length;
  const list = roster.filter(m => filt === 'all' ? true : filt === 'founders' ? m.host : filt === 'mods' ? (m.admin && !m.host) : filt === 'inactive' ? inactive(m.last_seen) : (!m.admin && !m.host));
  const perms: { icon: ReactNode; t: string; d: string; on: boolean; edit?: boolean }[] = [
    { icon: <Lock size={16}/>, t: 'Member Management', d: 'Add, remove and manage roles', on: manage },
    { icon: <MessageSquare size={16}/>, t: 'Admin-only Messaging', d: 'Only Founder & Moderators can send', on: only, edit: host },
    { icon: <FileText size={16}/>, t: 'Role Assignment', d: 'Promote or demote moderators', on: host },
    { icon: <Settings size={16}/>, t: 'System Settings', d: 'Configure group settings', on: host },
  ];
  return <GroupSheet title="Group Admin" description={`${g.name} · ${roster.length} anggota`} onClose={onClose}>
    <div className="bx-grp-lux">
      {tab === 'overview' && <>
        <header className="bx-grp-lux-head">
          <span className="bx-grp-lux-emblem"><GroupAvatar g={g} size={54}/><i><ShieldCheck size={11}/></i></span>
          <div><b>Group Admin</b><small>{g.name}</small></div>
          <button type="button" className="bx-grp-lux-hex" aria-label="Pengaturan grup" onClick={() => setTab('settings')}><Settings size={18}/></button>
        </header>
        <div className="bx-grp-lux-stats">
          <div><Users size={18} className="is-gold"/><b>{roster.length}</b><small>Members</small><em className="is-green">Total</em></div>
          <div><ShieldCheck size={18} className="is-gold"/><b>{online}</b><small>Online</small><em className="is-green">Live</em></div>
          <div><Crown size={18} className="is-gold"/><b>{founders}</b><small>Founders</small><em>Active</em></div>
          <div><Hexagon size={18} className="is-purple"/><b>{mods}</b><small>Moderators</small><em>Active</em></div>
        </div>
        <h4 className="bx-grp-lux-h">Group Permissions</h4>
        <ul className="bx-grp-lux-perms">{perms.map(p => <li key={p.t}>
          <span className="bx-grp-lux-pi">{p.icon}</span><span><b>{p.t}</b><small>{p.d}</small></span>
          <button type="button" role="switch" aria-checked={p.on} aria-label={p.t} disabled={!p.edit} className={`bx-grp-lux-sw${p.on ? ' is-on' : ''}`} onClick={() => p.edit && void toggleOnly(!p.on)}><i/></button>
        </li>)}</ul>
        <h4 className="bx-grp-lux-h">Invite Link</h4>
        <div className="bx-grp-lux-invite">
          <div className="bx-grp-lux-inv-row">
            <span className="bx-grp-lux-inv-hex"><Lock size={18}/></span>
            <span><b>Cryptographic Invite Link</b><small>Secure • Code {g.code}</small><small>Uses: {g.invite_uses ?? 0}/{g.invite_limit ?? '∞'} · Expires: {expLeft}</small></span>
            <button type="button" className="bx-grp-lux-copy" aria-label="Salin link undangan" onClick={() => void copyLink()}>{copied ? <Check size={16}/> : <Copy size={16}/>}</button>
          </div>
          <button type="button" className="bx-grp-lux-wide" onClick={async () => { const m = await shareGroup(g); if (m) setErr(m); }}><Link2 size={15}/> View & Copy Invite Link</button>
          {manage && <div className="bx-grp-lux-inv-ctl">
            <select aria-label="Kuota link" value={lim} onChange={e => setLim(e.target.value)}>{['10', '25', '50', '100', '250', '500'].map(v => <option key={v} value={v}>{v} uses</option>)}<option value="none">Unlimited</option></select>
            <select aria-label="Masa berlaku" value={days} onChange={e => setDays(e.target.value)}>{['1', '7', '30', '90'].map(v => <option key={v} value={v}>{v} hari</option>)}<option value="none">Never</option></select>
            <button type="button" onClick={() => void resetInvite()}>New link</button>
          </div>}
        </div>
      </>}
      {tab === 'members' && <>
        <header className="bx-grp-lux-mhead">
          <button type="button" className="bx-grp-lux-hex" aria-label="Kembali" onClick={() => setTab('overview')}><ChevronLeft size={18}/></button>
          <b>Members</b>
          <button type="button" className="bx-grp-lux-hex" aria-label="Filter" onClick={() => setFilt(f => f === 'all' ? 'founders' : f === 'founders' ? 'mods' : f === 'mods' ? 'members' : 'all')}><SlidersHorizontal size={16}/></button>
        </header>
        <div className="bx-grp-lux-tabs" role="tablist">
          {([['all', 'All Members', 'is-cyan'], ['founders', 'Founders', 'is-gold'], ['mods', 'Moderators', 'is-purple'], ['members', 'Members', 'is-muted'], ['inactive', 'Inactive', 'is-muted']] as const).map(([k, l, c]) =>
            <button key={k} type="button" role="tab" aria-selected={filt === k} className={`${c}${filt === k ? ' is-on' : ''}`} onClick={() => setFilt(k)}>{l}</button>)}
        </div>
        <ul className="bx-grp-lux-list">{list.map(m => { const r = m.host ? 'founder' : m.admin ? 'mod' : 'mem'; return <li key={m.id}>
          <span className={`bx-grp-lux-av is-${r}`}>{m.name.slice(0, 1).toUpperCase()}{r === 'founder' && <i><Crown size={9}/></i>}{r === 'mod' && <i><Hexagon size={9}/></i>}<span className={`bx-grp-lux-dot is-${presence(m.last_seen)}`}/></span>
          <span className="bx-grp-lux-info"><b>@{m.name}{m.id === me ? ' (Anda)' : ''}</b><code>{m.code ? `BIX-${m.code}` : 'BIX-ID —'}</code></span>
          {r === 'founder' && <em className="bx-grp-lux-badge is-gold">FOUNDER</em>}
          {r === 'mod' && <em className="bx-grp-lux-badge is-purple">MODERATOR</em>}
          <small className={`bx-grp-lux-st is-${presence(m.last_seen)}`}>{presence(m.last_seen) === 'online' ? 'Online' : presence(m.last_seen) === 'away' ? 'Away' : 'Offline'}</small>
          {(host || (meAdmin && !m.admin)) && !m.host && m.id !== me && <span className="bx-grp-lux-more">
            <button type="button" aria-label={`Opsi ${m.name}`} onClick={() => setRowMenu(rowMenu === m.id ? null : m.id)}><MoreVertical size={16}/></button>
            {rowMenu === m.id && <span className="bx-grp-lux-pop">
              {host && <button type="button" onClick={() => { setRowMenu(null); void setAdmin(m, !m.admin); }}>{m.admin ? 'Copot moderator' : 'Jadikan moderator'}</button>}
              <button type="button" className="is-red" onClick={() => { setRowMenu(null); void remove(m); }}>Keluarkan</button>
            </span>}
          </span>}
        </li>; })}
          {!list.length && <li className="bx-grp-lux-empty">Tidak ada anggota di filter ini.</li>}
        </ul>
        {manage && <button type="button" className="bx-grp-lux-wide is-sticky" onClick={onAdd}><UserPlus size={15}/> Invite New Member</button>}
      </>}
      {tab === 'proposals' && <><header className="bx-grp-lux-mhead"><button type="button" className="bx-grp-lux-hex" aria-label="Kembali" onClick={() => setTab('overview')}><ChevronLeft size={18}/></button><b>Proposals</b><span/></header><ProposalsTab group={g.id} manage={manage} onMsg={setErr}/></>}
      {tab === 'treasury' && <><header className="bx-grp-lux-mhead"><button type="button" className="bx-grp-lux-hex" aria-label="Kembali" onClick={() => setTab('overview')}><ChevronLeft size={18}/></button><b>Treasury</b><span/></header><TreasuryTab group={g.id} manage={manage} onMsg={setErr}/></>}
      {tab === 'settings' && <>
        <header className="bx-grp-lux-mhead"><button type="button" className="bx-grp-lux-hex" aria-label="Kembali" onClick={() => setTab('overview')}><ChevronLeft size={18}/></button><b>Settings</b><span/></header>
        {host ? <>
          <button type="button" className="bx-grp-lux-wide" onClick={onPhoto}><Camera size={15}/> {g.avatar_path ? 'Ganti foto grup' : 'Pasang foto grup'}</button>
          <GroupSettings g={g} onSaved={onReload} onMsg={setErr}/>
        </> : <p className="bx-grp-lux-empty">Hanya Founder yang dapat mengubah pengaturan grup.</p>}
      </>}
      {err && <p className="bx-grp-msg">{err}</p>}
      <nav className="bx-grp-lux-dock" aria-label="Navigasi admin grup">
        <button type="button" className={tab === 'overview' ? 'is-on' : ''} onClick={() => setTab('overview')}><Home size={17}/><small>Overview</small></button>
        <button type="button" className={tab === 'members' ? 'is-on' : ''} onClick={() => setTab('members')}><Users size={17}/><small>Members</small></button>
        <button type="button" className={tab === 'proposals' ? 'is-on' : ''} onClick={() => setTab('proposals')}><FileText size={17}/><small>Proposals</small></button>
        <button type="button" className={tab === 'treasury' ? 'is-on' : ''} onClick={() => setTab('treasury')}><Hexagon size={17}/><small>Treasury</small></button>
        <button type="button" className={tab === 'settings' ? 'is-on' : ''} onClick={() => setTab('settings')}><Settings size={17}/><small>Settings</small></button>
      </nav>
    </div>
  </GroupSheet>;
}

function GroupSettings({ g, onSaved, onMsg }: { g: Group; onSaved: () => void; onMsg: (t: string) => void }) {
  const [name, setName] = useState(g.name); const [about, setAbout] = useState(g.about); const [only, setOnly] = useState(!!g.admins_only);
  const save = async (patch: Partial<Group>) => {
    const { error } = await supabase.from('bix_groups').update(patch as never).eq('id', g.id);
    onMsg(error ? 'Gagal menyimpan pengaturan grup.' : 'Pengaturan grup tersimpan.'); if (!error) onSaved();
  };
  return <div className="bx-grp-roles"><b>⚙️ Pengaturan grup (Host)</b>
    <input className="form-input" value={name} maxLength={60} onChange={e => setName(e.target.value)} aria-label="Nama grup"/>
    <input className="form-input" value={about} maxLength={300} onChange={e => setAbout(e.target.value)} placeholder="Deskripsi / aturan grup" aria-label="Deskripsi grup"/>
    <Button variant="ghost" type="button" className="bx-grp-btn" disabled={name.trim().length < 2} onClick={() => void save({ name: name.trim(), about: about.trim() })}>Simpan nama & deskripsi</Button>
    <label className="comm-check" style={{ marginTop: 8 }}><input type="checkbox" checked={only} onChange={e => { setOnly(e.target.checked); void save({ admins_only: e.target.checked }); }}/>Hanya Host & Admin yang boleh kirim pesan</label>
  </div>;
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
    if (!error) {
      const { data: s } = await supabase.auth.getSession(); const uid = s.session?.user.id;
      const who = /^BIX-/i.test(query) ? query.toUpperCase() : `@${query.replace(/^@/, '')}`;
      if (uid) await supabase.from('bix_group_messages').insert({ group_id: g.id, sender_id: uid, body: `👋 ${who} ditambahkan ke grup. Selamat bergabung!` });
    }
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
  const [o1, setO1] = useState(false); useEffect(() => { void supabase.rpc('bix_is_owner1').then(({ data }) => setO1(Boolean(data))); }, []);
  const host = g.owner_id === me || o1; const end = useRef<HTMLDivElement>(null); const file = useRef<HTMLInputElement>(null);
  const [adding, setAdding] = useState(!!fresh && g.owner_id === me);
  const [roster, setRoster] = useState<Mem[]>([]); const [showMem, setShowMem] = useState(false);
  const [menu, setMenu] = useState<Msg | null>(null); const [more, setMore] = useState(false);
  const hideKey = `bx-grp-hidden-${g.id}`;
  const [hidden, setHidden] = useState<string[]>([]);
  useEffect(() => { try { setHidden(JSON.parse(localStorage.getItem(hideKey) ?? '[]')); } catch { setHidden([]); } }, [hideKey]);
  const canMod = host || roster.some(m => m.id === me && m.admin);
  const delMine = (m: Msg) => { const n = [...hidden, m.id].slice(-500); setHidden(n); try { localStorage.setItem(hideKey, JSON.stringify(n)); } catch { /* optional */ } setMenu(null); };
  const delAll = async (m: Msg) => {
    if (!confirm('Hapus pesan ini untuk semua anggota?')) return;
    const { error } = await supabase.rpc('bix_group_delete_message' as never, { p_id: m.id } as never);
    setMenu(null); if (error) setErr('Gagal menghapus pesan.'); else void load();
  };
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
  useEffect(() => { void load(); void supabase.rpc('bix_group_touch' as never, { p_group: g.id } as never); let n = 0; const t = setInterval(() => { if (!document.hidden) { void load(); if (++n % 12 === 0) void supabase.rpc('bix_group_touch' as never, { p_group: g.id } as never); } }, 5000); return () => clearInterval(t); }, [g.id]); // eslint-disable-line react-hooks/exhaustive-deps
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
  useEffect(() => { if (live) return; document.documentElement.classList.add('comm-room-open'); return () => document.documentElement.classList.remove('comm-room-open'); }, [live]);
  if (live) return <MeetingStage code={live} me={me} onLeave={() => void leaveLive()}/>;
  return <section className="bx-grp-room is-full">
    <header>
      <Button variant="ghost" type="button" className="bx-grp-act bx-grp-back" aria-label="Kembali" onClick={onBack}><ArrowLeft size={15}/><span>Kembali</span></Button>
      <span className="bx-grp-room-av">
        <GroupAvatar g={g} size={40}/>
        <input ref={file} type="file" accept="image/*" hidden onChange={e => { void setPhoto(e.target.files?.[0]); e.target.value = ''; }}/>
      </span>
      <Button variant="ghost" type="button" className="bx-grp-room-title" aria-label="Lihat anggota grup" onClick={() => setShowMem(true)}><b>{g.name}</b><small>{roster.length} anggota</small></Button>
      <nav className="bx-grp-actions" aria-label="Aksi grup">
        {g.live_code && <Button variant="ghost" type="button" className="bx-grp-act is-live" onClick={() => setLive(g.live_code)}><Radio size={15}/><span>Gabung</span></Button>}
        <Button variant="ghost" type="button" className="bx-grp-act" aria-label="Menu grup" onClick={() => setMore(true)}><span style={{ fontSize: 20, lineHeight: 1 }}>⋯</span></Button>
      </nav>
    </header>
    {g.live_code && <Button variant="ghost" type="button" className="bx-grp-livebar is-on" onClick={() => setLive(g.live_code)}><Radio size={14}/> Live Class berlangsung · Gabung</Button>}
    {err && <p className="bx-grp-msg">{err}</p>}
    <div className="bx-grp-feed bc-chatbox">
      {msgs.length === 0 && <p className="bx-grp-empty">Share the first lesson, tip or link with your group.</p>}
      {msgs.filter(m => !hidden.includes(m.id)).map(m => <div key={m.id} className={`bx-grp-msg-row${m.sender_id === me ? ' is-me' : ''}`} onContextMenu={e => { e.preventDefault(); setMenu(m); }}>
        {m.sender_id !== me && <i>@{m.name}</i>}<p>{m.body}</p>
        <button type="button" className="comm-more" aria-label="Opsi pesan" onClick={() => setMenu(m)}>⋯</button><small>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>
      </div>)}
      <div ref={end}/>
    </div>
    {g.admins_only && !host && !roster.some(m => m.id === me && m.admin) ? <p className="bx-grp-empty">🔒 Hanya Host & Admin yang dapat mengirim pesan di grup ini.</p> : <form className="bx-grp-compose" onSubmit={e => { e.preventDefault(); void send(); }}>
      <input className="form-input" placeholder="Tulis pesan atau materi…" value={text} maxLength={2000} onChange={e => setText(e.target.value)}/>
      <Button variant="ghost" type="submit" aria-label="Send" disabled={!text.trim()}><Send size={18}/></Button>
    </form>}
    {menu && <GroupSheet title="Opsi pesan" description={menu.body.slice(0, 60)} onClose={() => setMenu(null)}>
      <div className="bx-grp-roles">
        <Button variant="outline" type="button" onClick={() => delMine(menu)}>🗑 Hapus untuk saya</Button>
        {(menu.sender_id === me || canMod) && !menu.body.startsWith('🚫') && <Button variant="destructive" type="button" onClick={() => void delAll(menu)}>🗑 Hapus untuk semua{menu.sender_id !== me ? ' (Admin)' : ''}</Button>}
      </div>
    </GroupSheet>}
    {more && <GroupSheet title="Menu grup" description={`${g.name} · ${roster.length} anggota`} onClose={() => setMore(false)}>
      <div className="bx-grp-roles">
        <Button variant="outline" type="button" onClick={async () => { setMore(false); const m = await shareGroup(g); if (m) setErr(m); }}><Share2 size={14}/> Bagikan link undangan</Button>
        <Button variant="outline" type="button" onClick={async () => { if (await copyText(g.code)) { setCopied(true); setTimeout(() => setCopied(false), 1600); } }}>{copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? 'Kode tersalin' : `Salin kode ${g.code}`}</Button>
        <Button variant="outline" type="button" onClick={() => { setMore(false); setShowMem(true); }}><Users size={14}/> Info, anggota & admin{host ? ' · Pengaturan' : ''}</Button>
        {host && <Button variant="outline" type="button" onClick={() => { setMore(false); setShowMem(true); }}>🛡️ Angkat / kelola admin grup</Button>}
        {canMod && <Button variant="outline" type="button" onClick={() => { setMore(false); setAdding(true); }}><UserPlus size={14}/> Tambah anggota</Button>}
        {host && <Button variant="outline" type="button" onClick={() => { setMore(false); file.current?.click(); }}><Camera size={14}/> {g.avatar_path ? 'Ganti foto grup' : 'Pasang foto grup'}</Button>}
        {g.live_code ? <Button variant="outline" type="button" onClick={() => { setMore(false); setLive(g.live_code); }}><Radio size={14}/> Ikut Live Class</Button>
          : host && <Button variant="outline" type="button" onClick={() => { setMore(false); void startLive(); }}><Radio size={14}/> Mulai Live Class</Button>}
        {!host && <Button variant="destructive" type="button" onClick={() => { setMore(false); void leave(); }}><LogOut size={14}/> Keluar dari grup</Button>}
      </div>
    </GroupSheet>}
    {showMem && <MembersSheet g={g} me={me} roster={roster} onClose={() => setShowMem(false)} onAdd={() => { setShowMem(false); setAdding(true); }} onReload={() => void loadRoster()} onPhoto={() => file.current?.click()}/>}
    {adding && <AddMembers g={g} inGroup={new Set(roster.map(m => m.id))} onClose={() => setAdding(false)}/>}
  </section>;
}
