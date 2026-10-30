import bixtokLogo from '@/assets/bixtok-logo.png';
import { Volume2, VolumeX } from 'lucide-react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Gift, Heart, Lock, MessageCircle, Plus, Radio, Send, Share2, Trash2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MemberGate } from '@/components/MemberGate';
import { useMember } from '@/lib/useMember';
import { BixtokStudio, filterCss } from '@/components/BixtokStudio';

export const Route = createFileRoute('/bixtok')({
  head: () => ({ meta: [
    { title: 'BIXTOK — Web3 short video & LIVE on BIXLINK' },
    { name: 'description', content: 'Watch BIXLINK short videos, go LIVE as a staking member and gift creators with BIXP or BIXCOIN.' },
    { property: 'og:title', content: 'BIXTOK — Web3 short video & LIVE' },
    { property: 'og:description', content: 'Vertical video feed, member LIVE rooms and BIXP / BIXCOIN gifts.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  component: BixtokPage,
});

type Cfg = { enabled: boolean; live_enabled: boolean; gifts_enabled: boolean; live_min_stake_usd: number; live_max_minutes: number; features: Record<string, boolean>; menus: { key: string; label: string; enabled: boolean }[] };
type Gift = { id: string; name: string; emoji: string; currency: string; price: number };
type Video = { id: string; creator_name: string; creator_id: string | null; caption: string; video_url: string; likes: number; media_path: string | null; media_kind: string; filter: string; overlay: string; allow_gifts: boolean; src: string };
type Live = { id: string; host_id: string; host_name: string; title: string; started_at: string };
type Msg = { id: string; name: string; body: string; kind: string };

function BixtokPage() {
  const { user, ready } = useMember();
  const q = useQuery({ queryKey: ['bixtok', user?.id], enabled: Boolean(user), refetchInterval: 60_000, queryFn: async () => {
    const [c, g, v, l, s] = await Promise.all([
      supabase.from('bixtok_config').select('*').eq('id', 1).single(),
      supabase.from('bixtok_gifts').select('id,name,emoji,currency,price').eq('enabled', true).order('sort'),
      supabase.from('bixtok_videos').select('id,creator_name,creator_id,caption,video_url,likes,media_path,media_kind,filter,overlay,allow_gifts').eq('enabled', true).order('created_at', { ascending: false }).limit(60),
      supabase.from('bixtok_lives').select('id,host_id,host_name,title,started_at').eq('status', 'live').order('started_at', { ascending: false }),
      supabase.rpc('bixtok_my_stake_usd'),
    ]);
    if (c.error) throw c.error;
    const rows = (v.data ?? []) as Omit<Video, 'src'>[];
    const paths = rows.map(r => r.media_path).filter(Boolean) as string[];
    const signed = paths.length ? (await supabase.storage.from('bixtok-media').createSignedUrls(paths, 3600)).data ?? [] : [];
    const map = new Map(signed.map(x => [x.path, x.signedUrl]));
    const videos = rows.map(r => ({ ...r, src: r.media_path ? map.get(r.media_path) ?? '' : r.video_url })).filter(r => r.src);
    return { cfg: c.data as unknown as Cfg, gifts: (g.data ?? []) as Gift[], videos, lives: (l.data ?? []) as Live[], stake: Number(s.data ?? 0) };
  } });
  const menus = (q.data?.cfg.menus ?? []).filter(m => m.enabled);
  const [tab, setTab] = useState('foryou');
  const [giftTarget, setGiftTarget] = useState<{ video?: string; live?: string } | null>(null);
  const [room, setRoom] = useState<Live | null>(null);
  const [studio, setStudio] = useState(false);
  const [note, setNote] = useState('');
  const qc = useQueryClient();
  const [muted, setMuted] = useState(true);
  useEffect(() => { if (!note) return undefined; const t = setTimeout(() => setNote(''), 3500); return () => clearTimeout(t); }, [note]);
  const vids = q.data ? (tab === 'following' ? q.data.videos.filter(v => v.creator_id) : tab === 'mine' ? q.data.videos.filter(v => v.creator_id === user?.id) : q.data.videos) : [];

  return <MemberGate ready={ready} signedIn={!!user} title="BIXTOK"><main className="bixtok">
    {q.isError ? <p className="p-8 text-sm text-destructive">Could not load BIXTOK.</p>
     : !q.data ? <div className="bixtok-skeleton"/>
     : !q.data.cfg.enabled ? <div className="grid h-full place-items-center p-8 text-center"><div><Lock className="mx-auto"/><p className="mt-3 font-bold">BIXTOK is closed right now.</p><Link to="/dashboard" className="mt-4 inline-block text-sm underline">Back</Link></div></div>
     : <>
      <header className="bixtok-top">
        <Link to="/dashboard" aria-label="Back" className="bixtok-icon"><ArrowLeft size={20}/></Link>
        <nav className="bixtok-tabs">{menus.map(m => <button key={m.key} className={tab === m.key ? 'on' : ''} onClick={() => setTab(m.key)}>{m.key === 'live' && <i className="bixtok-dot"/>}{m.label}</button>)}<button className={tab === 'mine' ? 'on' : ''} onClick={() => setTab('mine')}>Me</button></nav>
        <button aria-label={muted ? "Turn sound on" : "Turn sound off"} className="bixtok-icon" onClick={() => setMuted(m => !m)}>{muted ? <VolumeX size={18}/> : <Volume2 size={18}/>}</button>
      </header>
      <div className="bixtok-brand"><img src={bixtokLogo} alt="BIXTOK" width={28} height={28}/><b>BIX<span>TOK</span></b></div>
      {tab === 'live'
        ? <LiveLobby data={q.data} onEnter={setRoom} onNote={setNote}/>
        : <Feed muted={muted} videos={vids} cfg={q.data.cfg} me={user!.id} onGift={id => setGiftTarget({ video: id })} onNote={setNote}/>}
      {q.data.cfg.features['upload'] !== false && !studio && !room && <button className="bixtok-create" aria-label="Create post" onClick={() => setStudio(true)}><Plus/></button>}
      {studio && <BixtokStudio userId={user!.id} onClose={() => setStudio(false)} onDone={m => { setStudio(false); setNote(m); setTab('mine'); qc.invalidateQueries({ queryKey: ['bixtok'] }); }}/>}
      {room && <LiveRoom live={room} me={user!.id} cfg={q.data.cfg} onClose={() => setRoom(null)} onGift={() => setGiftTarget({ live: room.id })}/>}
      {giftTarget && <GiftSheet gifts={q.data.gifts.filter(g => q.data!.cfg.features[g.currency === 'BIX' ? 'bix_gifts' : 'bixp_gifts'] !== false)} target={giftTarget} closed={!q.data.cfg.gifts_enabled} onClose={() => setGiftTarget(null)} onNote={setNote}/>}
      {note && <div className="bixtok-toast" role="status">{note}</div>}
    </>}
  </main></MemberGate>;
}

function Feed({ muted, videos, cfg, me, onGift, onNote }: { muted: boolean; videos: Video[]; cfg: Cfg; me: string; onGift: (id: string) => void; onNote: (m: string) => void }) {
  const qc = useQueryClient();
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  if (!videos.length) return <p className="grid h-full place-items-center text-sm text-muted-foreground">No posts yet. Tap + to create one.</p>;
  return <div className="bixtok-feed">{videos.map(v => <section key={v.id} className="bixtok-slide">
    {v.media_kind === 'photo'
      ? <img src={v.src} alt={v.caption} className="bixtok-video" style={{ filter: filterCss(v.filter) }}/>
      : <AutoVideo src={v.src} filter={v.filter} muted={muted}/>}
    {v.overlay && <span className="studio-overlay">{v.overlay}</span>}
    <div className="bixtok-meta"><b>@{v.creator_name}</b><p>{v.caption}</p></div>
    <aside className="bixtok-rail">
      {cfg.features['likes'] !== false && <button aria-label="Like" className={liked[v.id] ? 'on' : ''} onClick={async () => { if (liked[v.id]) return; setLiked({ ...liked, [v.id]: true }); await supabase.rpc('bixtok_like', { p_video: v.id }); qc.invalidateQueries({ queryKey: ['bixtok'] }); }}><Heart/><small>{v.likes + (liked[v.id] ? 1 : 0)}</small></button>}
      {cfg.features['share'] !== false && <button aria-label="Share" onClick={async () => { const url = `${location.origin}/bixtok`; try { if (navigator.share) await navigator.share({ title: 'BIXTOK', text: v.caption, url }); else { await navigator.clipboard.writeText(url); onNote('Link copied'); } } catch { /* cancelled */ } }}><Share2/><small>Share</small></button>}
      <button aria-label="Send gift" className="gift" onClick={() => v.creator_id && v.allow_gifts !== false ? onGift(v.id) : onNote('This post cannot receive gifts.')}><Gift/><small>Gift</small></button>
      {v.creator_id === me && <button aria-label="Delete" onClick={async () => { if (!confirm('Delete this post?')) return; await supabase.from('bixtok_videos').delete().eq('id', v.id); if (v.media_path) await supabase.storage.from('bixtok-media').remove([v.media_path]); qc.invalidateQueries({ queryKey: ['bixtok'] }); onNote('Post deleted'); }}><Trash2/><small>Delete</small></button>}
    </aside>
  </section>)}</div>;
}

function AutoVideo({ src, filter, muted }: { src: string; filter?: string | null; muted: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { const el = ref.current; if (!el) return; const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) el.play().catch(() => {}); else el.pause(); }, { threshold: 0.6 }); io.observe(el); return () => io.disconnect(); }, []);
  return <video ref={ref} src={src} loop muted={muted} playsInline preload="metadata" className="bixtok-video" style={{ filter: filterCss(filter) }}/>;
}

function LiveLobby({ data, onEnter, onNote }: { data: { cfg: Cfg; lives: Live[]; stake: number }; onEnter: (l: Live) => void; onNote: (m: string) => void }) {
  const qc = useQueryClient(); const [title, setTitle] = useState(''); const [busy, setBusy] = useState(false);
  const eligible = data.stake > 0 && data.stake >= Number(data.cfg.live_min_stake_usd);
  return <div className="bixtok-lobby">
    <div className="bixtok-golive">
      <h2><Radio size={18}/> Go LIVE</h2>
      {!data.cfg.live_enabled ? <p className="text-xs text-muted-foreground">Go LIVE is closed by the admin right now.</p>
       : eligible ? <form onSubmit={async e => { e.preventDefault(); setBusy(true);
          const { data: id, error } = await supabase.rpc('bixtok_start_live', { p_title: title });
          setBusy(false); if (error) return onNote(error.message);
          await qc.invalidateQueries({ queryKey: ['bixtok'] });
          const { data: me } = await supabase.auth.getUser();
          onEnter({ id: id as string, host_id: me.user!.id, host_name: 'You', title: title || 'BIXTOK LIVE', started_at: new Date().toISOString() }); }}>
          <input className="form-input" maxLength={80} placeholder="LIVE title" value={title} onChange={e => setTitle(e.target.value)}/>
          <button className="bixtok-cta" disabled={busy}>{busy ? 'Starting…' : 'Start LIVE'}</button>
        </form>
       : <div><p className="text-xs text-muted-foreground">Go LIVE is open to members with an active staking package{Number(data.cfg.live_min_stake_usd) > 0 ? ` of at least $${Number(data.cfg.live_min_stake_usd).toFixed(2)}` : ''}.</p><Link to="/stake" className="bixtok-cta mt-3 inline-block">Join a staking package</Link></div>}
    </div>
    <h3 className="mt-6 text-xs font-bold tracking-widest text-muted-foreground">LIVE NOW · {data.lives.length}</h3>
    <div className="bixtok-live-grid">{data.lives.map(l => <button key={l.id} onClick={() => onEnter(l)}><span className="bixtok-badge">LIVE</span><b>{l.title}</b><small>@{l.host_name}</small></button>)}</div>
    {!data.lives.length && <p className="mt-3 text-sm text-muted-foreground">Nobody is live yet.</p>}
  </div>;
}

function LiveRoom({ live, me, cfg, onClose, onGift }: { live: Live; me: string; cfg: Cfg; onClose: () => void; onGift: () => void }) {
  const qc = useQueryClient(); const host = live.host_id === me;
  const [msgs, setMsgs] = useState<Msg[]>([]); const [text, setText] = useState(''); const [ended, setEnded] = useState(false);
  const cam = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    supabase.from('bixtok_live_messages').select('id,name,body,kind').eq('live_id', live.id).order('created_at', { ascending: false }).limit(40).then(({ data }) => setMsgs(((data ?? []) as Msg[]).reverse()));
    const ch = supabase.channel(`bixtok-${live.id}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bixtok_live_messages', filter: `live_id=eq.${live.id}` }, p => setMsgs(m => [...m.slice(-39), p.new as Msg]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [live.id]);
  useEffect(() => {
    if (!host) return undefined; let stream: MediaStream | null = null;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user' }, audio: false }).then(s => { stream = s; if (cam.current) cam.current.srcObject = s; }).catch(() => {});
    const limit = setTimeout(() => { void stop(); }, Number(cfg.live_max_minutes) * 60_000);
    return () => { clearTimeout(limit); stream?.getTracks().forEach(t => t.stop()); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host]);
  const stop = async () => { await supabase.rpc('bixtok_end_live', { p_id: live.id }); setEnded(true); qc.invalidateQueries({ queryKey: ['bixtok'] }); };
  return <div className="bixtok-room" role="dialog" aria-label="LIVE room">
    {host ? <video ref={cam} autoPlay muted playsInline className="bixtok-video mirror"/> : <div className="bixtok-room-bg"><Radio size={42}/><p>@{live.host_name}</p></div>}
    <header className="bixtok-room-top"><span className="bixtok-badge">LIVE</span><b className="truncate">{live.title}</b>
      {host && !ended && <button className="bixtok-end" onClick={stop}>End</button>}
      <button aria-label="Close" className="bixtok-icon" onClick={onClose}><X size={18}/></button></header>
    {ended && <p className="bixtok-ended">LIVE ended</p>}
    <div className="bixtok-chat">{msgs.map(m => <p key={m.id} className={m.kind === 'gift' ? 'gift' : ''}><b>{m.name}</b> {m.body}</p>)}</div>
    <footer className="bixtok-room-bar">
      {cfg.features['comments'] !== false && <form className="flex-1" onSubmit={async e => { e.preventDefault(); const body = text.trim().slice(0, 200); if (!body) return; setText('');
        const { data: p } = await supabase.from('profiles').select('username').eq('user_id', me).maybeSingle();
        await supabase.from('bixtok_live_messages').insert({ live_id: live.id, user_id: me, name: p?.username || 'member', body }); }}>
        <div className="bixtok-input"><MessageCircle size={16}/><input value={text} onChange={e => setText(e.target.value)} placeholder="Say something…" maxLength={200}/><button aria-label="Send"><Send size={16}/></button></div>
      </form>}
      {!host && <button className="bixtok-giftbtn" aria-label="Send gift" onClick={onGift}><Gift/></button>}
    </footer>
    {host && <p className="bixtok-hint">Your camera preview is shown on your device; viewers see the room, chat and gifts.</p>}
  </div>;
}

function GiftSheet({ gifts, target, closed, onClose, onNote }: { gifts: Gift[]; target: { video?: string; live?: string }; closed: boolean; onClose: () => void; onNote: (m: string) => void }) {
  const qc = useQueryClient(); const [busy, setBusy] = useState<string | null>(null); const [burst, setBurst] = useState<string | null>(null);
  const send = async (g: Gift) => {
    setBusy(g.id);
    const { error } = await supabase.rpc('bixtok_send_gift', { p_gift: g.id, p_live: target.live ?? null, p_video: target.video ?? null } as never);
    setBusy(null);
    if (error) return onNote(error.message);
    setBurst(g.emoji); setTimeout(() => setBurst(null), 1400);
    onNote(`${g.emoji} ${g.name} sent · ${g.price} ${g.currency}`); qc.invalidateQueries();
  };
  return <div className="bixtok-sheet-wrap" onClick={onClose}><div className="bixtok-sheet" onClick={e => e.stopPropagation()}>
    <div className="flex items-center justify-between"><h3 className="font-bold">Send a gift</h3><button aria-label="Close" onClick={onClose}><X size={18}/></button></div>
    {closed ? <p className="mt-4 text-sm text-muted-foreground">Gifts are closed right now.</p> : <div className="bixtok-gifts">{gifts.map(g => <button key={g.id} disabled={!!busy} onClick={() => send(g)}><span>{g.emoji}</span><b>{g.name}</b><small>{Number(g.price)} {g.currency}</small></button>)}</div>}
    <p className="mt-3 text-[10px] text-muted-foreground">BIXP are promotional points moved to the creator; BIX gifts are internal ledger transfers to the creator. Gifts are final and are not investment returns.</p>
    {burst && <div className="bixtok-burst" aria-hidden>{burst}</div>}
  </div></div>;
}
