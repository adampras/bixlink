import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Eye, Gift, Heart, MessageCircle, Mic, MicOff, Radio, Send, Share2, SwitchCamera, Volume2, VolumeX, X, UserPlus, Check, Copy, Crown, Pin, Users, LogOut, Camera } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { useLiveRtc } from '@/lib/bixtok-rtc';

type Live = { id: string; host_id: string; host_name: string; title: string; started_at: string; kind?: string };
type Msg = { id: string; name: string; body: string; kind: string };
type Cfg = { live_max_minutes: number; features: Record<string, boolean> };
type Floater = { id: number; x: number; color: string; drift: number };

const COLORS = ['#FFD700', '#A855F7', '#FF3B6B', '#22D3EE', '#FF8A00'];

/** Small Web Audio sound kit — generated tones, no downloads. */
function useSfx(enabled: boolean) {
  const ctx = useRef<AudioContext | null>(null);
  const tone = (freq: number, dur: number, type: OscillatorType = 'sine', delay = 0, vol = 0.12) => {
    if (!enabled) return;
    try {
      ctx.current ??= new AudioContext();
      const c = ctx.current; if (c.state === 'suspended') void c.resume();
      const o = c.createOscillator(); const g = c.createGain(); const t = c.currentTime + delay;
      o.type = type; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 1.5, t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch { /* audio unavailable */ }
  };
  return {
    pop: () => tone(520 + Math.random() * 300, 0.12, 'sine', 0, 0.08),
    coin: () => { [988, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.18, 'triangle', i * 0.07)); },
    join: () => { tone(660, 0.15, 'sine'); tone(880, 0.2, 'sine', 0.1); },
    chat: () => tone(1200, 0.06, 'square', 0, 0.03),
  };
}

type Stage = { id: string; user_id: string; name: string; status: string };
type Top = { name: string; currency: string; total: number };

/** Parses "🦊 sent Fox · 50 BIX" into an emoji + amount for the full-screen effect. */
export function giftInfo(body: string): { emoji: string; amount: number; currency: string } {
  const m = body.match(/·\s*([\d.]+)\s*(BIXP|BIX)/);
  return { emoji: [...body.trim()][0] ?? '🎁', amount: m ? Number(m[1]) : 0, currency: m?.[2] ?? '' };
}
export function isMegaGift(body: string): boolean {
  const g = giftInfo(body);
  return (g.currency === 'BIX' && g.amount >= 10) || (g.currency === 'BIXP' && g.amount >= 100);
}

function Tile({ stream, label, mirror }: { stream: MediaStream; label: string; mirror?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { const v = ref.current; if (v) { v.srcObject = stream; void v.play().catch(() => {}); } }, [stream]);
  return <div className="bxl-tile"><video ref={ref} autoPlay muted playsInline style={mirror ? { transform: 'scaleX(-1)' } : undefined}/><small>@{label}</small></div>;
}

export function BixtokLiveRoom({ live, me, cfg, following, onFollow, onClose, onGift }: {
  live: Live; me: string; cfg: Cfg; following: boolean; onFollow: () => void; onClose: () => void; onGift: () => void;
}) {
  const qc = useQueryClient(); const host = live.host_id === me;
  const [msgs, setMsgs] = useState<Msg[]>([]); const [text, setText] = useState(''); const [ended, setEnded] = useState(false);
  const [sound, setSound] = useState(true); const [likes, setLikes] = useState(0); const [viewers, setViewers] = useState(1);
  const [floaters, setFloaters] = useState<Floater[]>([]); const [banner, setBanner] = useState<Msg | null>(null);
  const [mega, setMega] = useState<Msg | null>(null);
  const [share, setShare] = useState(false); const [copied, setCopied] = useState(false);
  const [mic, setMic] = useState(true); const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const cam = useRef<HTMLVideoElement>(null); const view = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null); const [local, setLocal] = useState<MediaStream | null>(null);
  const [entered, setEntered] = useState(host); const [zoom, setZoom] = useState(1);
  const [pinned, setPinned] = useState<string | null>(null); const [pinEdit, setPinEdit] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage[]>([]); const [stagePanel, setStagePanel] = useState(false);
  const [top, setTop] = useState<Top[]>([]); const [modMsg, setModMsg] = useState<Msg | null>(null); const [note, setNote] = useState('');
  const chan = useRef<ReturnType<typeof supabase.channel> | null>(null); const pending = useRef(0);
  const seen = useRef(new Set<string>());
  const sfx = useSfx(sound); const sfxRef = useRef(sfx); sfxRef.current = sfx;
  const mine = stage.find(s => s.user_id === me);
  const guest = !host && mine?.status === 'approved';
  const { mode, feeds, state, audioBlocked, unlockAudio, setVolume } = useLiveRtc({ liveId: live.id, me, host, hostId: live.host_id, publisher: host || guest, stream: local });
  const names = new Map(stage.map(s => [s.user_id, s.name])); names.set(live.host_id, live.host_name);
  const main = host ? null : feeds.find(f => f.id === live.host_id) ?? feeds[0] ?? null;
  const tiles = feeds.filter(f => f !== main);
  const flash = (m: string) => { setNote(m); setTimeout(() => setNote(''), 2600); };

  const spawn = (n = 1) => setFloaters(f => [...f.slice(-30), ...Array.from({ length: n }, () => ({
    id: Math.random(), x: 10 + Math.random() * 30, color: COLORS[Math.floor(Math.random() * COLORS.length)]!, drift: Math.random() * 60 - 30,
  }))]);

  /** One entry point for chat/gift rows from any source (broadcast, database stream, polling). */
  const ingest = useRef((rows: Msg[], quiet = false) => {
    const fresh = rows.filter(m => m?.id && !seen.current.has(m.id));
    if (!fresh.length) return;
    fresh.forEach(m => seen.current.add(m.id));
    setMsgs(x => [...x, ...fresh].slice(-40));
    if (quiet) return;
    const gift = fresh.find(m => m.kind === 'gift');
    if (gift) {
      sfxRef.current.coin(); setBanner(gift); spawn(8); setTimeout(() => setBanner(b => (b?.id === gift.id ? null : b)), 3500);
      if (isMegaGift(gift.body)) { setMega(gift); setTimeout(() => setMega(g => (g?.id === gift.id ? null : g)), 3200); }
    } else sfxRef.current.chat();
  });
  const pullRef = useRef<(quiet?: boolean) => Promise<Msg[]>>(async () => []);

  useEffect(() => {
    let alive = true; let tick = 0;
    const pull = async (quiet = false) => {
      const [m, l, s] = await Promise.all([
        supabase.from('bixtok_live_messages').select('id,name,body,kind').eq('live_id', live.id).order('created_at', { ascending: false }).limit(40),
        supabase.from('bixtok_lives').select('likes,status,pinned').eq('id', live.id).maybeSingle(),
        supabase.from('bixtok_stage_requests').select('id,user_id,name,status').eq('live_id', live.id),
      ]);
      if (!alive) return [];
      const rows = ((m.data ?? []) as Msg[]).reverse();
      ingest.current(rows, quiet);
      if (l.data) { setLikes(Math.max(0, Number(l.data.likes ?? 0)) + pending.current); setPinned(l.data.pinned ?? null); if (l.data.status !== 'live') setEnded(true); }
      if (s.data) setStage(s.data as Stage[]);
      if (tick++ % 3 === 0) { const t = await supabase.rpc('bixtok_live_top', { p_live: live.id }); if (alive && t.data) setTop(t.data as Top[]); }
      return rows;
    };
    pullRef.current = pull;
    void pull(true);
    const poll = setInterval(() => { void pull(); }, 4000);
    const db = supabase.channel(`bixtok-${live.id}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bixtok_live_messages', filter: `live_id=eq.${live.id}` }, p => ingest.current([p.new as Msg]))
      .subscribe();
    // Shared room: chat fan-out, likes, gifts, pins, moderation, stage updates, viewer presence
    const room = supabase.channel(`bixtok-room-${live.id}`, { config: { presence: { key: me } } });
    room.on('broadcast', { event: 'like' }, ({ payload }) => {
      const n = Math.min(Number(payload?.n) || 1, 50); setLikes(l => l + n); spawn(Math.min(n, 4)); sfxRef.current.pop();
    }).on('broadcast', { event: 'chat' }, ({ payload }) => ingest.current([payload as Msg]))
      .on('broadcast', { event: 'pin' }, ({ payload }) => setPinned((payload?.text as string) || null))
      .on('broadcast', { event: 'del' }, ({ payload }) => setMsgs(x => x.filter(y => y.id !== payload?.id)))
      .on('broadcast', { event: 'stage' }, () => { void pull(true); })
      .on('presence', { event: 'sync' }, () => setViewers(Math.max(1, Object.keys(room.presenceState()).length)))
      .on('presence', { event: 'join' }, ({ key }) => { if (key !== me) sfxRef.current.join(); })
      .subscribe(s => { if (s === 'SUBSCRIBED') void room.track({ at: Date.now() }); });
    chan.current = room;
    const flush = setInterval(() => {
      const n = pending.current; if (n <= 0) return; pending.current = 0;
      void room.send({ type: 'broadcast', event: 'like', payload: { n } });
      void supabase.rpc('bixtok_live_like', { p_live: live.id, p_n: n }).then(({ data }) => {
        if (alive && typeof data === 'number') setLikes(l => Math.max(l, data + pending.current));
      });
    }, 700);
    // Gift sent from the gift sheet: fetch the new gift row now and fan it out instantly.
    const onGiftSent = (e: Event) => {
      if ((e as CustomEvent).detail?.live !== live.id) return;
      void pull().then(rows => { const g = [...rows].reverse().find(r => r.kind === 'gift'); if (g) void room.send({ type: 'broadcast', event: 'chat', payload: g }); });
    };
    window.addEventListener('bixtok:gift-sent', onGiftSent);
    return () => { alive = false; clearInterval(poll); clearInterval(flush); window.removeEventListener('bixtok:gift-sent', onGiftSent); chan.current = null; supabase.removeChannel(db); supabase.removeChannel(room); };
  }, [live.id, me]);

  // Camera + mic for the host and approved stage guests.
  const publishing = host || guest;
  useEffect(() => {
    if (!publishing) { stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; setLocal(null); return undefined; }
    let cancelled = false;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
      .then(s => {
        if (cancelled) { s.getTracks().forEach(t => t.stop()); return; }
        const old = stream.current; stream.current = s;
        s.getAudioTracks().forEach(t => { t.enabled = mic; });
        if (cam.current) cam.current.srcObject = s;
        setLocal(s);
        old?.getTracks().forEach(t => t.stop());
      })
      .catch(() => flash('Camera or microphone permission was blocked.'));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publishing, facing]);
  useEffect(() => () => { stream.current?.getTracks().forEach(t => t.stop()); }, []);
  useEffect(() => { stream.current?.getAudioTracks().forEach(t => { t.enabled = mic; }); }, [mic, local]);
  useEffect(() => { if (host && cam.current && local) cam.current.srcObject = local; }, [host, local]);
  // Viewer video. LiveKit audio plays through separate audio elements; P2P carries voice inside the video stream.
  useEffect(() => {
    const v = view.current; if (!v || host) return;
    v.srcObject = main?.stream ?? null; v.muted = mode !== 'p2p' || !sound || !entered;
    if (main) void v.play().catch(() => { v.muted = true; void v.play().catch(() => {}); });
  }, [main?.stream, host, sound, entered, mode]);
  useEffect(() => { setVolume(sound); }, [sound, feeds.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!host) return undefined;
    const limit = setTimeout(() => { void stop(); }, Number(cfg.live_max_minutes) * 60_000);
    return () => clearTimeout(limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host]);

  const stop = async () => { await supabase.rpc('bixtok_end_live', { p_id: live.id }); setEnded(true); stream.current?.getTracks().forEach(t => t.stop()); qc.invalidateQueries({ queryKey: ['bixtok'] }); };
  const enter = async () => {
    setEntered(true); sfxRef.current.join();
    await unlockAudio();
    const v = view.current; if (v && mode === 'p2p') { v.muted = !sound; void v.play().catch(() => {}); }
  };
  const tap = () => { if (audioBlocked) void unlockAudio(); setLikes(l => l + 1); pending.current += 1; spawn(1); sfx.pop(); };
  const sendChat = async (body: string) => {
    const { data: p } = await supabase.from('profiles').select('username').eq('user_id', me).maybeSingle();
    const { data, error } = await supabase.from('bixtok_live_messages').insert({ live_id: live.id, user_id: me, name: p?.username || 'member', body }).select('id,name,body,kind').single();
    if (error || !data) { flash(error?.message.includes('row-level') ? 'The host has muted your chat.' : 'Message not sent.'); return; }
    ingest.current([data as Msg], true);
    void chan.current?.send({ type: 'broadcast', event: 'chat', payload: data });
  };
  const ping = () => { void chan.current?.send({ type: 'broadcast', event: 'stage', payload: {} }); };
  const requestStage = async () => {
    const { error } = await supabase.rpc('bixtok_stage_request', { p_live: live.id });
    if (error) return flash(error.message);
    flash('Request sent — waiting for the host.'); ping(); void pullRef.current(true);
  };
  const decide = async (id: string, status: 'approved' | 'rejected' | 'left') => {
    const { error } = await supabase.rpc('bixtok_stage_decide', { p_req: id, p_status: status });
    if (error) return flash(error.message);
    ping(); void pullRef.current(true);
  };
  const savePin = async (t: string) => {
    const { error } = await supabase.rpc('bixtok_live_pin', { p_live: live.id, p_text: t });
    if (error) return flash(error.message);
    setPinned(t.trim() || null); setPinEdit(null);
    void chan.current?.send({ type: 'broadcast', event: 'pin', payload: { text: t.trim() } });
  };
  const moderate = async (m: Msg, mute: boolean) => {
    const { error } = await supabase.rpc('bixtok_live_moderate', { p_msg: m.id, p_mute: mute });
    setModMsg(null);
    if (error) return flash(error.message);
    if (m.kind !== 'gift') { setMsgs(x => x.filter(y => y.id !== m.id)); void chan.current?.send({ type: 'broadcast', event: 'del', payload: { id: m.id } }); }
    flash(mute ? `${m.name} muted and message removed` : 'Message removed');
  };
  const shareMoment = async () => {
    const v = host ? cam.current : view.current;
    if (!v || !v.videoWidth) return flash('No video frame yet.');
    const c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d')?.drawImage(v, 0, 0);
    const blob = await new Promise<Blob | null>(r => c.toBlob(r, 'image/jpeg', 0.9)); if (!blob) return;
    const file = new File([blob], 'bixtok-live.jpg', { type: 'image/jpeg' });
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: live.title, text: `${shareText} ${url}` }).catch(() => {}); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'bixtok-live.jpg'; a.click(); flash('Moment saved — share it from your gallery.');
  };
  const url = typeof window !== 'undefined' ? `${window.location.origin}/bixtok?live=${live.id}` : '/bixtok';
  const shareText = `🔴 LIVE on BIXTOK: ${live.title} — @${live.host_name}`;
  const pendingReq = stage.filter(s => s.status === 'pending');
  const onStage = stage.filter(s => s.status === 'approved');

  return <div className="bixtok-room" role="dialog" aria-label="LIVE room">
    <div className="bxl-stage" onClick={tap}>
      {host ? <video ref={cam} autoPlay muted playsInline className="bixtok-video" style={{ objectFit: zoom < 1.05 ? 'contain' : 'cover', transform: `scale(${facing === 'user' ? -zoom : zoom}, ${zoom})` }}/>
        : <>
          <video ref={view} autoPlay playsInline muted className="bixtok-video" style={{ objectFit: 'contain' }}/>
          {(!main || state !== 'live') && <div className="bixtok-room-bg"><Radio size={42}/><p>@{live.host_name}</p>
            <small>{ended ? 'LIVE ended' : state === 'failed' ? 'Video could not connect on this network — chat, likes and gifts still work.' : 'Connecting to the host camera…'}</small></div>}
        </>}
    </div>
    {(tiles.length > 0 || (guest && local)) && <div className="bxl-tiles">
      {guest && local && <Tile stream={local} label="you" mirror={facing === 'user'}/>}
      {tiles.map(t => <Tile key={t.id} stream={t.stream} label={names.get(t.id) ?? 'guest'}/>)}
    </div>}
    <header className="bixtok-room-top">
      <div className="bxl-host"><span className="bxl-avatar">{live.host_name.slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0"><b className="block truncate text-xs">@{live.host_name}</b><small className="block truncate">{live.title}</small></div>
        {!host && <button className={`bxl-follow ${following ? 'on' : ''}`} aria-label={following ? 'Following' : 'Follow'} onClick={onFollow}>{following ? <Check size={14}/> : <UserPlus size={14}/>}</button>}
      </div>
      <span className="bxl-chip"><Eye size={13}/>{viewers}</span>
      <span className="bxl-chip"><Heart size={13}/>{likes}</span>
      {host && !ended && <button className="bixtok-end" onClick={stop}>End</button>}
      <button aria-label="Close" className="bixtok-icon" onClick={onClose}><X size={18}/></button>
    </header>
    <div className="bxl-sub">
      <span className="bixtok-badge">{live.kind === 'official' ? 'OFFICIAL LIVE' : 'LIVE'}</span>
      {top.length > 0 && <span className="bxl-top" aria-label="Top gifters"><Crown size={12}/>{top.map((t, i) => <em key={i}>{['🥇', '🥈', '🥉'][i]} {t.name} · {Number(t.total)} {t.currency}</em>)}</span>}
    </div>
    {pinned && <div className="bxl-pin"><Pin size={13}/><span>{pinned}</span></div>}
    <div className="bxl-cta">
      <Link to="/stake">Join Staking</Link>
      <Link to="/presale">Presale</Link>
      <Link to="/nft-marketplace">Shop</Link>
    </div>
    {ended && <p className="bixtok-ended">LIVE ended</p>}
    {!host && entered && audioBlocked && <button className="bxl-unmute" onClick={e => { e.stopPropagation(); void unlockAudio(); }}><Volume2 size={16}/> Tap for sound</button>}
    {banner && <div className="bxl-banner" key={banner.id}><Gift size={18}/><div><b>{banner.name}</b><small>{banner.body}</small></div></div>}
    {mega && <div className="bxl-mega" key={mega.id} aria-hidden><span>{giftInfo(mega.body).emoji}</span><b>{mega.name}</b><small>{mega.body}</small></div>}
    <div className="bxl-floaters" aria-hidden>{floaters.map(f => <Heart key={f.id} className="bxl-heart" fill={f.color} color={f.color}
      style={{ right: `${f.x}px`, ['--drift' as string]: `${f.drift}px` }} onAnimationEnd={() => setFloaters(x => x.filter(y => y.id !== f.id))}/>)}</div>
    <div className="bixtok-chat">{msgs.map(m => <p key={m.id} className={m.kind === 'gift' ? 'gift' : ''} onClick={host ? () => setModMsg(m) : undefined}><b>{m.name}</b> {m.body}</p>)}</div>
    <div className="bxl-tools">
      {publishing && <>
        <button aria-label="Flip camera" onClick={() => setFacing(f => (f === 'user' ? 'environment' : 'user'))}><SwitchCamera size={20}/></button>
        {host && <label className="bxl-zoom" onClick={e => e.stopPropagation()}><small>{zoom.toFixed(1)}×</small><input type="range" aria-label="Camera zoom" min={0.6} max={2} step={0.05} value={zoom} onChange={e => setZoom(+e.target.value)}/></label>}
        <button aria-label={mic ? 'Mute microphone' : 'Unmute microphone'} onClick={() => setMic(m => !m)}>{mic ? <Mic size={20}/> : <MicOff size={20}/>}</button>
      </>}
      {host && <button aria-label="Pin message" onClick={() => setPinEdit(pinned ?? '')}><Pin size={20}/></button>}
      {host && <button aria-label="Stage guests" className="relative" onClick={() => setStagePanel(true)}><Users size={20}/>{pendingReq.length > 0 && <i className="bxl-dot">{pendingReq.length}</i>}</button>}
      {!host && !ended && (guest
        ? <button aria-label="Leave stage" onClick={() => mine && decide(mine.id, 'left')}><LogOut size={20}/></button>
        : <button aria-label={mine?.status === 'pending' ? 'Request pending' : 'Request to join stage'} onClick={requestStage}><Users size={20}/>{mine?.status === 'pending' && <i className="bxl-dot">…</i>}</button>)}
    </div>
    <footer className="bixtok-room-bar">
      {cfg.features['comments'] !== false && <form className="min-w-0 flex-1" onSubmit={async e => { e.preventDefault(); const body = text.trim().slice(0, 200); if (!body) return; setText('');
        await sendChat(body); }}>
        <div className="bixtok-input"><MessageCircle size={16}/><input value={text} onChange={e => setText(e.target.value)} placeholder="Say something…" maxLength={200}/><button aria-label="Send"><Send size={16}/></button></div>
      </form>}
      <button className="bxl-act" aria-label={sound ? 'Mute room sounds' : 'Unmute room sounds'} onClick={() => { setSound(s => !s); if (!sound) void unlockAudio(); }}>{sound ? <Volume2 size={18}/> : <VolumeX size={18}/>}</button>
      <button className="bxl-act" aria-label="Share" onClick={() => setShare(true)}><Share2 size={18}/></button>
      {!host && <button className="bixtok-giftbtn" aria-label="Send gift" onClick={onGift}><Gift/></button>}
      <button className="bxl-act like" aria-label="Like" onClick={tap}><Heart size={18} fill="currentColor"/></button>
    </footer>
    {share && <div className="bixtok-sheet-wrap" onClick={() => setShare(false)}><div className="bixtok-sheet" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between"><h3 className="font-bold">Share this LIVE</h3><button aria-label="Close" onClick={() => setShare(false)}><X size={18}/></button></div>
      <div className="bxl-share">
        <a href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${url}`)}`} target="_blank" rel="noreferrer">WhatsApp</a>
        <a href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`} target="_blank" rel="noreferrer">Telegram</a>
        <button onClick={async () => { await navigator.clipboard?.writeText(`${shareText} ${url}`).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}><Copy size={14}/> {copied ? 'Copied' : 'Copy link'}</button>
        <button onClick={() => { void shareMoment(); }}><Camera size={14}/> Share moment</button>
        {typeof navigator !== 'undefined' && 'share' in navigator && <button onClick={() => { void navigator.share({ title: live.title, text: shareText, url }).catch(() => {}); }}>More…</button>}
      </div>
    </div></div>}
    {stagePanel && <div className="bixtok-sheet-wrap" onClick={() => setStagePanel(false)}><div className="bixtok-sheet" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between"><h3 className="font-bold">Stage guests (max 3)</h3><button aria-label="Close" onClick={() => setStagePanel(false)}><X size={18}/></button></div>
      {!pendingReq.length && !onStage.length && <p className="mt-3 text-sm text-muted-foreground">No requests yet. Viewers tap the people icon to ask to join.</p>}
      <ul className="bxl-stage-list">
        {pendingReq.map(s => <li key={s.id}><b>@{s.name}</b><span>wants to join</span><button onClick={() => decide(s.id, 'approved')}>Accept</button><button className="ghost" onClick={() => decide(s.id, 'rejected')}>Decline</button></li>)}
        {onStage.map(s => <li key={s.id}><b>@{s.name}</b><span>on stage</span><button className="ghost" onClick={() => decide(s.id, 'left')}>Remove</button></li>)}
      </ul>
    </div></div>}
    {pinEdit !== null && <div className="bixtok-sheet-wrap" onClick={() => setPinEdit(null)}><form className="bixtok-sheet" onClick={e => e.stopPropagation()} onSubmit={e => { e.preventDefault(); void savePin(pinEdit); }}>
      <h3 className="font-bold">Pinned message</h3>
      <textarea className="bxl-pin-input" value={pinEdit} maxLength={160} onChange={e => setPinEdit(e.target.value)} placeholder="e.g. Presale closes in 3 days — tap Presale to join"/>
      <div className="mt-2 flex gap-2"><button type="submit" className="bxl-btn">Pin</button>{pinned && <button type="button" className="bxl-btn ghost" onClick={() => savePin('')}>Unpin</button>}</div>
    </form></div>}
    {modMsg && <div className="bixtok-sheet-wrap" onClick={() => setModMsg(null)}><div className="bixtok-sheet" onClick={e => e.stopPropagation()}>
      <h3 className="font-bold">Moderate @{modMsg.name}</h3><p className="mt-1 text-xs text-muted-foreground">{modMsg.body}</p>
      <div className="mt-3 flex gap-2">{modMsg.kind !== 'gift' && <button className="bxl-btn" onClick={() => moderate(modMsg, false)}>Delete message</button>}<button className="bxl-btn ghost" onClick={() => moderate(modMsg, true)}>Mute in this LIVE</button></div>
    </div></div>}
    {!host && !entered && !ended && <button className="bxl-gate" onClick={() => { void enter(); }}>
      <Volume2 size={34}/><b>Tap to join with sound</b><small>@{live.host_name} · {live.title}</small>
    </button>}
    {note && <div className="bixtok-toast" role="status">{note}</div>}
    {host && !ended && <p className="bixtok-hint">You are broadcasting camera and voice to {Math.max(0, viewers - 1)} viewer{viewers - 1 === 1 ? '' : 's'}. Tap a chat message to moderate it.</p>}
  </div>;
}
