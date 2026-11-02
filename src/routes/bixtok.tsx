import { CallButtons } from '@/components/BixCall';
import bixtokLogo from '@/assets/bixtok-logo.png';
import { noteInterest, rankForYou, readAffinity } from '@/lib/bixtok-foryou';
import { luxConfirm } from '@/lib/bixtok-confirm';
import { useVipHosts, VipBadge } from '@/lib/bixtok-vip';
import { Volume2, VolumeX, Home, ShoppingBag, MessageSquare, User, Menu, Wallet, Clock, QrCode, Sparkles, Flame, Settings, ChevronRight, Bell, Zap, Bot, Grid3x3, Bookmark, Repeat2, Eye, ShieldCheck, Coins, Megaphone, BadgeDollarSign, Minimize2 } from 'lucide-react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Gift, Heart, Lock, MessageCircle, Plus, Radio, Send, Share2, Trash2, X, Star, Users, UserCheck, Compass, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { MemberGate } from '@/components/MemberGate';
import { useMember } from '@/lib/useMember';
import { BixtokStudio, filterCss, DraggableText, DEFAULT_TEXT, type TextStyle } from '@/components/BixtokStudio';
import { resolveBixtokLinks, cleanTiktokVideos } from '@/lib/bixtok.functions';
import { bixtokMini, useBixtokMini } from '@/lib/bixtok-mini';
import { Button } from '@/components/ui/button';
import { BixtokTikTokPlayer, BIXTOK_SOUND_EVENT } from '@/components/BixtokTikTokPlayer';
import { copyText } from '@/lib/copy-text';

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

const TAB_ICONS: Record<string, typeof Heart> = { foryou: Sparkles, live: Radio, following: UserCheck, favorite: Star, friends: Users, explore: Compass, nearby: MapPin, mine: User };
type Cfg = { challenge_enabled?: boolean; challenge_tag?: string | null; challenge_title?: string | null; challenge_prize?: string | null; challenge_ends_at?: string | null; clips_enabled?: boolean; link_slots?: number; max_links?: number; enabled: boolean; live_enabled: boolean; gifts_enabled: boolean; live_min_stake_usd: number; live_host_min_stake_usd?: number; live_max_minutes: number; features: Record<string, boolean>; menus: { key: string; label: string; enabled: boolean }[]; stage_max?: number; live_cta?: boolean; host_gifts?: boolean; replay_enabled?: boolean; soundboard?: boolean; pk_enabled?: boolean; showcase_enabled?: boolean };
type Sched = { id: string; title: string; host_name: string; starts_at: string; reminded: boolean; count: number };
type Gift = { id: string; name: string; emoji: string; currency: string; price: number };
type Video = { id: string; creator_name: string; creator_id: string | null; caption: string; video_url: string; likes: number; media_path: string | null; media_kind: string; filter: string; overlay: string; allow_gifts: boolean; src: string; text_style: Partial<TextStyle> | null; music_title: string | null; music_url: string | null; source_kind: string; clean?: string | undefined };
type Live = { id: string; host_id: string; host_name: string; title: string; started_at: string; kind?: string };
type Msg = { id: string; name: string; body: string; kind: string };

function BixtokPage() {
  const navigate = useNavigate();
  useEffect(() => { bixtokMini.setFeed(null); }, []);
  const { user, ready } = useMember();
  const q = useQuery({ queryKey: ['bixtok', user?.id], enabled: Boolean(user), refetchInterval: 60_000, queryFn: async () => {
    const [c, g, v, l, s, f, o, sc, rm, rc, bp] = await Promise.all([
      supabase.from('bixtok_config').select('*').eq('id', 1).single(),
      supabase.from('bixtok_gifts').select('id,name,emoji,currency,price').eq('enabled', true).order('sort'),
      supabase.from('bixtok_videos').select('id,creator_name,creator_id,caption,video_url,likes,media_path,media_kind,filter,overlay,allow_gifts,text_style,music_title,music_url,source_kind').eq('enabled', true).order('created_at', { ascending: false }).limit(60),
      supabase.from('bixtok_lives').select('id,host_id,host_name,title,started_at,kind').eq('status', 'live').order('started_at', { ascending: false }),
      supabase.rpc('bixtok_my_stake_usd'),
      supabase.from('bixtok_follows').select('follower_id,followee_id').or(`follower_id.eq.${user!.id},followee_id.eq.${user!.id}`),
      supabase.rpc('bixtok_am_official'),
      supabase.from('bixtok_live_schedules').select('id,title,host_name,starts_at').eq('status', 'scheduled').gte('starts_at', new Date(Date.now() - 3 * 3600_000).toISOString()).order('starts_at').limit(10),
      supabase.from('bixtok_live_reminders').select('schedule_id, bixtok_live_schedules(starts_at)').eq('user_id', user!.id),
      supabase.rpc('bixtok_reminder_counts'),
      supabase.rpc('bixtok_can_bypass'),
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
    const remRows = (rm.data ?? []) as { schedule_id: string; bixtok_live_schedules: { starts_at: string } | null }[];
    const mineR = new Set(remRows.map(r => r.schedule_id));
    const counts = new Map(((rc.data ?? []) as { schedule_id: string; n: number }[]).map(r => [r.schedule_id, Number(r.n)]));
    const remindedAny = remRows.some(r => r.bixtok_live_schedules && Math.abs(new Date(r.bixtok_live_schedules.starts_at).getTime() - Date.now()) < 6 * 3600_000);
    const schedules: Sched[] = ((sc.data ?? []) as Omit<Sched, 'reminded' | 'count'>[]).map(x => ({ ...x, reminded: mineR.has(x.id), count: counts.get(x.id) ?? 0 }));
    return { cfg: c.data as unknown as Cfg, gifts: (g.data ?? []) as Gift[], videos, lives, stake: Number(s.data ?? 0), following, followers, owner1: o.data === true, bypass: bp.data === true, uid: user!.id, schedules, remindedAny };
  } });
  const following = q.data?.following instanceof Set ? q.data.following : new Set<string>();
  const followers = q.data?.followers instanceof Set ? q.data.followers : new Set<string>();
  const menus = (q.data?.cfg.menus ?? []).filter(m => m.enabled);
  const [tab, setTab] = useState('foryou');
  const [giftTarget, setGiftTarget] = useState<GiftTarget | null>(null);
  const room = useBixtokMini().room?.live as Live | undefined ?? null;
  const setRoom = (l: Live | null) => { if (!l) return bixtokMini.close(); if (!q.data) return; bixtokMini.open({ live: l, me: user!.id, cfg: q.data.cfg, following: following.has(l.host_id), onFollow: () => toggleFollowRef.current(l.host_id), onGift: (recipients) => setGiftTarget({ live: l.id, recipients }) }); };
  const toggleFollowRef = useRef<(id: string) => void>(() => {});
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || !q.data) return;
    const id = new URLSearchParams(window.location.search).get('live'); if (!id) return;
    opened.current = true;
    const l = q.data.lives.find(x => x.id === id);
    if (l) setRoom(l); else setNote('This LIVE has ended.');
  }, [q.data]);
  // "Remind me": when a reminded official LIVE starts while BIXTOK is open, alert once with a chime.
  const alerted = useRef(new Set<string>());
  useEffect(() => {
    if (!q.data || room) return;
    const off = q.data.lives.find(l => l.kind === 'official' && !alerted.current.has(l.id));
    if (!off || !q.data.remindedAny) return;
    alerted.current.add(off.id);
    setNote(`🔴 OFFICIAL LIVE started: ${off.title}`);
    try { const c = new AudioContext(); [660, 880, 1175].forEach((f, i) => { const o = c.createOscillator(); const g = c.createGain(); o.frequency.value = f; g.gain.setValueAtTime(0.1, c.currentTime + i * 0.15); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + i * 0.15 + 0.3); o.connect(g).connect(c.destination); o.start(c.currentTime + i * 0.15); o.stop(c.currentTime + i * 0.15 + 0.32); }); } catch { /* no audio */ }
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') { try { new Notification('BIXTOK OFFICIAL LIVE', { body: off.title }); } catch { /* unsupported */ } }
  }, [q.data, room]);
  const [studio, setStudio] = useState(false);
  const [note, setNote] = useState('');
  const qc = useQueryClient();
  const toggleFollow = async (id: string) => {
    if (!q.data || id === user?.id) return;
    const on = following.has(id);
    const { error } = on ? await supabase.from('bixtok_follows').delete().eq('follower_id', user!.id).eq('followee_id', id) : await supabase.from('bixtok_follows').insert({ follower_id: user!.id, followee_id: id });
    if (error) return setNote(error.message);
    setNote(on ? 'Unfollowed' : followers.has(id) ? 'You are now friends' : 'Following');
    qc.invalidateQueries({ queryKey: ['bixtok'] });
  };
  toggleFollowRef.current = (id: string) => { void toggleFollow(id); };
  useEffect(() => { if (room) bixtokMini.update({ following: following.has(room.host_id) }); }, [room?.host_id, following.has(room?.host_id ?? '')]);
  const [muted, setMuted] = useState(false);
  const [section, setSection] = useState<'home' | 'inbox' | 'profile' | 'balance'>('home');
  useEffect(() => { if (!note) return undefined; const t = setTimeout(() => setNote(''), 3500); return () => clearTimeout(t); }, [note]);
  const [tag, setTag] = useState('');
  const baseVids = q.data ? (tab === 'following' ? q.data.videos.filter(v => v.creator_id && following.has(v.creator_id)) : tab === 'mine' ? q.data.videos.filter(v => v.creator_id === user?.id) : q.data.videos) : [];
  const tags = [...new Set(baseVids.flatMap(v => (v.caption.match(/#[\p{L}\d_]+/gu) ?? []).map(t => t.toLowerCase())))].slice(0, 12);
  const rankKey = q.data ? q.data.videos.map(v => v.id).join(',') : '';
  const forYou = useMemo(() => (q.data ? rankForYou(q.data.videos, readAffinity(), following) : []), [rankKey, tab]); // eslint-disable-line react-hooks/exhaustive-deps
  const ranked = tab === 'following' || tab === 'mine' ? baseVids : forYou;
  const vids = tag ? ranked.filter(v => v.caption.toLowerCase().includes(tag)) : ranked;
  const ch = q.data?.cfg; const chOpen = !!(ch?.challenge_enabled && ch.challenge_tag && (!ch.challenge_ends_at || new Date(ch.challenge_ends_at).getTime() > Date.now()));
  const chTag = chOpen ? `#${String(ch!.challenge_tag).replace(/^#/, '').toLowerCase()}` : '';
  const top = q.data ? [...q.data.videos.reduce((m, v) => { if (!v.creator_id) return m; const c = m.get(v.creator_id) ?? { name: v.creator_name, likes: 0, posts: 0 }; c.likes += Number(v.likes || 0); c.posts++; m.set(v.creator_id, c); return m; }, new Map<string, { name: string; likes: number; posts: number }>()).values()].sort((a, b) => b.likes - a.likes).slice(0, 5) : [];

  return <MemberGate ready={ready} signedIn={!!user} title="BIXTOK"><main className="bixtok">
    {q.isError ? <p className="p-8 text-sm text-destructive">Could not load BIXTOK.</p>
     : !q.data ? <div className="bixtok-skeleton"/>
     : !q.data.cfg.enabled && !q.data.bypass ? <div className="grid h-full place-items-center p-8 text-center"><div><Lock className="mx-auto"/><p className="mt-3 text-lg font-bold">BIXTOK is under reconstruction</p><p className="mt-1 text-xs text-muted-foreground">We are upgrading BIXTOK. Please check back soon.</p><Link to="/dashboard" className="mt-4 inline-block text-sm underline">Back</Link></div></div>
     : <>
      {section === 'home' && <><header className="bixtok-top">
        <Link to="/dashboard" aria-label="Back" className="bixtok-icon"><ArrowLeft size={20}/></Link>
        <nav className="bixtok-tabs">{menus.map(m => { const Ic = TAB_ICONS[m.key] ?? Sparkles; return <button key={m.key} className={`${tab === m.key ? 'on' : ''}${m.key === 'live' ? ' is-live' : ''}`} onClick={() => setTab(m.key)}><Ic size={13} strokeWidth={2.4}/>{m.label}</button>; })}<button className={tab === 'mine' ? 'on' : ''} onClick={() => setTab('mine')}><User size={13} strokeWidth={2.4}/>Me</button></nav>
        <Button variant="wallet" size="wallet" aria-label={muted ? "Turn sound on" : "Turn sound off"} title={muted ? "Turn sound on" : "Turn sound off"} aria-pressed={!muted} className="bixtok-icon" onClick={() => {
          const next = !muted;
          window.dispatchEvent(new CustomEvent(BIXTOK_SOUND_EVENT, { detail: next }));
          setMuted(next);
        }}>{muted ? <VolumeX size={18}/> : <Volume2 size={18}/>}</Button>
        <button type="button" aria-label="Mini mode" title="Mini mode" className="bixtok-icon" onClick={() => {
          const v = (currentVid && vids.find(x => x.id === currentVid!.id)) || vids[0]; if (v) { const e = !v.media_path ? embedUrl(v.src) : null; bixtokMini.setFeed(e ? { src: e, kind: 'iframe', title: v.caption, id: v.id } : { src: v.clean ?? v.src, kind: v.media_kind === 'photo' ? 'img' : 'video', title: v.caption, id: v.id }); }
          if (window.history.length > 1) window.history.back(); else void navigate({ to: '/dashboard' });
        }}><Minimize2 size={18}/></button>
      </header>
      <div className="bixtok-brand"><img src={bixtokLogo} alt="BIXTOK" width={40} height={40}/></div></>}
      {section === 'home' && (tab === 'live'
        ? <>{top.length > 0 && <div className="bxt-board" aria-label="Top creators"><b>🏆 Top creators</b>{top.map((c, i) => <span key={c.name + i}><i>{['👑','🥈','🥉','4','5'][i]}</i>@{c.name}<small>{fmtCount(c.likes)} ♥</small></span>)}</div>}<LiveLobby data={q.data} onEnter={setRoom} onNote={setNote}/></>
        : <>{chOpen && tab !== 'mine' && <button type="button" className={`bxt-challenge${tag === chTag ? ' on' : ''}`} onClick={() => setTag(t => (t === chTag ? '' : chTag))}><span>🏆 Weekly challenge</span><b>{ch!.challenge_title || chTag}</b><small>{chTag}{ch!.challenge_prize ? ` · Prize: ${ch!.challenge_prize}` : ''}{ch!.challenge_ends_at ? ` · ends ${new Date(ch!.challenge_ends_at).toLocaleDateString()}` : ''}{tag === chTag ? ' · showing entries' : ' · tap to see entries'}</small></button>}<Feed muted={muted} videos={vids} cfg={q.data.cfg} me={user!.id} following={following} followers={followers} onFollow={toggleFollow} onGift={id => setGiftTarget({ video: id })} onNote={setNote} liveHosts={new Map(q.data.lives.map(l => [l.host_id, l]))} onEnterLive={setRoom}/></>)}
      {section === 'inbox' && <Inbox followers={followers.size} lives={q.data.lives} mine={q.data.videos.filter(v => v.creator_id === user!.id)} onLive={setRoom} onCreate={() => setStudio(true)}/>}
      {section === 'profile' && <ProfilePage follow={{ following, followers }} me={user!.id} email={user!.email ?? ''} videos={q.data.videos.filter(v => v.creator_id === user!.id)} all={q.data.videos} onCreate={() => setStudio(true)} onBalance={() => setSection('balance')} onOpen={() => { setSection('home'); setTab('mine'); }} onNote={setNote}/>}
      {section === 'balance' && <BalancePage stake={q.data.stake} cfg={q.data.cfg} onBack={() => setSection('profile')} onLive={() => { setSection('home'); setTab('live'); }}/>}
      {!studio && !room && section !== 'balance' && <nav className="bxt-nav" aria-label="BIXTOK">
        <button className={section === 'home' ? 'on' : ''} onClick={() => setSection('home')}><Home/><small>Home</small></button>
        <button className={`bxt-live-tab${section === 'home' && tab === 'live' ? ' on' : ''}`} aria-label="LIVE" onClick={() => { setSection('home'); setTab('live'); }}><span className="bxt-live-ic"><Radio size={16}/><em>LIVE</em></span><small>LIVE{q.data.lives.length > 0 ? ` · ${q.data.lives.length}` : ''}</small></button>
        {q.data.cfg.features['upload'] !== false ? <button className="bxt-plus bxt-plus-logo" aria-label="Create post" onClick={() => setStudio(true)}><img src={bixtokLogo} alt="" width={30} height={30}/><Plus className="bxt-plus-mini"/></button> : <span/>}
        <button className={section === 'inbox' ? 'on' : ''} onClick={() => setSection('inbox')}><MessageSquare/><small>Inbox</small>{q.data.lives.length > 0 && <i className="bxt-badge">{q.data.lives.length}</i>}</button>
        <button className={section === 'profile' ? 'on' : ''} onClick={() => setSection('profile')}><User/><small>Profile</small></button>
      </nav>}
      {studio && <BixtokStudio userId={user!.id} slots={q.data.cfg.link_slots ?? 5} maxLinks={q.data.cfg.max_links ?? 10} onClose={() => setStudio(false)} onDone={m => { setStudio(false); setNote(m); setTab('mine'); qc.invalidateQueries({ queryKey: ['bixtok'] }); }}/>}
      {giftTarget && <GiftSheet gifts={q.data.gifts.filter(g => q.data!.cfg.features[g.currency === 'BIX' ? 'bix_gifts' : 'bixp_gifts'] !== false)} target={giftTarget} closed={!q.data.cfg.gifts_enabled} onClose={() => setGiftTarget(null)} onNote={setNote}/>}
      {note && <div className="bixtok-toast" role="status">{note}</div>}
    </>}
  </main></MemberGate>;
}

const SAVED_KEY='bixtok-saved';
function readSaved(): string[] { try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); } catch { return []; } }
function useSaved() { const [ids, setIds] = useState<string[]>([]); useEffect(() => setIds(readSaved()), []);
  const toggle = (id: string) => { const cur = readSaved(); const next = cur.includes(id) ? cur.filter(x => x !== id) : [id, ...cur].slice(0, 200); localStorage.setItem(SAVED_KEY, JSON.stringify(next)); setIds(next); return next.includes(id); };
  return { ids, toggle }; }

function Feed({ muted, videos, cfg, me, following = new Set<string>(), followers = new Set<string>(), onFollow, onGift, onNote, liveHosts = new Map<string, Live>(), onEnterLive }: { muted: boolean; videos: Video[]; cfg: Cfg; me: string; following?: Set<string>; followers?: Set<string>; onFollow: (id: string) => void; onGift: (id: string) => void; onNote: (m: string) => void; liveHosts?: Map<string, Live>; onEnterLive?: (l: Live) => void }) {
  const qc = useQueryClient();
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [resume] = useState(() => bixtokMini.peekLastId());
  const vip = useVipHosts(videos.map(x => x.creator_id));
  const [railOpen, setRailOpen] = useState(true); const saved = useSaved();
  const [comments, setComments] = useState<Video | null>(null);
  const [share, setShare] = useState<Video | null>(null);
  const [peek, setPeek] = useState<Video | null>(null);
  const ref = useQuery({ queryKey: ['bixtok-refcode', me], staleTime: 600_000, queryFn: async () => (await supabase.from('referral_codes').select('code').eq('user_id', me).maybeSingle()).data?.code ?? null });
  useEffect(() => { if (!resume || !videos.length) return; let n = 0; let t = 0;
    const go = () => { const el = document.querySelector(`[data-vid="${resume}"]`) as HTMLElement | null; const feed = el?.closest('.bixtok-feed') as HTMLElement | null;
      if (el && feed) { feed.style.scrollSnapType = 'none'; feed.scrollTop = el.offsetTop; requestAnimationFrame(() => { feed.style.scrollSnapType = ''; }); if (Math.abs(feed.scrollTop - el.offsetTop) < 4 || n > 20) return; }
      if (n++ < 30) t = window.setTimeout(go, 60); };
    go(); return () => clearTimeout(t); }, [resume, videos.length > 0]);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const timers = new Map<Element, number>();
    const io = new IntersectionObserver(es => es.forEach(en => {
      const id = (en.target as HTMLElement).dataset['vid']; const v = id ? videos.find(x => x.id === id) : undefined; if (!v) return;
      if (en.isIntersecting) timers.set(en.target, window.setTimeout(() => noteInterest(v, 1, true), 3000)); else { clearTimeout(timers.get(en.target)); timers.delete(en.target); }
    }), { threshold: 0.7 });
    document.querySelectorAll('.bixtok-slide[data-vid]').forEach(el => io.observe(el));
    return () => { io.disconnect(); timers.forEach(t => clearTimeout(t)); };
  }, [videos]);
  if (!videos.length) return <p className="grid h-full place-items-center text-sm text-muted-foreground">No posts yet. Tap + to create one.</p>;
  const like = async (v: Video) => { if (liked[v.id] || cfg.features['likes'] === false) return; setLiked(l => ({ ...l, [v.id]: true })); noteInterest(v, 3); await supabase.rpc('bixtok_like', { p_video: v.id }); qc.invalidateQueries({ queryKey: ['bixtok'] }); };
  const tapRef = useRef<{ t: number; id: string }>({ t: 0, id: '' });
  const [bursts, setBursts] = useState<{ k: number; x: number; y: number }[]>([]);
  const onTap = (e: React.PointerEvent, v: Video) => {
    if ((e.target as HTMLElement).closest('button,a,aside,iframe')) return;
    const now = Date.now(); const prev = tapRef.current; tapRef.current = { t: now, id: v.id };
    if (prev.id === v.id && now - prev.t < 320) { const r = e.currentTarget.getBoundingClientRect(); const k = now; setBursts(b => [...b, { k, x: e.clientX - r.left, y: e.clientY - r.top }]); setTimeout(() => setBursts(b => b.filter(x => x.k !== k)), 900); try { navigator.vibrate?.(15); } catch { /* unsupported */ } void like(v); }
  };
  return <div className="bixtok-feed">{videos.map(v => <section key={v.id} data-vid={v.id} className="bixtok-slide" onPointerUp={e => onTap(e, v)}>
    <Media v={v} muted={muted}/>
    {tapRef.current.id === v.id && bursts.map(b => <Heart key={b.k} className="bxt-dbl-heart" style={{ left: b.x, top: b.y }} fill="currentColor" aria-hidden/>)}
    {v.overlay && <DraggableText text={v.overlay} style={{ ...DEFAULT_TEXT, ...(v.text_style ?? {}) }}/>}
    <div className="bixtok-meta"><button type="button" className="bxt-name" onClick={() => setPeek(v)}><b>@{v.creator_name}</b>{v.creator_id && vip.has(v.creator_id) && <VipBadge small/>}</button><p>{v.caption}</p>{v.music_title && <small className="bixtok-music">♫ {v.music_title}</small>}</div>
    <div className={`bxt-vinyl${muted ? ' still' : ''}`} aria-hidden><span>{v.creator_name.slice(0, 1).toUpperCase()}</span>{!muted && <><i>♪</i><i>♫</i></>}</div>
    <aside className={`bixtok-rail bxt-rail-shield${railOpen ? '' : ' closed'}`}>
      {railOpen && <>
      {v.creator_id === me && <div className="bxt-follow me"><span>{v.creator_name.slice(0, 1).toUpperCase()}</span><small>You</small></div>}
      {v.creator_id && v.creator_id !== me && liveHosts.has(v.creator_id) && <button aria-label="Watch LIVE" className="bxt-follow bxt-live-ring" onClick={() => onEnterLive?.(liveHosts.get(v.creator_id!)!)}><span>{v.creator_name.slice(0, 1).toUpperCase()}</span><em>LIVE</em><small>Watch</small></button>}
      {v.creator_id && v.creator_id !== me && !liveHosts.has(v.creator_id) && <button aria-label={following.has(v.creator_id) ? 'Unfollow' : 'Follow'} className={`bxt-follow${following.has(v.creator_id) ? ' on' : ''}`} onClick={() => onFollow(v.creator_id!)}><span>{v.creator_name.slice(0, 1).toUpperCase()}</span><em>{following.has(v.creator_id) ? (followers.has(v.creator_id) ? '⇄' : '✓') : '+'}</em><small>{following.has(v.creator_id) ? (followers.has(v.creator_id) ? 'Friends' : 'Following') : 'Follow'}</small></button>}
      {cfg.features['likes'] !== false && <button aria-label="Like" className={liked[v.id] ? 'on' : ''} onClick={() => void like(v)}><Heart/><small>{fmtCount(v.likes + (liked[v.id] ? 1 : 0))}</small></button>}
      <button aria-label="Comments" onClick={() => setComments(v)}><MessageCircle/><small>Chat</small></button>
      <button aria-label="Save" className={saved.ids.includes(v.id) ? 'on' : ''} onClick={() => onNote(saved.toggle(v.id) ? (noteInterest(v, 4), 'Saved to your profile') : 'Removed from saved')}><Bookmark/><small>Save</small></button>
      {cfg.features['share'] !== false && <button aria-label="Share" onClick={() => { noteInterest(v, 3); setShare(v); }}><Share2/><small>Share</small></button>}
      <button aria-label="Send gift" className="gift" onClick={() => v.creator_id && v.allow_gifts !== false ? onGift(v.id) : onNote('This post cannot receive gifts.')}><Gift/><small>Gift</small></button>
      </>}
      <button type="button" className="bxt-rail-toggle" aria-label={railOpen ? 'Collapse menu' : 'Expand menu'} onClick={() => setRailOpen(o => !o)}>{railOpen ? '›' : '‹'}</button>
    </aside>
  </section>)}{comments && <CommentsSheet video={comments} me={me} onClose={() => setComments(null)} onNote={onNote}/>}
  {share && <ShareSheet video={share} code={ref.data ?? null} onClose={() => setShare(null)} onNote={onNote}/>}
  {peek && <div className="bxt-cmt-wrap" onClick={() => setPeek(null)}><div className="bxt-cmt bxt-peek" role="dialog" aria-label="Creator" onClick={e => e.stopPropagation()}>
    <header><b>Creator</b><button aria-label="Close" onClick={() => setPeek(null)}><X size={18}/></button></header>
    <div className="bxt-peek-body"><span className={`bxt-peek-av${peek.creator_id && liveHosts.has(peek.creator_id) ? ' live' : ''}`}>{peek.creator_name.slice(0, 1).toUpperCase()}</span><h3>@{peek.creator_name}</h3>{peek.creator_id && vip.has(peek.creator_id) && <VipBadge/>}
      <p>{videos.filter(x => x.creator_id === peek.creator_id).length} posts · {videos.filter(x => x.creator_id === peek.creator_id).reduce((a, x) => a + Number(x.likes || 0), 0)} likes</p>
      {peek.creator_id && peek.creator_id !== me && <div className="bxt-peek-act">
        {liveHosts.has(peek.creator_id) && <button className="bixtok-cta" onClick={() => { const l = liveHosts.get(peek.creator_id!)!; setPeek(null); onEnterLive?.(l); }}>🔴 Watch LIVE</button>}
        <CallButtons peerId={peek.creator_id} peerName={peek.creator_name}/>
        <button className="bixtok-cta" onClick={() => onFollow(peek.creator_id!)}>{following.has(peek.creator_id) ? 'Unfollow' : 'Follow'}</button>
        {peek.allow_gifts !== false && <button className="bixtok-cta" onClick={() => { const id = peek.id; setPeek(null); onGift(id); }}>🎁 Gift</button>}
      </div>}</div>
  </div></div>}</div>;
}

/** Share link carries the sharer's referral code so new sign-ups join their network. */
export function shareLink(origin: string, code: string | null, vid: string): string {
  return code ? `${origin}/register?ref=${encodeURIComponent(code)}&vid=${vid}` : `${origin}/bixtok?vid=${vid}`;
}
function ShareSheet({ video, code, onClose, onNote }: { video: Video; code: string | null; onClose: () => void; onNote: (m: string) => void }) {
  const url = shareLink(location.origin, code, video.id); const text = `${video.caption || 'Watch this on BIXTOK'} — ${url}`;
  const copy = async () => { onNote(await copyText(url) ? 'Link copied' : 'Copy failed'); };
  return <div className="bxt-cmt-wrap" onClick={onClose}><div className="bxt-cmt bxt-share" role="dialog" aria-label="Share" onClick={e => e.stopPropagation()}>
    <header><b>Share video</b><button aria-label="Close" onClick={onClose}><X size={18}/></button></header>
    <div className="bxt-share-grid">
      <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer"><span>💬</span>WhatsApp</a>
      <a href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(video.caption || 'BIXTOK')}`} target="_blank" rel="noreferrer"><span>✈️</span>Telegram</a>
      <button onClick={copy}><span>🔗</span>Copy link</button>
      {typeof navigator !== 'undefined' && 'share' in navigator && <button onClick={() => { void navigator.share({ title: 'BIXTOK', text: video.caption, url }).catch(() => {}); }}><span>📤</span>More</button>}
    </div>
    <p className="bxt-share-note">{code ? `Your referral code ${code} is included — new members who sign up join your network.` : 'Referral code not found; a plain BIXTOK link is shared.'}</p>
  </div></div>;
}

type Cmt = { id: string; user_id: string; author_name: string; body: string; created_at: string };
function CommentsSheet({ video, me, onClose, onNote }: { video: Video; me: string; onClose: () => void; onNote: (m: string) => void }) {
  const qc = useQueryClient(); const [text, setText] = useState(''); const [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: ['bixtok-comments', video.id], queryFn: async () => { const { data, error } = await supabase.from('bixtok_comments').select('id,user_id,author_name,body,created_at').eq('video_id', video.id).order('created_at', { ascending: false }).limit(100); if (error) throw error; return (data ?? []) as Cmt[]; } });
  const send = async () => { const body = text.trim(); if (!body) return; setBusy(true);
    const { error } = await supabase.from('bixtok_comments').insert({ video_id: video.id, body, user_id: me });
    setBusy(false); if (error) { onNote('Comment could not be sent.'); return; } setText(''); qc.invalidateQueries({ queryKey: ['bixtok-comments', video.id] }); };
  return <div className="bxt-cmt-wrap" onClick={onClose}><div className="bxt-cmt" role="dialog" aria-label="Comments" onClick={e => e.stopPropagation()}>
    <header><b>{q.data?.length ?? 0} comments</b><button aria-label="Close comments" onClick={onClose}><X size={18}/></button></header>
    <ul>{q.isLoading ? <li className="muted">Loading…</li> : !q.data?.length ? <li className="muted">No comments yet. Be the first!</li> : q.data.map(c => <li key={c.id}><span>{c.author_name.slice(0, 1).toUpperCase()}</span><div><b>@{c.author_name}</b><p>{c.body}</p></div>
      {c.user_id === me && <button aria-label="Delete comment" onClick={async () => { await supabase.from('bixtok_comments').delete().eq('id', c.id); qc.invalidateQueries({ queryKey: ['bixtok-comments', video.id] }); }}><Trash2 size={14}/></button>}</li>)}</ul>
    <form onSubmit={e => { e.preventDefault(); void send(); }}><input value={text} maxLength={300} onChange={e => setText(e.target.value)} placeholder="Add a comment…"/><button disabled={busy || !text.trim()}>Send</button></form>
  </div></div>;
}

function embedUrl(u: string): string | null {
  try {
    const x = new URL(u); const h = x.hostname.replace(/^www\.|^m\./, '');
    if (h.endsWith('tiktok.com')) { const id = x.pathname.match(/(?:video|photo|v)\/(\d+)/)?.[1] ?? x.searchParams.get('item_id') ?? u.match(/(\d{15,})/)?.[1]; return id ? `https://www.tiktok.com/player/v1/${id}?autoplay=1&loop=1&music_info=1&description=1&rel=0` : null; }
    if (h === 'youtu.be') { const id = x.pathname.slice(1); return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&playsinline=1&loop=1&playlist=${id}&controls=1&rel=0`; }
    if (h.endsWith('youtube.com')) { const id = x.searchParams.get('v') ?? x.pathname.match(/(?:shorts|embed)\/([\w-]+)/)?.[1]; return id ? `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&playsinline=1&loop=1&playlist=${id}&controls=1&rel=0&modestbranding=1` : null; }
    if (h.endsWith('instagram.com')) { const m = x.pathname.match(/\/(p|reel|reels)\/([\w-]+)/); return m ? `https://www.instagram.com/${m[1] === 'p' ? 'p' : 'reel'}/${m[2]}/embed` : null; }
  } catch { /* invalid */ }
  return null;
}

let currentVid: Video | null = null;
function Media({ v, muted }: { v: Video; muted: boolean }) {
  const embed = !v.media_path ? embedUrl(v.src) : null;
  const mini = useBixtokMini(); const silent = !!mini.feed || !!mini.room;
  const ref = useRef<HTMLDivElement>(null); const [showRaw, setShow] = useState(false); const show = showRaw && !silent;
  muted = muted || silent;
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => { const el = ref.current; if (!el) return; const io = new IntersectionObserver(([e]) => setShow(!!e?.isIntersecting), { threshold: 0.6 }); io.observe(el); return () => io.disconnect(); }, []);
  useEffect(() => { if (!v.music_url) return undefined; if (show && !muted) { audio.current ??= new Audio(v.music_url); audio.current.loop = true; audio.current.volume = 1; audio.current.play().catch(() => {}); } else audio.current?.pause(); return () => audio.current?.pause(); }, [show, muted, v.music_url]);
  useEffect(() => { if (show) { currentVid = v; bixtokMini.rememberId(v.id); } }, [show, v]);
  return <div ref={ref} className="bixtok-media">
    {v.clean ? <AutoVideo src={v.clean} filter={v.filter} muted={muted || !!v.music_url} paused={silent}/> : embed ? (show ? (new URL(embed).hostname === 'www.tiktok.com'
      ? <BixtokTikTokPlayer src={embed} title={v.caption || 'BIXTOK post'} muted={muted} className="bixtok-embed" filter={filterCss(v.filter)}/>
      : <iframe src={muted ? embed : embed.replace('mute=1', 'mute=0')} title={v.caption || 'BIXTOK post'} className="bixtok-embed" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen style={{ filter: filterCss(v.filter) }}/>) : <div className="bixtok-embed"/>)
     : v.media_kind === 'photo' ? <img src={v.src} alt={v.caption} className="bixtok-video" style={{ filter: filterCss(v.filter) }}/>
     : <AutoVideo src={v.src} filter={v.filter} muted={muted || !!v.music_url} paused={silent}/>}
    {embed && !v.clean && <a href={v.src} target="_blank" rel="noreferrer" className="bixtok-src">{v.source_kind}</a>}
  </div>;
}

function AutoVideo({ src, filter, muted, paused = false }: { src: string; filter?: string | null; muted: boolean; paused?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const pausedRef = useRef(paused); pausedRef.current = paused;
  useEffect(() => { const el = ref.current; if (!el) return; if (paused) { bixtokMini.savePos(src, el.currentTime); el.muted = true; el.pause(); } else { const t = bixtokMini.getPos(src); if (t > 0.5 && Math.abs(el.currentTime - t) > 1) el.currentTime = t; } }, [paused]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const el = ref.current; if (!el) return; el.volume = 1; const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting && !pausedRef.current) el.play().catch(() => { el.muted = true; void el.play().catch(() => {}); const on = () => { if (!mutedRef.current && !pausedRef.current && el.getBoundingClientRect().top < innerHeight / 2 && el.getBoundingClientRect().bottom > innerHeight / 2) { el.muted = false; void el.play().catch(() => {}); } }; window.addEventListener('pointerdown', on, { once: true }); }); else el.pause(); }, { threshold: 0.6 }); io.observe(el); return () => io.disconnect(); }, []);
  const [pre, setPre] = useState<'metadata' | 'auto'>('metadata');
  useEffect(() => { const el = ref.current; if (!el) return; const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setPre('auto'); io.disconnect(); } }, { rootMargin: '120% 0px' }); io.observe(el); return () => io.disconnect(); }, []);
  const mutedRef = useRef(muted); useEffect(() => { mutedRef.current = muted; const el = ref.current; if (el) { el.muted = muted; if (!muted) el.volume = 1; } }, [muted]);
  const bar = useRef<HTMLSpanElement>(null); const tapT = useRef(0); const [icon, setIcon] = useState<'play' | 'pause' | null>(null);
  const onClick = (e: React.MouseEvent<HTMLVideoElement>) => { const el = e.currentTarget; clearTimeout(tapT.current); if (e.detail > 1) return;
    tapT.current = window.setTimeout(() => { if (el.paused) { void el.play().catch(() => {}); setIcon('play'); } else { el.pause(); setIcon('pause'); } window.setTimeout(() => setIcon(null), 600); }, 300); };
  return <><video ref={ref} src={src} loop muted={muted} playsInline preload={pre} className="bixtok-video" style={{ filter: filterCss(filter) }} onClick={onClick}
    onLoadedMetadata={e => { const t = bixtokMini.getPos(src); const el = e.currentTarget; if (t > 0.5 && (!el.duration || t < el.duration - 0.5)) el.currentTime = t; }}
    onTimeUpdate={e => { const el = e.currentTarget; bixtokMini.savePos(src, el.currentTime); if (bar.current && el.duration) bar.current.style.transform = `scaleX(${el.currentTime / el.duration})`; }}
    onPlay={e => { const me = e.currentTarget; document.querySelectorAll('video').forEach(o => { if (o !== me && !o.closest('.bixtok-room') && !o.closest('.bxl-mini')) { o.pause(); o.muted = true; } }); }}/>
    <span className="bxt-progress" aria-hidden><span ref={bar}/></span>
    {icon && <span className="bxt-playicon" aria-hidden>{icon === 'pause' ? '❚❚' : '▶'}</span>}</>;
}

function LiveLobby({ data, onEnter, onNote }: { data: { cfg: Cfg; lives: Live[]; stake: number; owner1: boolean; bypass: boolean; uid: string; schedules: Sched[] }; onEnter: (l: Live) => void; onNote: (m: string) => void }) {
  const qc = useQueryClient(); const [title, setTitle] = useState(''); const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState<string[]>([]); const shown = data.lives.filter(l => !hidden.includes(l.id)); const vipL = useVipHosts(data.lives.map(l => l.host_id));
  const eligible = data.stake > 0 && data.stake >= Number(data.cfg.live_min_stake_usd);
  const hostMin = Number(data.cfg.live_host_min_stake_usd ?? 500);
  const [otitle, setOtitle] = useState('');
  const official = async () => { setBusy(true);
    const { data: id, error } = await supabase.rpc('bixtok_start_official_live', { p_title: otitle });
    setBusy(false); if (error) return onNote(error.message);
    await qc.invalidateQueries({ queryKey: ['bixtok'] }); onNote('Official LIVE started · all members notified');
    const { data: me } = await supabase.auth.getUser();
    const { data: row } = await supabase.from('bixtok_lives').select('host_name').eq('id', id as string).maybeSingle();
    onEnter({ id: id as string, host_id: me.user!.id, host_name: row?.host_name ?? 'BIXLINK OFFICIAL', title: otitle || 'BIXLINK Official Presentation', started_at: new Date().toISOString(), kind: 'official' }); };
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const [sched, setSched] = useState({ title: '', at: '' });
  const remind = async (s: Sched) => {
    const { data: me } = await supabase.auth.getUser(); if (!me.user) return;
    const { error } = s.reminded ? await supabase.from('bixtok_live_reminders').delete().eq('schedule_id', s.id).eq('user_id', me.user.id) : await supabase.from('bixtok_live_reminders').insert({ schedule_id: s.id, user_id: me.user.id });
    if (error) return onNote(error.message);
    if (!s.reminded && typeof Notification !== 'undefined' && Notification.permission === 'default') void Notification.requestPermission().catch(() => {});
    onNote(s.reminded ? 'Reminder removed' : 'We will remind you while BIXTOK is open'); qc.invalidateQueries({ queryKey: ['bixtok'] });
  };
  const addSched = async () => {
    const at = new Date(sched.at); if (!sched.title.trim() || Number.isNaN(at.getTime()) || at.getTime() < Date.now()) return onNote('Enter a title and a future date/time.');
    const { data: me } = await supabase.auth.getUser();
    const { error } = await supabase.from('bixtok_live_schedules').insert({ title: sched.title.trim().slice(0, 80), starts_at: at.toISOString(), created_by: me.user!.id });
    if (error) return onNote(error.message);
    setSched({ title: '', at: '' }); onNote('Official LIVE scheduled'); qc.invalidateQueries({ queryKey: ['bixtok'] });
  };
  return <div className="bixtok-lobby">
    {data.owner1 && <div className="bixtok-golive bxt-official-card">
      <h2><Radio size={18}/> OFFICIAL BROADCAST</h2>
      <p className="text-xs text-muted-foreground">Presentation and promotion LIVE. Starting it sends a notification to every member.</p>
      <form onSubmit={e => { e.preventDefault(); void official(); }}>
        <input className="form-input" maxLength={80} placeholder="Presentation title" value={otitle} onChange={e => setOtitle(e.target.value)}/>
        <button className="bixtok-cta" disabled={busy}>{busy ? 'Starting…' : 'Go Live Official'}</button>
      </form></div>}
    <div className="bixtok-golive">
      <h2><Radio size={18}/> Community LIVE</h2>
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
      <p className="mt-3 text-xs text-muted-foreground">{data.stake >= hostMin
        ? <b className="text-primary">👑 VIP HOST · your ${data.stake.toFixed(0)} staking unlocks the Host badge</b>
        : <>Community LIVE from ${Number(data.cfg.live_min_stake_usd).toFixed(0)} · VIP HOST badge from ${hostMin.toFixed(0)} staking{data.stake > 0 ? ` (you: $${data.stake.toFixed(0)})` : ''}</>}</p>
    </div>
    <h3 className="mt-6 text-xs font-bold tracking-widest text-muted-foreground">LIVE NOW · {shown.length}</h3>
    <div className="bixtok-live-grid">{shown.map(l => <div key={l.id} className="relative"><button className={`w-full ${l.kind === 'official' ? 'bxt-official' : ''}`} onClick={() => onEnter(l)}><span className="bixtok-badge">{l.kind === 'official' ? 'OFFICIAL LIVE' : 'LIVE'}</span><b>{l.title}</b><small>@{l.host_name}</small>{vipL.has(l.host_id) && <VipBadge small/>}</button>
      <button type="button" aria-label={l.host_id === data.uid || data.bypass ? 'End this LIVE' : 'Hide this LIVE'} className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full border border-border bg-background/80 text-foreground" onClick={async () => {
        if (l.host_id === data.uid || data.bypass) { if (!(await luxConfirm('It will be removed from the LIVE list for everyone.', { title: 'End this LIVE?', ok: 'End LIVE', cancel: 'Keep', danger: true }))) return; const { error } = await supabase.rpc('bixtok_end_live', { p_id: l.id }); if (error) return onNote(error.message); onNote('LIVE ended'); await qc.invalidateQueries({ queryKey: ['bixtok'] }); }
        else setHidden(h => [...h, l.id]);
      }}><X size={14}/></button></div>)}</div>
    {!shown.length && <p className="mt-3 text-sm text-muted-foreground">Nobody is live yet.</p>}
  </div>;
}

export function countdown(ms: number): string {
  if (ms <= 0) return 'Starting now';
  const t = Math.floor(ms / 1000); const d = Math.floor(t / 86400); const h = Math.floor((t % 86400) / 3600); const m = Math.floor((t % 3600) / 60); const s = t % 60;
  return d > 0 ? `${d}d ${h}h ${m}m` : `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function calendarUrl(s: { title: string; starts_at: string }): string {
  const f = (d: Date) => d.toISOString().replace(/[-:]|\.\d{3}/g, '');
  const a = new Date(s.starts_at); const b = new Date(a.getTime() + 3600_000);
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`BIXTOK OFFICIAL LIVE: ${s.title}`)}&dates=${f(a)}/${f(b)}&details=${encodeURIComponent('Join on BIXTOK → LIVE: https://bixlink.com/bixtok')}`;
}

type GiftTarget = { video?: string; live?: string; recipients?: { id: string; name: string }[] };
function GiftSheet({ gifts, target, closed, onClose, onNote }: { gifts: Gift[]; target: GiftTarget; closed: boolean; onClose: () => void; onNote: (m: string) => void }) {
  const qc = useQueryClient(); const [busy, setBusy] = useState<string | null>(null); const [burst, setBurst] = useState<string | null>(null);
  const recips = target.recipients ?? []; const [to, setTo] = useState<string | null>(recips[0]?.id ?? null);
  const send = async (g: Gift) => {
    setBusy(g.id);
    const { error } = await supabase.rpc('bixtok_send_gift_to', { p_gift: g.id, p_live: target.live ?? null, p_video: target.video ?? null, p_to: to } as never);
    setBusy(null);
    if (error) {
      const m = error.message;
      return onNote(m.includes('yourself') ? 'You cannot gift your own post or LIVE — use a different member account.' : m.includes('Insufficient BIXP') ? `Not enough BIXP for ${g.name} (${g.price} BIXP).` : m.includes('Insufficient BIX') ? `Not enough BIX balance for ${g.name} (${g.price} BIX).` : m.toLowerCase().includes('lock') ? 'Your BIX is still locked and cannot be gifted yet.' : m);
    }
    if (target.live) window.dispatchEvent(new CustomEvent('bixtok:gift-sent', { detail: { live: target.live } }));
    setBurst(g.emoji); setTimeout(() => setBurst(null), 1400);
    onNote(`${g.emoji} ${g.name} sent · ${g.price} ${g.currency}`); qc.invalidateQueries();
  };
  return <div className="bixtok-sheet-wrap" onClick={onClose}><div className="bixtok-sheet" onClick={e => e.stopPropagation()}>
    <div className="flex items-center justify-between"><h3 className="font-bold">Send a gift</h3><button aria-label="Close" onClick={onClose}><X size={18}/></button></div>
    {recips.length > 1 && <div className="bxl-recips" role="radiogroup" aria-label="Gift to">{recips.map(r => <button key={r.id} role="radio" aria-checked={to === r.id} className={to === r.id ? 'on' : ''} onClick={() => setTo(r.id)}>@{r.name}</button>)}</div>}
    {closed ? <p className="mt-4 text-sm text-muted-foreground">Gifts are closed right now.</p> : <div className="bixtok-gifts">{gifts.map(g => <button key={g.id} disabled={!!busy} onClick={() => send(g)}><span>{g.emoji}</span><b>{g.name}</b><small>{Number(g.price)} {g.currency}</small></button>)}</div>}
    <p className="mt-3 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-center text-[11px] font-semibold text-primary">90% net creator share · fair & direct</p>
    <p className="mt-2 text-[10px] text-muted-foreground">The creator receives the net share set by the platform (default 90%); the rest is a platform fee. BIXP are promotional points; BIX gifts are internal ledger transfers to the creator. Gifts are final and are not investment returns.</p>
    {burst && <div className="bixtok-burst" aria-hidden>{burst}</div>}
  </div></div>;
}

function Inbox({ followers, lives, mine, onLive, onCreate }: { followers: number; lives: Live[]; mine: Video[]; onLive: (l: Live) => void; onCreate: () => void }) {
  const likes = mine.reduce((a, v) => a + Number(v.likes || 0), 0);
  return <div className="bxt-page bxt-inbox"><header className="bxt-head"><span/><h1>Inbox <i className="bxt-online"/></h1><span/></header>
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

function ProfilePage({ follow, me, email, videos, all = [], onCreate, onBalance, onOpen, onNote }: { follow: { following: Set<string>; followers: Set<string> }; me: string; email: string; videos: Video[]; all?: Video[]; onCreate: () => void; onBalance: () => void; onOpen: () => void; onNote: (m: string) => void }) {
  const p = useQuery({ queryKey: ['bixtok-profile', me], queryFn: async () => (await supabase.from('profiles').select('username').eq('user_id', me).maybeSingle()).data });
  const qc = useQueryClient();
  const [drawer, setDrawer] = useState(false); const [ptab, setPtab] = useState('grid'); const saved = useSaved(); const savedVids = saved.ids.map(id => all.find(v => v.id === id)).filter((v): v is Video => !!v);
  const name = p.data?.username || email.split('@')[0] || 'member';
  const likes = videos.reduce((a, v) => a + Number(v.likes || 0), 0);
  const copy = async () => { try { await navigator.clipboard.writeText(`${location.origin}/bixtok`); onNote('Profile link copied'); } catch { /* ignore */ } };
  return <div className="bxt-page bxt-page-profile"><header className="bxt-head"><button aria-label="Create" onClick={onCreate}><Sparkles size={20}/></button><span/><button aria-label="Menu" onClick={() => setDrawer(true)}><Menu size={22}/></button></header>
    <section className="bxt-prof"><div><h1>{name}</h1><small>@{name.toLowerCase()}</small>
      <div className="bxt-stats"><p><b>{follow.following.size}</b>Following</p><p><b>{follow.followers.size}</b>Followers</p><p><b>{[...follow.following].filter(x => follow.followers.has(x)).length}</b>Friends</p><p><b>{likes}</b>Likes</p></div></div>
      <button className="bxt-bigav" onClick={onCreate}>{name.slice(0, 1).toUpperCase()}<em><Plus size={14}/></em></button></section>
    <p className="bxt-bio">BIXLINK member · Web3 creator</p>
    <Link to="/nft-marketplace" className="bxt-pill"><ShoppingBag size={14}/> Your orders</Link>
    <div className="bxt-ptabs">{[['grid', Grid3x3], ['private', Lock], ['repost', Repeat2], ['saved', Bookmark], ['liked', Heart]].map(([k, I]) => { const Ic = I as typeof Heart; return <button key={k as string} className={ptab === k ? 'on' : ''} onClick={() => setPtab(k as string)} aria-label={k as string}><Ic size={20}/></button>; })}</div>
    {ptab === 'grid' && videos.length ? <div className="bxt-grid">{videos.map(v => <div key={v.id} className="bxt-grid-item"><button onClick={onOpen}>{v.media_kind === 'photo' ? <img src={v.src} alt=""/> : <video src={v.src} muted preload="metadata"/>}<small><Eye size={12}/> {v.likes}</small></button><button type="button" className="bxt-grid-del" aria-label="Delete post" onClick={async () => { if (!(await luxConfirm('This post will be removed from your profile and the feed.', { title: 'Delete post?', ok: 'Delete', danger: true }))) return; const { error } = await supabase.from('bixtok_videos').delete().eq('id', v.id); if (error) return onNote('Could not delete post.'); if (v.media_path) await supabase.storage.from('bixtok-media').remove([v.media_path]); qc.invalidateQueries({ queryKey: ['bixtok'] }); onNote('Post deleted'); }}><Trash2 size={14}/></button></div>)}</div>
      : ptab === 'saved' && savedVids.length ? <div className="bxt-grid">{savedVids.map(v => <div key={v.id} className="bxt-grid-item"><button onClick={onOpen}>{v.media_kind === 'photo' ? <img src={v.src} alt=""/> : <video src={v.src} muted preload="metadata"/>}<small><Bookmark size={12}/> {v.likes}</small></button></div>)}</div>
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
    <CreatorEarnings/>
    <div className="bxt-coins"><Link to="/wallet"><span><Coins size={14}/> BIXP</span><b>Wallet</b><em>Get BIXP →</em></Link><Link to="/wallet"><span><Coins size={14}/> BIXCOIN</span><b>Wallet</b></Link></div>
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

type Earn = { bix: number; bixp: number; claimed_bix: number; claimed_bixp: number; recent: { gift_name: string; currency: string; amount: number; created_at: string; claimed_at: string | null; sender: string }[] };
/** Gifts wait here; BIX moves to the BIXLINK wallet once the server minimum is met. BIXP stays inside BIXTOK. */
function CreatorEarnings() {
  const qc = useQueryClient(); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState(''); const [open, setOpen] = useState(false);
  const q = useQuery({ queryKey: ['bixtok-earnings'], queryFn: async () => { const { data, error } = await supabase.rpc('bixtok_my_earnings' as never); if (error) throw error; return data as unknown as Earn; } });
  const mq = useQuery({ queryKey: ['bixtok-withdraw-min'], queryFn: async () => { const { data } = await supabase.from('bixtok_config').select('withdraw_min_bix').limit(1).maybeSingle(); return Number((data as { withdraw_min_bix?: number } | null)?.withdraw_min_bix ?? 100); } });
  const min = mq.data ?? 100; const e = q.data; const bix = Number(e?.bix ?? 0); const ok = bix >= min;
  const claim = async () => {
    setBusy(true); setMsg('');
    const { data, error } = await supabase.rpc('bixtok_claim_earnings' as never);
    setBusy(false);
    if (error) return setMsg(error.message.includes('No BIXTOK') ? 'Belum ada BIX untuk ditarik.' : error.message.includes('Minimum') ? `Minimal penarikan ${min} BIX.` : error.message);
    const r = data as unknown as { bix: number };
    setMsg(`Berhasil ditarik ke BIXLINK Wallet: ${Number(r.bix)} BIX`);
    qc.invalidateQueries();
  };
  return <div className="bxt-card bxt-earn" style={{ display: 'block' }}>
    <div className="flex items-center justify-between"><b>Saldo Hadiah BIXTOK</b><Gift size={16} className="bxt-gifticon"/></div>
    <div className="mt-2 grid grid-cols-2 gap-2 text-center">
      <div className="bxt-earn-box bxt-earn-bix"><small>BIXCOIN · bisa ditarik</small><p className="text-lg font-bold">{bix.toLocaleString('en-US', { maximumFractionDigits: 4 })}</p></div>
      <div className="bxt-earn-box bxt-earn-bixp"><small>BIXP · tertahan di BIXTOK</small><p className="text-lg font-bold">{Number(e?.bixp ?? 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}</p></div>
    </div>
    <div className="mt-3"><div className="flex justify-between text-[11px]"><span>Menuju minimal penarikan</span><b>{Math.min(bix, min).toLocaleString('en-US', { maximumFractionDigits: 2 })} / {min} BIX</b></div><div className="bxt-earn-bar"><i style={{ width: `${Math.min(100, bix / min * 100)}%` }}/></div></div>
    <button className="bixtok-cta mt-3 w-full" disabled={busy || !ok} onClick={claim}>{busy ? 'Memproses…' : ok ? `Tarik ${bix.toLocaleString('en-US', { maximumFractionDigits: 4 })} BIX ke Wallet` : `Kurang ${(min - bix).toLocaleString('en-US', { maximumFractionDigits: 2 })} BIX lagi`}</button>
    {msg && <p className="mt-2 text-xs">{msg}</p>}
    <ul className="mt-2 space-y-0.5 text-[10px] text-muted-foreground"><li>• Saweran & bonus masuk ke sini dulu, lalu Anda tarik manual.</li><li>• Minimal penarikan {min} BIX ke saldo utama BIXLINK Wallet.</li><li>• BIXP tetap di BIXTOK untuk dipakai menyawer kreator lain.</li><li>Sudah ditarik: {Number(e?.claimed_bix ?? 0)} BIX.</li></ul>
    <button className="mt-2 flex w-full items-center justify-between text-xs" onClick={() => setOpen(o => !o)}><span>Gift history</span><ChevronRight size={14} style={{ transform: open ? 'rotate(90deg)' : undefined }}/></button>
    {open && <ul className="mt-2 space-y-1 text-xs">{(e?.recent ?? []).length === 0 ? <li className="text-muted-foreground">Belum ada hadiah.</li> : e!.recent.map((r, i) => <li key={i} className="flex justify-between gap-2"><span>@{r.sender} · {r.gift_name}</span><span>{Number(r.amount)} {r.currency} {r.claimed_at ? '✓' : '•'}</span></li>)}</ul>}
  </div>;
}

function fmtCount(n: number) { return n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1).replace(/\.0$/, '')}K` : String(n); }
