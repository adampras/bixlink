import bixtokLogo from '@/assets/bixtok-logo.png';
import { Volume2, VolumeX, Home, ShoppingBag, MessageSquare, User, Menu, Wallet, Clock, QrCode, Sparkles, Flame, Settings, ChevronRight, Bell, Zap, Bot, Grid3x3, Bookmark, Repeat2, Eye, ShieldCheck, Coins, Megaphone, BadgeDollarSign } from 'lucide-react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Gift, Heart, Lock, MessageCircle, Plus, Radio, Send, Share2, Trash2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MemberGate } from '@/components/MemberGate';
import { useMember } from '@/lib/useMember';
import { BixtokStudio, filterCss, DraggableText, DEFAULT_TEXT, type TextStyle } from '@/components/BixtokStudio';
import { resolveBixtokLinks, cleanTiktokVideos } from '@/lib/bixtok.functions';
import { Button } from '@/components/ui/button';
import { BixtokTikTokPlayer, BIXTOK_SOUND_EVENT } from '@/components/BixtokTikTokPlayer';

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

type Cfg = { link_slots?: number; max_links?: number; enabled: boolean; live_enabled: boolean; gifts_enabled: boolean; live_min_stake_usd: number; live_max_minutes: number; features: Record<string, boolean>; menus: { key: string; label: string; enabled: boolean }[] };
type Gift = { id: string; name: string; emoji: string; currency: string; price: number };
type Video = { id: string; creator_name: string; creator_id: string | null; caption: string; video_url: string; likes: number; media_path: string | null; media_kind: string; filter: string; overlay: string; allow_gifts: boolean; src: string; text_style: Partial<TextStyle> | null; music_title: string | null; music_url: string | null; source_kind: string; clean?: string };
type Live = { id: string; host_id: string; host_name: string; title: string; started_at: string; kind?: string };
type Msg = { id: string; name: string; body: string; kind: string };

function BixtokPage() {
  const { user, ready } = useMember();
  const q = useQuery({ queryKey: ['bixtok', user?.id], enabled: Boolean(user), refetchInterval: 60_000, queryFn: async () => {
    const [c, g, v, l, s, f, o] = await Promise.all([
      supabase.from('bixtok_config').select('*').eq('id', 1).single(),
      supabase.from('bixtok_gifts').select('id,name,emoji,currency,price').eq('enabled', true).order('sort'),
      supabase.from('bixtok_videos').select('id,creator_name,creator_id,caption,video_url,likes,media_path,media_kind,filter,overlay,allow_gifts,text_style,music_title,music_url,source_kind').eq('enabled', true).order('created_at', { ascending: false }).limit(60),
      supabase.from('bixtok_lives').select('id,host_id,host_name,title,started_at,kind').eq('status', 'live').order('started_at', { ascending: false }),
      supabase.rpc('bixtok_my_stake_usd'),
      supabase.from('bixtok_follows').select('follower_id,followee_id').or(`follower_id.eq.${user!.id},followee_id.eq.${user!.id}`),
      supabase.rpc('bixtok_am_owner1'),
    ]);
    if (c.error) throw c.error;
    const rows = (v.data ?? []) as Omit<Video, 'src'>[];
    const paths = rows.map(r => r.media_path).filter(Boolean) as string[];
    const signed = paths.length ? (await supabase.storage.from('bixtok-media').createSignedUrls(paths, 3600)).data ?? [] : [];
    const map = new Map(signed.map(x => [x.path, x.signedUrl]));
    const shorts = rows.filter(r => !r.media_path && r.source_kind === 'tiktok' && !/\/video\/\d+/.test(r.video_url)).map(r => r.video_url);
    const resolved = shorts.length ? await resolveBixtokLinks({ data: { urls: [...new Set(shorts)] } }).catch(() => ({} as Record<string, string>)) : {};
    const base = rows.map(r => ({ ...r, src: r.media_path ? map.get(r.media_path) ?? '' : resolved[r.video_url] ?? r.video_url })).filter(r => r.src);
    const full = [...new Set(base.filter(r => r.source_kind === 'tiktok' && /\/video\/\d+/.test(r.src)).map(r => r.src.split('?')[0]!))].slice(0, 12);
    const clean = full.length ? await cleanTiktokVideos({ data: { urls: full } }).catch(() => ({} as Record<string, string>)) : {};
    const videos = base.map(r => ({ ...r, clean: r.source_kind === 'tiktok' ? clean[r.src.split('?')[0]!] : undefined }));
    const fr = (f.data ?? []) as { follower_id: string; followee_id: string }[];
    const following = new Set(fr.filter(x => x.follower_id === user!.id).map(x => x.followee_id));
    const followers = new Set(fr.filter(x => x.followee_id === user!.id).map(x => x.follower_id));
    const lives = ((l.data ?? []) as Live[]).sort((a, b) => Number(b.kind === 'official') - Number(a.kind === 'official'));
    return { cfg: c.data as unknown as Cfg, gifts: (g.data ?? []) as Gift[], videos, lives, stake: Number(s.data ?? 0), following, followers, owner1: o.data === true };
  } });
  const menus = (q.data?.cfg.menus ?? []).filter(m => m.enabled);
  const [tab, setTab] = useState('foryou');
  const [giftTarget, setGiftTarget] = useState<{ video?: string; live?: string } | null>(null);
  const [room, setRoom] = useState<Live | null>(null);
  const [studio, setStudio] = useState(false);
  const [note, setNote] = useState('');
  const qc = useQueryClient();
  const toggleFollow = async (id: string) => {
    if (!q.data || id === user?.id) return;
    const on = q.data.following.has(id);
    const { error } = on ? await supabase.from('bixtok_follows').delete().eq('follower_id', user!.id).eq('followee_id', id) : await supabase.from('bixtok_follows').insert({ follower_id: user!.id, followee_id: id });
    if (error) return setNote(error.message);
    setNote(on ? 'Unfollowed' : q.data.followers.has(id) ? 'You are now friends' : 'Following');
    qc.invalidateQueries({ queryKey: ['bixtok'] });
  };
  const [muted, setMuted] = useState(true);
  const [section, setSection] = useState<'home' | 'inbox' | 'profile' | 'balance'>('home');
  useEffect(() => { if (!note) return undefined; const t = setTimeout(() => setNote(''), 3500); return () => clearTimeout(t); }, [note]);
  const vids = q.data ? (tab === 'following' ? q.data.videos.filter(v => v.creator_id && q.data!.following.has(v.creator_id)) : tab === 'mine' ? q.data.videos.filter(v => v.creator_id === user?.id) : q.data.videos) : [];

  return <MemberGate ready={ready} signedIn={!!user} title="BIXTOK"><main className="bixtok">
    {q.isError ? <p className="p-8 text-sm text-destructive">Could not load BIXTOK.</p>
     : !q.data ? <div className="bixtok-skeleton"/>
     : !q.data.cfg.enabled ? <div className="grid h-full place-items-center p-8 text-center"><div><Lock className="mx-auto"/><p className="mt-3 font-bold">BIXTOK is closed right now.</p><Link to="/dashboard" className="mt-4 inline-block text-sm underline">Back</Link></div></div>
     : <>
      {section === 'home' && <><header className="bixtok-top">
        <Link to="/dashboard" aria-label="Back" className="bixtok-icon"><ArrowLeft size={20}/></Link>
        <nav className="bixtok-tabs">{menus.map(m => <button key={m.key} className={tab === m.key ? 'on' : ''} onClick={() => setTab(m.key)}>{m.key === 'live' && <i className="bixtok-dot"/>}{m.label}</button>)}<button className={tab === 'mine' ? 'on' : ''} onClick={() => setTab('mine')}>Me</button></nav>
        <Button variant="wallet" size="wallet" aria-label={muted ? "Turn sound on" : "Turn sound off"} title={muted ? "Turn sound on" : "Turn sound off"} aria-pressed={!muted} className="bixtok-icon" onClick={() => {
          const next = !muted;
          window.dispatchEvent(new CustomEvent(BIXTOK_SOUND_EVENT, { detail: next }));
          setMuted(next);
        }}>{muted ? <VolumeX size={18}/> : <Volume2 size={18}/>}</Button>
      </header>
      <div className="bixtok-brand"><img src={bixtokLogo} alt="BIXTOK" width={28} height={28}/><b>BIX<span>TOK</span></b></div></>}
      {section === 'home' && (tab === 'live'
        ? <LiveLobby data={q.data} onEnter={setRoom} onNote={setNote}/>
        : <Feed muted={muted} videos={vids} cfg={q.data.cfg} me={user!.id} following={q.data.following} followers={q.data.followers} onFollow={toggleFollow} onGift={id => setGiftTarget({ video: id })} onNote={setNote}/>)}
      {section === 'inbox' && <Inbox followers={q.data.followers.size} lives={q.data.lives} mine={q.data.videos.filter(v => v.creator_id === user!.id)} onLive={setRoom} onCreate={() => setStudio(true)}/>}
      {section === 'profile' && <ProfilePage follow={q.data} me={user!.id} email={user!.email ?? ''} videos={q.data.videos.filter(v => v.creator_id === user!.id)} onCreate={() => setStudio(true)} onBalance={() => setSection('balance')} onOpen={() => { setSection('home'); setTab('mine'); }} onNote={setNote}/>}
      {section === 'balance' && <BalancePage stake={q.data.stake} cfg={q.data.cfg} onBack={() => setSection('profile')} onLive={() => { setSection('home'); setTab('live'); }}/>}
      {!studio && !room && section !== 'balance' && <nav className="bxt-nav" aria-label="BIXTOK">
        <button className={section === 'home' ? 'on' : ''} onClick={() => setSection('home')}><Home/><small>Home</small></button>
        <Link to="/nft-marketplace"><ShoppingBag/><small>Shop</small></Link>
        {q.data.cfg.features['upload'] !== false ? <button className="bxt-plus bxt-plus-logo" aria-label="Create post" onClick={() => setStudio(true)}><img src={bixtokLogo} alt="" width={30} height={30}/><Plus className="bxt-plus-mini"/></button> : <span/>}
        <button className={section === 'inbox' ? 'on' : ''} onClick={() => setSection('inbox')}><MessageSquare/><small>Inbox</small>{q.data.lives.length > 0 && <i className="bxt-badge">{q.data.lives.length}</i>}</button>
        <button className={section === 'profile' ? 'on' : ''} onClick={() => setSection('profile')}><User/><small>Profile</small></button>
      </nav>}
      {studio && <BixtokStudio userId={user!.id} slots={q.data.cfg.link_slots ?? 5} maxLinks={q.data.cfg.max_links ?? 10} onClose={() => setStudio(false)} onDone={m => { setStudio(false); setNote(m); setTab('mine'); qc.invalidateQueries({ queryKey: ['bixtok'] }); }}/>}
      {room && <LiveRoom live={room} me={user!.id} cfg={q.data.cfg} onClose={() => setRoom(null)} onGift={() => setGiftTarget({ live: room.id })}/>}
      {giftTarget && <GiftSheet gifts={q.data.gifts.filter(g => q.data!.cfg.features[g.currency === 'BIX' ? 'bix_gifts' : 'bixp_gifts'] !== false)} target={giftTarget} closed={!q.data.cfg.gifts_enabled} onClose={() => setGiftTarget(null)} onNote={setNote}/>}
      {note && <div className="bixtok-toast" role="status">{note}</div>}
    </>}
  </main></MemberGate>;
}

function Feed({ muted, videos, cfg, me, following, followers, onFollow, onGift, onNote }: { muted: boolean; videos: Video[]; cfg: Cfg; me: string; following: Set<string>; followers: Set<string>; onFollow: (id: string) => void; onGift: (id: string) => void; onNote: (m: string) => void }) {
  const qc = useQueryClient();
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  if (!videos.length) return <p className="grid h-full place-items-center text-sm text-muted-foreground">No posts yet. Tap + to create one.</p>;
  return <div className="bixtok-feed">{videos.map(v => <section key={v.id} className="bixtok-slide">
    <Media v={v} muted={muted}/>
    {v.overlay && <DraggableText text={v.overlay} style={{ ...DEFAULT_TEXT, ...(v.text_style ?? {}) }}/>}
    <div className="bixtok-meta"><b>@{v.creator_name}</b><p>{v.caption}</p>{v.music_title && <small className="bixtok-music">♫ {v.music_title}</small>}</div>
    <aside className="bixtok-rail">
      {v.creator_id && v.creator_id !== me && <button aria-label={following.has(v.creator_id) ? 'Unfollow' : 'Follow'} className={`bxt-follow${following.has(v.creator_id) ? ' on' : ''}`} onClick={() => onFollow(v.creator_id!)}><span>{v.creator_name.slice(0, 1).toUpperCase()}</span><em>{following.has(v.creator_id) ? (followers.has(v.creator_id) ? '⇄' : '✓') : '+'}</em><small>{following.has(v.creator_id) ? (followers.has(v.creator_id) ? 'Friends' : 'Following') : 'Follow'}</small></button>}
      {cfg.features['likes'] !== false && <button aria-label="Like" className={liked[v.id] ? 'on' : ''} onClick={async () => { if (liked[v.id]) return; setLiked({ ...liked, [v.id]: true }); await supabase.rpc('bixtok_like', { p_video: v.id }); qc.invalidateQueries({ queryKey: ['bixtok'] }); }}><Heart/><small>{v.likes + (liked[v.id] ? 1 : 0)}</small></button>}
      {cfg.features['share'] !== false && <button aria-label="Share" onClick={async () => { const url = `${location.origin}/bixtok`; try { if (navigator.share) await navigator.share({ title: 'BIXTOK', text: v.caption, url }); else { await navigator.clipboard.writeText(url); onNote('Link copied'); } } catch { /* cancelled */ } }}><Share2/><small>Share</small></button>}
      <button aria-label="Send gift" className="gift" onClick={() => v.creator_id && v.allow_gifts !== false ? onGift(v.id) : onNote('This post cannot receive gifts.')}><Gift/><small>Gift</small></button>
      {v.creator_id === me && <button aria-label="Delete" onClick={async () => { if (!confirm('Delete this post?')) return; await supabase.from('bixtok_videos').delete().eq('id', v.id); if (v.media_path) await supabase.storage.from('bixtok-media').remove([v.media_path]); qc.invalidateQueries({ queryKey: ['bixtok'] }); onNote('Post deleted'); }}><Trash2/><small>Delete</small></button>}
    </aside>
  </section>)}</div>;
}

function embedUrl(u: string): string | null {
  try {
    const x = new URL(u); const h = x.hostname.replace(/^www\.|^m\./, '');
    if (h.endsWith('tiktok.com')) { const id = x.pathname.match(/(?:video|photo|v)\/(\d+)/)?.[1] ?? x.searchParams.get('item_id') ?? u.match(/(\d{15,})/)?.[1]; return id ? `https://www.tiktok.com/player/v1/${id}?autoplay=1&loop=1&music_info=1&description=1&rel=0` : null; }
    if (h === 'youtu.be') return `https://www.youtube.com/embed/${x.pathname.slice(1)}?playsinline=1&loop=1`;
    if (h.endsWith('youtube.com')) { const id = x.searchParams.get('v') ?? x.pathname.match(/(?:shorts|embed)\/([\w-]+)/)?.[1]; return id ? `https://www.youtube.com/embed/${id}?playsinline=1&loop=1` : null; }
    if (h.endsWith('instagram.com')) { const m = x.pathname.match(/\/(p|reel|reels)\/([\w-]+)/); return m ? `https://www.instagram.com/${m[1] === 'p' ? 'p' : 'reel'}/${m[2]}/embed` : null; }
  } catch { /* invalid */ }
  return null;
}

function Media({ v, muted }: { v: Video; muted: boolean }) {
  const embed = !v.media_path ? embedUrl(v.src) : null;
  const ref = useRef<HTMLDivElement>(null); const [show, setShow] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => { const el = ref.current; if (!el) return; const io = new IntersectionObserver(([e]) => setShow(!!e?.isIntersecting), { threshold: 0.6 }); io.observe(el); return () => io.disconnect(); }, []);
  useEffect(() => { if (!v.music_url) return undefined; if (show && !muted) { audio.current ??= new Audio(v.music_url); audio.current.loop = true; audio.current.play().catch(() => {}); } else audio.current?.pause(); return () => audio.current?.pause(); }, [show, muted, v.music_url]);
  return <div ref={ref} className="bixtok-media">
    {v.clean ? <AutoVideo src={v.clean} filter={v.filter} muted={muted || !!v.music_url}/> : embed ? (show ? (new URL(embed).hostname === 'www.tiktok.com'
      ? <BixtokTikTokPlayer src={embed} title={v.caption || 'BIXTOK post'} muted={muted} className="bixtok-embed" filter={filterCss(v.filter)}/>
      : <iframe src={embed} title={v.caption || 'BIXTOK post'} className="bixtok-embed" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen style={{ filter: filterCss(v.filter) }}/>) : <div className="bixtok-embed"/>)
     : v.media_kind === 'photo' ? <img src={v.src} alt={v.caption} className="bixtok-video" style={{ filter: filterCss(v.filter) }}/>
     : <AutoVideo src={v.src} filter={v.filter} muted={muted || !!v.music_url}/>}
    {embed && !v.clean && <a href={v.src} target="_blank" rel="noreferrer" className="bixtok-src">{v.source_kind}</a>}
  </div>;
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

function Inbox({ followers, lives, mine, onLive, onCreate }: { followers: number; lives: Live[]; mine: Video[]; onLive: (l: Live) => void; onCreate: () => void }) {
  const likes = mine.reduce((a, v) => a + Number(v.likes || 0), 0);
  return <div className="bxt-page"><header className="bxt-head"><span/><h1>Inbox <i className="bxt-online"/></h1><span/></header>
    <div className="bxt-stories">
      <button onClick={onCreate}><span className="bxt-av"><Plus size={20}/></span><small>Create</small></button>
      {lives.map(l => <button key={l.id} onClick={() => onLive(l)}><span className={`bxt-av ring${l.kind === 'official' ? ' official' : ''}`}>{l.host_name.slice(0, 1).toUpperCase()}<em>{l.kind === 'official' ? 'OFFICIAL' : 'LIVE'}</em></span><small>{l.host_name}</small></button>)}
    </div>
    <ul className="bxt-list">
      <li><span className="bxt-ic pink"><Zap/></span><div><b>Activity & new likes</b><p>{likes ? `${likes} likes across ${mine.length} posts` : 'No activity yet'}</p></div>{likes > 0 && <i className="bxt-count">{Math.min(likes, 99)}</i>}</li>
      {lives.filter(l => l.kind === 'official').map(l => <li key={l.id}><button type="button" className="contents" onClick={() => onLive(l)}><span className="bxt-ic orange"><Radio/></span><div><b>🔴 OFFICIAL LIVE</b><p>{l.title} · tap to join</p></div><ChevronRight size={16}/></button></li>)}
      <li><span className="bxt-ic dark"><Bell/></span><div><b>System notifications</b><p>{lives.length ? `${lives.length} LIVE right now` : 'BIXTOK updates appear here'}</p></div></li>
      <li><span className="bxt-ic matcha"><User/></span><div><b>New followers</b><p>{followers ? `${followers} people follow you` : 'No followers yet'}</p></div></li>
      <li><Link to="/nft-marketplace" className="contents"><span className="bxt-ic orange"><ShoppingBag/></span><div><b>Shop messages</b><p>Open the BIXLINK marketplace</p></div><ChevronRight size={16}/></Link></li>
      <li><span className="bxt-ic matcha"><Bot/></span><div><b>FOX AI</b><p>Ask anything about BIXLINK</p></div></li>
    </ul></div>;
}

function ProfilePage({ follow, me, email, videos, onCreate, onBalance, onOpen, onNote }: { follow: { following: Set<string>; followers: Set<string> }; me: string; email: string; videos: Video[]; onCreate: () => void; onBalance: () => void; onOpen: () => void; onNote: (m: string) => void }) {
  const p = useQuery({ queryKey: ['bixtok-profile', me], queryFn: async () => (await supabase.from('profiles').select('username').eq('user_id', me).maybeSingle()).data });
  const [drawer, setDrawer] = useState(false); const [ptab, setPtab] = useState('grid');
  const name = p.data?.username || email.split('@')[0] || 'member';
  const likes = videos.reduce((a, v) => a + Number(v.likes || 0), 0);
  const copy = async () => { try { await navigator.clipboard.writeText(`${location.origin}/bixtok`); onNote('Profile link copied'); } catch { /* ignore */ } };
  return <div className="bxt-page"><header className="bxt-head"><button aria-label="Create" onClick={onCreate}><Sparkles size={20}/></button><span/><button aria-label="Menu" onClick={() => setDrawer(true)}><Menu size={22}/></button></header>
    <section className="bxt-prof"><div><h1>{name}</h1><small>@{name.toLowerCase()}</small>
      <div className="bxt-stats"><p><b>{follow.following.size}</b>Following</p><p><b>{follow.followers.size}</b>Followers</p><p><b>{[...follow.following].filter(x => follow.followers.has(x)).length}</b>Friends</p><p><b>{likes}</b>Likes</p></div></div>
      <button className="bxt-bigav" onClick={onCreate}>{name.slice(0, 1).toUpperCase()}<em><Plus size={14}/></em></button></section>
    <p className="bxt-bio">BIXLINK member · Web3 creator</p>
    <Link to="/nft-marketplace" className="bxt-pill"><ShoppingBag size={14}/> Your orders</Link>
    <div className="bxt-ptabs">{[['grid', Grid3x3], ['private', Lock], ['repost', Repeat2], ['saved', Bookmark], ['liked', Heart]].map(([k, I]) => { const Ic = I as typeof Heart; return <button key={k as string} className={ptab === k ? 'on' : ''} onClick={() => setPtab(k as string)} aria-label={k as string}><Ic size={20}/></button>; })}</div>
    {ptab === 'grid' && videos.length ? <div className="bxt-grid">{videos.map(v => <button key={v.id} onClick={onOpen}>{v.media_kind === 'photo' ? <img src={v.src} alt=""/> : <video src={v.src} muted preload="metadata"/>}<small><Eye size={12}/> {v.likes}</small></button>)}</div>
      : <p className="p-10 text-center text-sm text-muted-foreground">{ptab === 'grid' ? 'No posts yet. Tap + to create.' : 'Nothing here yet.'}</p>}
    {drawer && <div className="bxt-drawer-wrap" onClick={() => setDrawer(false)}><aside className="bxt-drawer" onClick={e => e.stopPropagation()}>
      <h4>Assets</h4><button onClick={() => { setDrawer(false); onBalance(); }}><Wallet/>Balance<ChevronRight/></button>
      <h4>Personal tools</h4>
      <Link to="/wallet"><Clock/>Activity center<ChevronRight/></Link>
      <button onClick={copy}><QrCode/>Your profile link<ChevronRight/></button>
      <h4>Creator & business</h4>
      <button onClick={() => { setDrawer(false); onCreate(); }}><Sparkles/>BIXTOK Studio<ChevronRight/></button>
      <Link to="/network" ><Flame/>Promote<ChevronRight/></Link>
      <hr/><Link to="/settings"><Settings/>Settings and privacy<ChevronRight/></Link>
    </aside></div>}
  </div>;
}

function BalancePage({ stake, cfg, onBack, onLive }: { stake: number; cfg: Cfg; onBack: () => void; onLive: () => void }) {
  const [hide, setHide] = useState(false);
  return <div className="bxt-page bxt-bal"><header className="bxt-head"><button aria-label="Back" onClick={onBack}><ArrowLeft size={20}/></button><div className="text-center"><h1>Balance</h1><small className="bxt-safe"><ShieldCheck size={12}/> Secure</small></div><Link to="/settings" aria-label="Settings"><Settings size={20}/></Link></header>
    <p className="bxt-est">Active staking (USD) <button onClick={() => setHide(h => !h)} aria-label="Toggle"><Eye size={14}/></button></p>
    <p className="bxt-amt">{hide ? '••••' : stake.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
    <div className="bxt-coins"><Link to="/wallet"><span><Coins size={14}/> BIXP</span><b>Wallet</b><em>Get BIXP →</em></Link><Link to="/wallet"><span><Coins size={14}/> BIXCOIN</span><b>Wallet</b></Link></div>
    <Link to="/wallet" className="bxt-card"><b>Transactions</b><span>Gift history <ChevronRight size={14}/></span></Link>
    <Link to="/stake" className="bxt-card"><div><b>Join a staking package</b><p>Unlock Go LIVE{Number(cfg.live_min_stake_usd) > 0 ? ` from $${Number(cfg.live_min_stake_usd).toFixed(0)}` : ''}</p></div><Gift className="bxt-gifticon"/></Link>
    <div className="bxt-tools">
      <button onClick={onLive}><span><Radio/></span>LIVE rewards</button>
      <Link to="/network"><span><BadgeDollarSign/></span>Monetize</Link>
      <Link to="/arena"><span><Megaphone/></span>Campaigns</Link>
      <Link to="/stake"><span><Flame/></span>Staking</Link>
      <Link to="/market"><span><Zap/></span>Market</Link>
    </div>
    <p className="bxt-disc">Gifts are final and are not investment returns. Balances shown are internal ledger references.</p>
  </div>;
}
