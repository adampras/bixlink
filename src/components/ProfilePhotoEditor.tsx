import { useEffect, useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BixAvatar } from '@/components/BixAvatar';
import { removeAvatar, saveStatus, uploadAvatar } from '@/lib/bix-avatar';

type Me = { user_id: string; name: string; avatar_path: string | null; status_text: string | null };
const SUGGEST = ['🟢 Siap edukasi tim', '📞 Available for calls', '⏳ In a meeting', '🚀 Fokus membangun jaringan', '🌙 Istirahat'];

/** Profile photo + short status, shared by Profile and BIX CALL (one source of truth on the member profile). */
export function ProfilePhotoHeader({ fallback, children }: { fallback: string; children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const load = async () => { const { data } = await supabase.rpc('bix_profile_me' as never); const m = data as Me | null; setMe(m); setStatus(m?.status_text ?? ''); };
  useEffect(() => { void load(); }, []);
  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(''), 3000); };
  const pick = async (f: File) => {
    if (!me) return; setBusy(true);
    try { await uploadAvatar(me.user_id, f, me.avatar_path); await load(); flash('Profile photo updated · also shown in BIX CALL'); }
    catch (e) { flash(e instanceof Error ? e.message : 'Failed to upload photo'); } finally { setBusy(false); }
  };
  const drop = async () => { if (!me?.avatar_path) return; setBusy(true); try { await removeAvatar(me.user_id, me.avatar_path); await load(); flash('Profile photo removed'); } catch (e) { flash(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(false); } };
  const save = async (t = status) => { if (!me) return; try { await saveStatus(me.user_id, t); setStatus(t); setEditing(false); await load(); flash(t ? 'Status saved' : 'Status dihapus'); } catch (e) { flash(e instanceof Error ? e.message : 'Failed'); } };

  return <header className="profile-identity">
    <div className="profile-photo">
      <button type="button" className="profile-avatar" onClick={() => ref.current?.click()} disabled={busy || !me} aria-label="Change profile photo">
        {me?.avatar_path ? <BixAvatar userId={me.user_id} path={me.avatar_path} name={me.name} className="profile-avatar-img" ring={false}/> : <img src={fallback} alt="BIXLINK member emblem"/>}
        <span className="profile-photo-cam" aria-hidden="true">{busy ? '…' : <Camera size={13}/>}</span>
      </button>
      {me?.avatar_path && <button type="button" className="profile-photo-del" aria-label="Remove profile photo" onClick={() => void drop()} disabled={busy}><Trash2 size={11}/></button>}
      <input ref={ref} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void pick(f); }}/>
    </div>
    <div className="min-w-0 flex-1">
      {children}
      {editing ? <div className="profile-status-edit">
        <input value={status} onChange={e => setStatus(e.target.value)} maxLength={80} placeholder="Tulis status singkat…" aria-label="Status profil" autoFocus onKeyDown={e => e.key === 'Enter' && void save()}/>
        <div className="profile-status-chips">{SUGGEST.map(s => <button key={s} type="button" onClick={() => setStatus(s)}>{s}</button>)}</div>
        <div className="profile-status-act"><button type="button" onClick={() => { setEditing(false); setStatus(me?.status_text ?? ''); }}>Batal</button>{me?.status_text && <button type="button" onClick={() => void save('')}>Delete</button>}<button type="button" className="is-gold" onClick={() => void save()}>Save</button></div>
      </div> : <button type="button" className="profile-status" onClick={() => setEditing(true)}>{me?.status_text ? <span>{me.status_text}</span> : <em>+ Add status (shown in BIX CALL)</em>}</button>}
      {msg && <p role="status" className="profile-photo-msg">{msg}</p>}
    </div>
  </header>;
}
