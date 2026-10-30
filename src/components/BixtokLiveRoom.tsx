import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Eye, Gift, Heart, MessageCircle, Mic, MicOff, Radio, Send, Share2, SwitchCamera, Volume2, VolumeX, X, UserPlus, Check, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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

export function BixtokLiveRoom({ live, me, cfg, following, onFollow, onClose, onGift }: {
  live: Live; me: string; cfg: Cfg; following: boolean; onFollow: () => void; onClose: () => void; onGift: () => void;
}) {
  const qc = useQueryClient(); const host = live.host_id === me;
  const [msgs, setMsgs] = useState<Msg[]>([]); const [text, setText] = useState(''); const [ended, setEnded] = useState(false);
  const [sound, setSound] = useState(true); const [likes, setLikes] = useState(0); const [viewers, setViewers] = useState(1);
  const [floaters, setFloaters] = useState<Floater[]>([]); const [banner, setBanner] = useState<Msg | null>(null);
  const [share, setShare] = useState(false); const [copied, setCopied] = useState(false);
  const [mic, setMic] = useState(true); const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const cam = useRef<HTMLVideoElement>(null); const stream = useRef<MediaStream | null>(null);
  const chan = useRef<ReturnType<typeof supabase.channel> | null>(null); const pending = useRef(0);
  const sfx = useSfx(sound); const sfxRef = useRef(sfx); sfxRef.current = sfx;

  const spawn = (n = 1) => setFloaters(f => [...f.slice(-30), ...Array.from({ length: n }, () => ({
    id: Math.random(), x: 10 + Math.random() * 30, color: COLORS[Math.floor(Math.random() * COLORS.length)]!, drift: Math.random() * 60 - 30,
  }))]);

  useEffect(() => {
    supabase.from('bixtok_live_messages').select('id,name,body,kind').eq('live_id', live.id).order('created_at', { ascending: false }).limit(40)
      .then(({ data }) => setMsgs(((data ?? []) as Msg[]).reverse()));
    const db = supabase.channel(`bixtok-${live.id}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bixtok_live_messages', filter: `live_id=eq.${live.id}` }, p => {
        const m = p.new as Msg; setMsgs(x => [...x.slice(-39), m]);
        if (m.kind === 'gift') { sfxRef.current.coin(); setBanner(m); spawn(8); setTimeout(() => setBanner(b => (b?.id === m.id ? null : b)), 3500); }
        else sfxRef.current.chat();
      }).subscribe();
    // Shared room for likes + viewer presence
    const room = supabase.channel(`bixtok-room-${live.id}`, { config: { presence: { key: me } } });
    room.on('broadcast', { event: 'like' }, ({ payload }) => {
      const n = Math.min(Number(payload?.n) || 1, 10); setLikes(l => l + n); spawn(Math.min(n, 4)); sfxRef.current.pop();
    }).on('presence', { event: 'sync' }, () => setViewers(Math.max(1, Object.keys(room.presenceState()).length)))
      .on('presence', { event: 'join' }, ({ key }) => { if (key !== me) sfxRef.current.join(); })
      .subscribe(s => { if (s === 'SUBSCRIBED') void room.track({ at: Date.now() }); });
    chan.current = room;
    const flush = setInterval(() => {
      if (pending.current > 0) { void room.send({ type: 'broadcast', event: 'like', payload: { n: pending.current } }); pending.current = 0; }
    }, 600);
    return () => { clearInterval(flush); supabase.removeChannel(db); supabase.removeChannel(room); };
  }, [live.id, me]);

  useEffect(() => {
    if (!host) return undefined;
    stream.current?.getTracks().forEach(t => t.stop());
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: facing }, audio: true })
      .then(s => { stream.current = s; s.getAudioTracks().forEach(t => { t.enabled = mic; }); if (cam.current) cam.current.srcObject = s; })
      .catch(() => {});
    return () => { stream.current?.getTracks().forEach(t => t.stop()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, facing]);
  useEffect(() => { stream.current?.getAudioTracks().forEach(t => { t.enabled = mic; }); }, [mic]);
  useEffect(() => {
    if (!host) return undefined;
    const limit = setTimeout(() => { void stop(); }, Number(cfg.live_max_minutes) * 60_000);
    return () => clearTimeout(limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host]);

  const stop = async () => { await supabase.rpc('bixtok_end_live', { p_id: live.id }); setEnded(true); qc.invalidateQueries({ queryKey: ['bixtok'] }); };
  const tap = () => { setLikes(l => l + 1); pending.current += 1; spawn(1); sfx.pop(); };
  const url = typeof window !== 'undefined' ? `${window.location.origin}/bixtok` : '/bixtok';
  const shareText = `🔴 LIVE on BIXTOK: ${live.title} — @${live.host_name}`;

  return <div className="bixtok-room" role="dialog" aria-label="LIVE room">
    <div className="bxl-stage" onClick={tap}>
      {host ? <video ref={cam} autoPlay muted playsInline className={`bixtok-video ${facing === 'user' ? 'mirror' : ''}`}/>
        : <div className="bixtok-room-bg"><Radio size={42}/><p>@{live.host_name}</p></div>}
    </div>
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
    <span className="bixtok-badge bxl-livebadge">{live.kind === 'official' ? 'OFFICIAL LIVE' : 'LIVE'}</span>
    {ended && <p className="bixtok-ended">LIVE ended</p>}
    {banner && <div className="bxl-banner" key={banner.id}><Gift size={18}/><div><b>{banner.name}</b><small>{banner.body}</small></div></div>}
    <div className="bxl-floaters" aria-hidden>{floaters.map(f => <Heart key={f.id} className="bxl-heart" fill={f.color} color={f.color}
      style={{ right: `${f.x}px`, ['--drift' as string]: `${f.drift}px` }} onAnimationEnd={() => setFloaters(x => x.filter(y => y.id !== f.id))}/>)}</div>
    <div className="bixtok-chat">{msgs.map(m => <p key={m.id} className={m.kind === 'gift' ? 'gift' : ''}><b>{m.name}</b> {m.body}</p>)}</div>
    {host && <div className="bxl-tools">
      <button aria-label="Flip camera" onClick={() => setFacing(f => (f === 'user' ? 'environment' : 'user'))}><SwitchCamera size={20}/></button>
      <button aria-label={mic ? 'Mute microphone' : 'Unmute microphone'} onClick={() => setMic(m => !m)}>{mic ? <Mic size={20}/> : <MicOff size={20}/>}</button>
    </div>}
    <footer className="bixtok-room-bar">
      {cfg.features['comments'] !== false && <form className="min-w-0 flex-1" onSubmit={async e => { e.preventDefault(); const body = text.trim().slice(0, 200); if (!body) return; setText('');
        const { data: p } = await supabase.from('profiles').select('username').eq('user_id', me).maybeSingle();
        await supabase.from('bixtok_live_messages').insert({ live_id: live.id, user_id: me, name: p?.username || 'member', body }); }}>
        <div className="bixtok-input"><MessageCircle size={16}/><input value={text} onChange={e => setText(e.target.value)} placeholder="Say something…" maxLength={200}/><button aria-label="Send"><Send size={16}/></button></div>
      </form>}
      <button className="bxl-act" aria-label={sound ? 'Mute room sounds' : 'Unmute room sounds'} onClick={() => setSound(s => !s)}>{sound ? <Volume2 size={18}/> : <VolumeX size={18}/>}</button>
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
        {typeof navigator !== 'undefined' && 'share' in navigator && <button onClick={() => { void navigator.share({ title: live.title, text: shareText, url }).catch(() => {}); }}>More…</button>}
      </div>
    </div></div>}
    {host && <p className="bixtok-hint">Tap the screen to send likes. Your camera stays on your device; viewers see the room, chat, likes and gifts.</p>}
  </div>;
}
