import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Eye, Plus, Trash2, Type, Video as VideoIcon, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BixAvatar, useSignedUrl } from '@/components/BixAvatar';
import { invalidateCard, saveStatus } from '@/lib/bix-avatar';

export type Story = { id: string; kind: 'text' | 'photo' | 'video'; media_path: string | null; caption: string | null; bg: string; created_at: string; viewed: boolean; views?: number | null };
export type StoryGroup = { user_id: string; name: string; avatar_path: string | null; mine: boolean; unseen: boolean; stories: Story[] };

const BGS = [['gold', 'Emas'], ['violet', 'Ungu'], ['emerald', 'Zamrud'], ['obsidian', 'Obsidian'], ['ruby', 'Ruby']] as const;
const PHOTO_MS = 6000;
const ago = (iso: string) => { const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000)); return m < 60 ? `${m} mnt lalu` : `${Math.floor(m / 60)} jam lalu`; };

export function useStoryFeed(me: string) {
  const [groups, setGroups] = useState<StoryGroup[] | null>(null);
  const load = useCallback(async () => { const { data } = await supabase.rpc('bix_story_feed' as never); setGroups((data as StoryGroup[] | null) ?? []); }, []);
  useEffect(() => { if (!me) return; void load(); const t = setInterval(() => void load(), 30000); return () => clearInterval(t); }, [me, load]);
  return { groups, reload: load };
}

/** WhatsApp-style story strip at the top of BIX CHAT. */
export function StoryBar({ me, myName }: { me: string; myName: string }) {
  const { groups, reload } = useStoryFeed(me);
  const [view, setView] = useState<number | null>(null);
  const [compose, setCompose] = useState(false);
  const list = groups ?? [];
  const mineIdx = list.findIndex(g => g.mine);
  const others = list.filter(g => !g.mine);
  return <section className="bx-stories" aria-label="Story 24 jam">
    <div className="bx-stories-row">
      <div className="bx-story-me">
        <button type="button" className="bx-story-item" onClick={() => mineIdx >= 0 ? setView(mineIdx) : setCompose(true)}>
          <BixAvatar userId={me} name={myName} className="bx-story-ava" story={mineIdx >= 0 ? 'seen' : null}/>
          <small>Story saya</small>
        </button>
        <button type="button" className="bx-story-add" aria-label="Buat story" onClick={() => setCompose(true)}><Plus size={13}/></button>
      </div>
      {others.map(g => { const i = list.indexOf(g); return <button key={g.user_id} type="button" className="bx-story-item" onClick={() => setView(i)}>
        <BixAvatar userId={g.user_id} path={g.avatar_path} name={g.name} className="bx-story-ava" story={g.unseen ? 'new' : 'seen'}/>
        <small>@{g.name}</small>
      </button>; })}
      {groups && others.length === 0 && <p className="bx-stories-empty">Story dari kontak chat, tim jaringan, dan teman saling follow muncul di sini selama 24 jam.</p>}
    </div>
    {view !== null && list[view] && <StoryViewer me={me} groups={list} start={view} onClose={() => { setView(null); void reload(); }} onDeleted={() => void reload()}/>}
    {compose && <StoryComposer me={me} onClose={() => setCompose(false)} onPosted={() => { setCompose(false); void reload(); invalidateCard(me); }}/>}
  </section>;
}

function StoryMedia({ s, onReady, onEnded, paused }: { s: Story; onReady: (ms: number) => void; onEnded: () => void; paused: boolean }) {
  const url = useSignedUrl('bix-stories', s.media_path);
  const vref = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (s.kind === 'text') onReady(PHOTO_MS); }, [s.id, s.kind, onReady]);
  useEffect(() => { const v = vref.current; if (!v) return; if (paused) v.pause(); else void v.play().catch(() => {}); }, [paused, url]);
  if (s.kind === 'text') return <div className={`bx-sv-text is-${s.bg}`}><p>{s.caption}</p></div>;
  if (!url) return <div className="bx-sv-wait">Memuat…</div>;
  if (s.kind === 'photo') return <img className="bx-sv-media" src={url} alt="Story" onLoad={() => onReady(PHOTO_MS)}/>;
  return <video ref={vref} className="bx-sv-media" src={url} playsInline autoPlay onLoadedMetadata={e => onReady(Math.min(30, e.currentTarget.duration || 15) * 1000)} onEnded={onEnded}/>;
}

function StoryViewer({ me, groups, start, onClose, onDeleted }: { me: string; groups: StoryGroup[]; start: number; onClose: () => void; onDeleted: () => void }) {
  const [gi, setGi] = useState(start);
  const g = groups[gi];
  const firstUnseen = (x?: StoryGroup) => Math.max(0, x ? x.stories.findIndex(s => !s.viewed && !x.mine) : 0);
  const [si, setSi] = useState(() => firstUnseen(groups[start]));
  const [dur, setDur] = useState(0);
  const [paused, setPaused] = useState(false);
  const [prog, setProg] = useState(0);
  const [viewers, setViewers] = useState<{ user_id: string; name: string; avatar_path: string | null; at: string }[] | null>(null);
  const [reply, setReply] = useState('');
  const [note, setNote] = useState('');
  const s = g?.stories[si];

  const next = useCallback(() => {
    if (!g) return onClose();
    if (si < g.stories.length - 1) { setSi(si + 1); return; }
    if (gi < groups.length - 1) { setGi(gi + 1); setSi(firstUnseen(groups[gi + 1])); return; }
    onClose();
  }, [g, si, gi, groups, onClose]);
  const prev = () => { if (si > 0) setSi(si - 1); else if (gi > 0) { setGi(gi - 1); setSi(0); } };

  useEffect(() => { setDur(0); setProg(0); setViewers(null); if (s && !g.mine && !s.viewed) void supabase.rpc('bix_story_mark_view' as never, { p_id: s.id } as never); }, [s?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!dur || paused || viewers) return;
    const t0 = Date.now() - prog * dur;
    const id = setInterval(() => { const p = (Date.now() - t0) / dur; if (p >= 1) { clearInterval(id); next(); } else setProg(p); }, 60);
    return () => clearInterval(id);
  }, [dur, paused, viewers, next]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); });
  const onReady = useCallback((ms: number) => setDur(ms), []);
  if (!g || !s) return null;

  const del = async () => {
    const { data, error } = await supabase.rpc('bix_story_delete' as never, { p_id: s.id } as never);
    if (error) { setNote(error.message); return; }
    const p = data as string | null; if (p) void supabase.storage.from('bix-stories').remove([p]);
    onDeleted(); onClose();
  };
  const openViewers = async () => { setPaused(true); const { data } = await supabase.rpc('bix_story_viewers' as never, { p_id: s.id } as never); setViewers((data as typeof viewers) ?? []); };
  const sendReply = async () => {
    const b = reply.trim(); if (!b) return;
    const { error } = await supabase.rpc('bix_chat_send' as never, { p_to: g.user_id, p_body: `💬 Membalas story: ${b}`, p_reply: null } as never);
    setReply(''); setPaused(false); setNote(error ? error.message : 'Balasan terkirim ke chat'); setTimeout(() => setNote(''), 2500);
  };
  const hold = { onPointerDown: () => setPaused(true), onPointerUp: () => setPaused(false), onPointerLeave: () => setPaused(false) };

  return <div className="bx-sv" role="dialog" aria-modal="true" aria-label={`Story @${g.name}`}>
    <div className="bx-sv-bars">{g.stories.map((x, i) => <i key={x.id}><b style={{ width: `${i < si ? 100 : i === si ? prog * 100 : 0}%` }}/></i>)}</div>
    <header className="bx-sv-head">
      <BixAvatar userId={g.user_id} path={g.avatar_path} name={g.name} className="comm-ava" ring={false}/>
      <span className="min-w-0 flex-1"><b className="block truncate">{g.mine ? 'Story saya' : `@${g.name}`}</b><small>{ago(s.created_at)}</small></span>
      {g.mine && <button type="button" aria-label="Hapus story" onClick={() => void del()}><Trash2 size={17}/></button>}
      <button type="button" aria-label="Tutup" onClick={onClose}><X size={20}/></button>
    </header>
    <div className="bx-sv-stage" {...hold}>
      <StoryMedia key={s.id} s={s} onReady={onReady} onEnded={next} paused={paused || !!viewers}/>
      {s.caption && s.kind !== 'text' && <p className="bx-sv-cap">{s.caption}</p>}
      <button type="button" className="bx-sv-tap is-prev" aria-label="Sebelumnya" onClick={prev}/>
      <button type="button" className="bx-sv-tap is-next" aria-label="Berikutnya" onClick={next}/>
    </div>
    {note && <p className="bx-sv-note" role="status">{note}</p>}
    <footer className="bx-sv-foot">
      {g.mine ? <button type="button" className="bx-sv-views" onClick={() => void openViewers()}><Eye size={15}/> {s.views ?? 0} dilihat</button>
        : <form onSubmit={e => { e.preventDefault(); void sendReply(); }}><input value={reply} onFocus={() => setPaused(true)} onBlur={() => !reply && setPaused(false)} onChange={e => setReply(e.target.value)} maxLength={300} placeholder={`Balas @${g.name}…`}/><button type="submit" disabled={!reply.trim()}>Kirim</button></form>}
    </footer>
    {viewers && <div className="comm-sheet-bg" onClick={() => { setViewers(null); setPaused(false); }}><div className="comm-sheet" onClick={e => e.stopPropagation()}>
      <p className="comm-sheet-preview"><Eye size={13}/> Dilihat oleh {viewers.length}</p>
      {viewers.length === 0 ? <p className="py-3 text-center text-xs text-muted-foreground">Belum ada yang melihat.</p> : <ul className="bx-sv-viewers">{viewers.map(v => <li key={v.user_id}><BixAvatar userId={v.user_id} path={v.avatar_path} name={v.name} ring={false}/><b>@{v.name}</b><small>{new Date(v.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></li>)}</ul>}
      <button type="button" className="ghost" onClick={() => { setViewers(null); setPaused(false); }}>Tutup</button>
    </div></div>}
  </div>;
}

function StoryComposer({ me, onClose, onPosted }: { me: string; onClose: () => void; onPosted: () => void }) {
  const [mode, setMode] = useState<'text' | 'photo' | 'video'>('text');
  const [text, setText] = useState('');
  const [bg, setBg] = useState('gold');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [status, setStatus] = useState('');
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = async (f: File, kind: 'photo' | 'video') => {
    setErr('');
    if (kind === 'photo' && (!f.type.startsWith('image/') || f.size > 10 * 1024 * 1024)) return setErr('Foto JPG/PNG/WebP, maksimal 10 MB.');
    if (kind === 'video') {
      if (!f.type.startsWith('video/') || f.size > 30 * 1024 * 1024) return setErr('Video maksimal 30 MB.');
      const u = URL.createObjectURL(f);
      const d = await new Promise<number>(r => { const v = document.createElement('video'); v.preload = 'metadata'; v.onloadedmetadata = () => r(v.duration); v.onerror = () => r(0); v.src = u; });
      URL.revokeObjectURL(u);
      if (d > 31) return setErr('Durasi video maksimal 30 detik.');
    }
    setMode(kind); setFile(f); setPreview(URL.createObjectURL(f));
  };
  const post = async () => {
    setBusy(true); setErr('');
    try {
      let path: string | null = null;
      if (mode !== 'text') {
        if (!file) throw new Error('Pilih media terlebih dulu');
        const ext = (file.name.split('.').pop() || (mode === 'photo' ? 'jpg' : 'mp4')).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5);
        path = `${me}/${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from('bix-stories').upload(path, file, { contentType: file.type, upsert: false });
        if (up.error) throw new Error(up.error.message);
      }
      const { error } = await supabase.rpc('bix_story_post' as never, { p_kind: mode, p_path: path, p_caption: text, p_bg: bg } as never);
      if (error) { if (path) void supabase.storage.from('bix-stories').remove([path]); throw new Error(error.message); }
      try { navigator.vibrate?.(15); } catch { /* optional */ }
      onPosted();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Gagal memasang story'); } finally { setBusy(false); }
  };
  const quickStatus = async () => { try { await saveStatus(me, text); setStatus('Status profil diperbarui'); setTimeout(() => setStatus(''), 2500); } catch (e) { setErr(e instanceof Error ? e.message : 'Gagal'); } };

  return <div className="comm-sheet-bg" onClick={onClose}><div className="comm-sheet bx-sc" role="dialog" aria-label="Buat story" onClick={e => e.stopPropagation()}>
    <div className="bx-sc-head"><b>Buat Story · 24 jam</b><button type="button" aria-label="Tutup" onClick={onClose}><X size={18}/></button></div>
    <div className="bx-sc-modes">
      <button type="button" className={mode === 'text' ? 'is-on' : ''} onClick={() => { setMode('text'); setFile(null); setPreview(''); }}><Type size={15}/>Teks</button>
      <button type="button" className={mode === 'photo' ? 'is-on' : ''} onClick={() => photoRef.current?.click()}><Camera size={15}/>Foto</button>
      <button type="button" className={mode === 'video' ? 'is-on' : ''} onClick={() => videoRef.current?.click()}><VideoIcon size={15}/>Video</button>
    </div>
    <input ref={photoRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void pick(f, 'photo'); }}/>
    <input ref={videoRef} type="file" accept="video/*" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void pick(f, 'video'); }}/>
    {mode === 'text' ? <div className={`bx-sc-canvas bx-sv-text is-${bg}`}><textarea value={text} onChange={e => setText(e.target.value)} maxLength={200} placeholder="Tulis status Anda…" aria-label="Teks story"/></div>
      : preview && <div className="bx-sc-canvas">{mode === 'photo' ? <img src={preview} alt="Pratinjau story"/> : <video src={preview} controls playsInline/>}</div>}
    {mode === 'text' ? <div className="bx-sc-bgs">{BGS.map(([k, l]) => <button key={k} type="button" aria-label={`Latar ${l}`} className={`is-${k}${bg === k ? ' is-on' : ''}`} onClick={() => setBg(k)}/>)}</div>
      : <input className="comm-input" value={text} onChange={e => setText(e.target.value)} maxLength={200} placeholder="Keterangan (opsional)"/>}
    {err && <p className="comm-err">{err}</p>}
    {status && <p className="comm-busy">{status}</p>}
    <button type="button" className="comm-save" disabled={busy || (mode === 'text' ? !text.trim() : !file)} onClick={() => void post()}>{busy ? 'Memasang…' : 'Pasang Story'}</button>
    {mode === 'text' && text.trim() && <button type="button" className="ghost" onClick={() => void quickStatus()}>Jadikan status profil saja</button>}
    <small className="bx-sc-hint">Terlihat oleh kontak chat, tim jaringan, dan teman saling follow. Hilang otomatis setelah 24 jam · maks 10 story aktif.</small>
  </div></div>;
}
