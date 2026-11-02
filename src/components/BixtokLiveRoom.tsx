import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Eye, Gift, Heart, MessageCircle, Mic, MicOff, Radio, Send, Share2, SwitchCamera, Volume2, VolumeX, X, UserPlus, Check, Copy, Crown, Pin, Users, LogOut, Camera, ShoppingBag, Swords, Music2, Circle, MonitorUp, MonitorOff, UserRoundPlus, VideoOff, Image as ImageIcon, Sparkles, Minimize2 } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { useLiveRtc } from '@/lib/bixtok-rtc';
import { useReplayRecorder } from '@/lib/bixtok-replay';
import { MEDIA_HELP, listCameras, openLiveMedia, type MediaIssue } from '@/lib/bixtok-media';
import { allBackdrops, backdropCss } from '@/lib/bixtok-backdrops';
import { copyText } from '@/lib/copy-text';
import { FACE_FILTERS, FX_SLIDERS, VOICE_FX, filterVideo, filterVoice, isNeutral, type FxLevels, type VoiceFx } from '@/lib/bixtok-filters';

type Live = { id: string; host_id: string; host_name: string; title: string; started_at: string; kind?: string };
type Msg = { id: string; name: string; body: string; kind: string };
type Cfg = { live_max_minutes: number; features: Record<string, boolean>; stage_max?: number; live_cta?: boolean; host_gifts?: boolean; replay_enabled?: boolean; soundboard?: boolean; pk_enabled?: boolean; showcase_enabled?: boolean; backdrops_enabled?: boolean; live_backdrops?: unknown };
type Pk = { a: string; b: string; started_at: string; ends_at: string };

export const SHOWCASE = {
  staking: { title: 'Staking Booster', sub: 'Join a staking package', to: '/stake', emoji: '💎' },
  booster: { title: 'BOOST APY', sub: 'See the yield engine', to: '/boost', emoji: '🚀' },
  presale: { title: 'BIX Presale', sub: 'Reserve BIXCOIN now', to: '/presale', emoji: '🪙' },
  nft: { title: 'NFT Collection', sub: 'Staking certificates', to: '/nft-marketplace', emoji: '🖼️' },
  shop: { title: 'BIXLINK Shop', sub: 'Official merchandise', to: '/nft-marketplace', emoji: '🛍️' },
} as const;
export type ShowcaseKey = keyof typeof SHOWCASE;
export const SOUNDBOARD = [['applause', '👏', 'Applause'], ['trumpet', '🎺', 'Fanfare'], ['coin', '🪙', 'Coins'], ['cheer', '🎉', 'Cheer']] as const;
export type SfxKey = typeof SOUNDBOARD[number][0];

/** PK winner from display scores; null while tied. */
export function pkWinner(a: number, b: number): 'a' | 'b' | null { return a === b ? null : a > b ? 'a' : 'b'; }
type Floater = { id: number; x: number; color: string; drift: number; px?: number; py?: number };
const QUICK_REACTIONS = ['🔥', '👏', '💎', '❤️', '🚀', '😂'];

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
  const noise = (dur: number, delay = 0, vol = 0.08) => {
    if (!enabled) return;
    try {
      ctx.current ??= new AudioContext();
      const c = ctx.current; if (c.state === 'suspended') void c.resume();
      const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate); const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const src = c.createBufferSource(); const g = c.createGain(); const f = c.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 1800; src.buffer = buf; g.gain.value = vol;
      src.connect(f).connect(g).connect(c.destination); src.start(c.currentTime + delay);
    } catch { /* audio unavailable */ }
  };
  return {
    applause: () => { for (let i = 0; i < 14; i++) noise(0.06, i * 0.07 + Math.random() * 0.03, 0.1); },
    trumpet: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i === 3 ? 0.45 : 0.16, 'sawtooth', i * 0.15, 0.06)); },
    cheer: () => { noise(0.5, 0, 0.06); [784, 988, 1175].forEach((f, i) => tone(f, 0.2, 'triangle', 0.1 + i * 0.08)); },
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
/** A chat line counts as a question for the host Q&A filter when it ends with "?" (gifts never count). */
export function isQuestion(m: { kind?: string; body: string }): boolean {
  return m.kind !== 'gift' && /\?\s*$/.test(m.body.trim());
}
export function isMegaGift(body: string): boolean {
  const g = giftInfo(body);
  return (g.currency === 'BIX' && g.amount >= 10) || (g.currency === 'BIXP' && g.amount >= 100);
}

/** Zoom 1.0 = the camera's full, natural frame; host slider and every viewer share this value. */
export const ZOOM_MIN = 1; export const ZOOM_MAX = 3;
export function clampZoom(z: number): number { return Number.isFinite(z) ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z)) : 1; }

function Tile({ stream, label, mirror }: { stream: MediaStream; label: string; mirror?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { const v = ref.current; if (v) { v.srcObject = stream; void v.play().catch(() => {}); } }, [stream]);
  return <div className="bxl-tile"><video ref={ref} autoPlay muted playsInline style={mirror ? { transform: 'scaleX(-1)' } : undefined}/><small>@{label}</small></div>;
}

function PkSide({ stream, label, score, win, mirror }: { stream: MediaStream | null; label: string; score: number; win: boolean; mirror?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { const v = ref.current; if (v) { v.srcObject = stream; if (stream) void v.play().catch(() => {}); } }, [stream]);
  return <div className={`bxl-pk-side${win ? ' win' : ''}`}>
    {stream ? <video ref={ref} autoPlay muted playsInline style={mirror ? { transform: 'scaleX(-1)' } : undefined}/> : <div className="bxl-pk-empty">{label.slice(0, 1).toUpperCase()}</div>}
    <small>@{label}</small><b>{Math.round(score)}</b>{win && <em>WIN</em>}
  </div>;
}

export function BixtokLiveRoom({ live, me, cfg, following, onFollow, onClose, onGift, onMinimize }: {
  live: Live; me: string; cfg: Cfg; following: boolean; onFollow: () => void; onClose: () => void; onMinimize?: () => void; onGift: (recipients: { id: string; name: string }[]) => void;
}) {
  const qc = useQueryClient(); const host = live.host_id === me;
  const [toolsOpen, setToolsOpen] = useState(false); const [msgs, setMsgs] = useState<Msg[]>([]); const [text, setText] = useState(''); const [ended, setEnded] = useState(false);
  const [sound, setSound] = useState(true); const [likes, setLikes] = useState(0); const [viewers, setViewers] = useState(1);
  const [floaters, setFloaters] = useState<Floater[]>([]); const [banner, setBanner] = useState<Msg | null>(null);
  const [emojis, setEmojis] = useState<{ id: number; e: string; x: number; drift: number }[]>([]);
  const floatEmoji = (e: string) => setEmojis(f => [...f.slice(-20), { id: Math.random(), e, x: 18 + Math.random() * 40, drift: Math.random() * 70 - 35 }]);
  const floatRef = useRef(floatEmoji); floatRef.current = floatEmoji;
  const [mega, setMega] = useState<Msg | null>(null);
  const [share, setShare] = useState(false); const [copied, setCopied] = useState(false);
  const [mic, setMic] = useState(true); const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [camId, setCamId] = useState<string | null>(null); const [cams, setCams] = useState<{ id: string; label: string }[]>([]);
  const [camErr, setCamErr] = useState<MediaIssue | null>(null); const [camTry, setCamTry] = useState(0);
  const cam = useRef<HTMLVideoElement>(null); const view = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null); const [local, setLocal] = useState<MediaStream | null>(null);
  const [entered, setEntered] = useState(host); const [zoom, setZoom] = useState(1);
  const [pinned, setPinned] = useState<string | null>(null); const [pinEdit, setPinEdit] = useState<string | null>(null);
  const [qaOnly, setQaOnly] = useState(false); const qaCount = msgs.filter(isQuestion).length;
  const [stage, setStage] = useState<Stage[]>([]); const [stagePanel, setStagePanel] = useState(false);
  const [top, setTop] = useState<Top[]>([]); const [modMsg, setModMsg] = useState<Msg | null>(null); const [note, setNote] = useState('');
  const [showcase, setShowcase] = useState<ShowcaseKey | null>(null); const [pk, setPk] = useState<Pk | null>(null); const [pkScore, setPkScore] = useState<[number, number]>([0, 0]);
  const [sheet, setSheet] = useState<'board' | 'showcase' | 'pk' | 'bg' | 'fx' | 'cam' | null>(null); const [recording, setRecording] = useState(false);
  const [saver, setSaver] = useState<'hd' | 'sd' | 'audio'>('hd');
  const [clean, setClean] = useState(false);
  const [eco, setEco] = useState(false);
  useEffect(() => {
    try { if (localStorage.getItem('bxl-eco') === '1') setEco(true); } catch {}
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number; charging: boolean }> };
    nav.getBattery?.().then(b => { if (b.level < 0.2 && !b.charging) setEco(true); }).catch(() => {});
  }, []);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    // Mobile data: start in SD automatically. Hidden tab: pause video, keep voice.
    const c = (navigator as Navigator & { connection?: { type?: string; saveData?: boolean; effectiveType?: string } }).connection;
    if (c && (c.type === 'cellular' || c.saveData || /2g|3g/.test(c.effectiveType ?? ''))) setSaver('sd');
    const on = () => setHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', on); return () => document.removeEventListener('visibilitychange', on);
  }, []);
  const [camOff, setCamOff] = useState(false); const [backdrop, setBackdrop] = useState<string | null>(null);
  // Camera-off mode: stop sending camera frames (saves the host's data) while the mic keeps working.
  useEffect(() => { local?.getVideoTracks().forEach(t => { t.enabled = !camOff; }); }, [camOff, local]);
  const [burst, setBurst] = useState<{ id: number; e: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const chan = useRef<ReturnType<typeof supabase.channel> | null>(null); const pending = useRef(0);
  const seen = useRef(new Set<string>());
  const zoomRef = useRef(zoom); zoomRef.current = zoom;
  const sfx = useSfx(sound); const sfxRef = useRef(sfx); sfxRef.current = sfx;
  const mine = stage.find(s => s.user_id === me);
  const guest = !host && mine?.status === 'approved';
  const { mode, feeds, state, audioBlocked, voiceOnly, unlockAudio, setVolume } = useLiveRtc({ liveId: live.id, me, host, hostId: live.host_id, publisher: host || guest, stream: local, saver: saver !== 'hd', audioOnly: saver === 'audio' || hidden });
  const names = new Map(stage.map(s => [s.user_id, s.name])); names.set(live.host_id, live.host_name);
  const main = host ? null : feeds.find(f => f.id === live.host_id) ?? feeds[0] ?? null;
  const tiles = feeds.filter(f => f !== main);
  const flash = (m: string) => { setNote(m); setTimeout(() => setNote(''), 2600); };
  const replay = useReplayRecorder({ stream: host ? local : null, liveId: live.id, me, on: host && recording && cfg.replay_enabled !== false, onNote: flash });
  useEffect(() => { if (!pk) return undefined; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [pk]);

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
  const playSfx = useRef((k: string) => {
    const item = SOUNDBOARD.find(x => x[0] === k); if (!item) return;
    sfxRef.current[item[0]](); setBurst({ id: Math.random(), e: item[1] }); spawn(4);
  });

  useEffect(() => {
    let alive = true; let tick = 0;
    const pull = async (quiet = false) => {
      const [m, l, s] = await Promise.all([
        supabase.from('bixtok_live_messages').select('id,name,body,kind').eq('live_id', live.id).order('created_at', { ascending: false }).limit(40),
        supabase.from('bixtok_lives').select('likes,status,pinned,showcase,pk,cam_off,backdrop').eq('id', live.id).maybeSingle(),
        supabase.from('bixtok_stage_requests').select('id,user_id,name,status').eq('live_id', live.id),
      ]);
      if (!alive) return [];
      const rows = ((m.data ?? []) as Msg[]).reverse();
      ingest.current(rows, quiet);
      if (l.data) { setLikes(Math.max(0, Number(l.data.likes ?? 0)) + pending.current); setPinned(l.data.pinned ?? null); setShowcase((l.data.showcase as ShowcaseKey | null) ?? null); setPk((l.data.pk as Pk | null) ?? null); setCamOff(!!l.data.cam_off); setBackdrop(l.data.backdrop ?? null); if (l.data.status !== 'live') setEnded(true); }
      if (s.data) setStage(s.data as Stage[]);
      if (l.data?.pk) { const sc = await supabase.rpc('bixtok_pk_score', { p_live: live.id }); const r = (sc.data as { a_score: number; b_score: number }[] | null)?.[0]; if (alive && r) setPkScore([Number(r.a_score), Number(r.b_score)]); }
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
    }).on('broadcast', { event: 'react' }, ({ payload }) => { const e = String(payload?.e ?? ''); if (QUICK_REACTIONS.includes(e)) floatRef.current(e); })
      .on('broadcast', { event: 'chat' }, ({ payload }) => ingest.current([payload as Msg]))
      .on('broadcast', { event: 'pin' }, ({ payload }) => setPinned((payload?.text as string) || null))
      .on('broadcast', { event: 'bg' }, ({ payload }) => { setCamOff(!!payload?.off); setBackdrop((payload?.id as string) || null); })
      .on('broadcast', { event: 'showcase' }, ({ payload }) => setShowcase((payload?.key as ShowcaseKey) || null))
      .on('broadcast', { event: 'sfx' }, ({ payload }) => playSfx.current(String(payload?.k ?? '')))
      .on('broadcast', { event: 'del' }, ({ payload }) => setMsgs(x => x.filter(y => y.id !== payload?.id)))
      .on('broadcast', { event: 'stage' }, () => { void pull(true); })
      // Host camera zoom is mirrored on every viewer so they see the same framing.
      .on('broadcast', { event: 'zoom' }, ({ payload }) => { if (!host) setZoom(clampZoom(Number(payload?.z))); })
      .on('presence', { event: 'sync' }, () => setViewers(Math.max(1, Object.keys(room.presenceState()).length)))
      .on('presence', { event: 'join' }, ({ key }) => { if (key !== me) { sfxRef.current.join(); if (host) void room.send({ type: 'broadcast', event: 'zoom', payload: { z: zoomRef.current } }); } })
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
    if (!publishing) { stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; setLocal(null); setCamErr(null); return undefined; }
    let cancelled = false;
    // Release the previous camera first: most Android phones cannot open two cameras at once (flip / retry).
    stream.current?.getTracks().forEach(t => t.stop()); stream.current = null;
    if (cam.current) cam.current.srcObject = null;
    void openLiveMedia(facing, camId).then(r => {
      if (cancelled) { r.stream?.getTracks().forEach(t => t.stop()); return; }
      if (!r.stream) { setLocal(null); setCamErr(r.error); return; }
      stream.current = r.stream; raw.current = r.stream;
      r.stream.getAudioTracks().forEach(t => { t.enabled = mic; });
      if (cam.current) { cam.current.srcObject = r.stream; void cam.current.play().catch(() => {}); }
      setLocal(r.stream); setCamErr(r.error); setRawVer(v => v + 1);
      void listCameras().then(setCams);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publishing, facing, camTry, camId]);
  useEffect(() => () => { stream.current?.getTracks().forEach(t => t.stop()); }, []);
  // Face filters + voice changer: process the raw camera/mic locally and publish the result.
  const raw = useRef<MediaStream | null>(null); const [rawVer, setRawVer] = useState(0);
  const [faceFx, setFaceFx] = useState('none'); const [voiceFx, setVoiceFx] = useState<VoiceFx>('none');
  const [levels, setLevels] = useState<FxLevels>(FACE_FILTERS[0]!.levels);
  const levelsRef = useRef(levels); levelsRef.current = levels;
  const beautyOn = !isNeutral(levels);
  useEffect(() => {
    const r = raw.current; if (!r || !publishing || sharingRef.current) return undefined;
    const rv = r.getVideoTracks()[0]; const ra = r.getAudioTracks()[0];
    const pv = rv && beautyOn ? filterVideo(rv, () => levelsRef.current) : null;
    const pa = ra && voiceFx !== 'none' ? filterVoice(ra, voiceFx) : null;
    const next = new MediaStream([...(pv ? [pv.track] : rv ? [rv] : []), ...(pa ? [pa.track] : ra ? [ra] : [])]);
    next.getAudioTracks().forEach(t => { t.enabled = mic; });
    stream.current = next; setLocal(next);
    return () => { pv?.stop(); pa?.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beautyOn, voiceFx, rawVer, publishing]);
  // Screen sharing (host): swap the outgoing video track for the screen, keep the microphone.
  const [sharing, setSharing] = useState(false);
  const sharingRef = useRef(false); useEffect(() => { sharingRef.current = sharing; }, [sharing]);
  const camTrack = useRef<MediaStreamTrack | null>(null);
  const slideInput = useRef<HTMLInputElement>(null);
  const slideCanvas = useRef<HTMLCanvasElement | null>(null);
  const [slides, setSlides] = useState<HTMLImageElement[]>([]); const [slideIdx, setSlideIdx] = useState(0);
  const stopShare = () => {
    const s = stream.current; if (!s) { setSharing(false); return; }
    const scr = s.getVideoTracks()[0]; const back = camTrack.current;
    const next = new MediaStream([...(back && back.readyState === 'live' ? [back] : []), ...s.getAudioTracks()]);
    if (scr && scr !== back) scr.stop();
    camTrack.current = null; stream.current = next; setLocal(next); setSharing(false); setSlides([]);
  };
  const drawSlide = (img: HTMLImageElement | undefined) => {
    const c = slideCanvas.current; const ctx = c?.getContext('2d'); if (!c || !ctx || !img) return;
    ctx.fillStyle = '#05070a'; ctx.fillRect(0, 0, c.width, c.height);
    const r = Math.min(c.width / img.width, c.height / img.height); const w = img.width * r, h = img.height * r;
    ctx.drawImage(img, (c.width - w) / 2, (c.height - h) / 2, w, h);
  };
  useEffect(() => { if (slides.length) drawSlide(slides[slideIdx]); }, [slides, slideIdx]);
  // Keep the canvas stream ticking so viewers receive frames even when the slide does not change.
  useEffect(() => { if (!slides.length) return undefined; const t = setInterval(() => drawSlide(slides[slideIdx]), 500); return () => clearInterval(t); }, [slides, slideIdx]);
  /** Phone-friendly presentation: broadcast chosen images (slides, PDF screenshots) as the LIVE video. */
  const startSlides = async (files: FileList | null) => {
    const list = [...(files ?? [])].filter(f => f.type.startsWith('image/')).slice(0, 30);
    if (!list.length) { flash('Pilih gambar slide (JPG/PNG). Untuk PDF, simpan halamannya sebagai gambar dulu.'); return; }
    const imgs = await Promise.all(list.map(f => new Promise<HTMLImageElement>((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = URL.createObjectURL(f); }))).catch(() => []);
    if (!imgs.length) { flash('Gambar tidak bisa dibuka'); return; }
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1920; slideCanvas.current = c;
    drawSlide(imgs[0]);
    const track = (c as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream }).captureStream(10).getVideoTracks()[0];
    if (!track) { flash('Perangkat ini belum mendukung mode presentasi'); return; }
    const s = stream.current;
    camTrack.current = s?.getVideoTracks()[0] ?? null;
    const next = new MediaStream([track, ...(s?.getAudioTracks() ?? [])]);
    stream.current = next; setLocal(next); setSlides(imgs); setSlideIdx(0); setSharing(true);
    flash(`Presentasi ${imgs.length} slide sedang tayang`);
  };
  const toggleShare = async () => {
    if (sharing) { stopShare(); return; }
    const md = navigator.mediaDevices as MediaDevices & { getDisplayMedia?: MediaDevices['getDisplayMedia'] };
    if (!md?.getDisplayMedia) { slideInput.current?.click(); return; }
    try {
      const d = await md.getDisplayMedia({ video: { frameRate: 15, width: { ideal: 1920 } }, audio: false });
      const scr = d.getVideoTracks()[0]; if (!scr) return;
      if ('contentHint' in scr) scr.contentHint = 'text';
      const s = stream.current;
      camTrack.current = s?.getVideoTracks()[0] ?? null;
      const next = new MediaStream([scr, ...(s?.getAudioTracks() ?? [])]);
      stream.current = next; setLocal(next); setSharing(true);
      scr.addEventListener('ended', () => stopShare());
      flash('Sharing your screen with viewers');
    } catch { slideInput.current?.click(); }
  };
  useEffect(() => { stream.current?.getAudioTracks().forEach(t => { t.enabled = mic; }); }, [mic, local]);
  useEffect(() => { if (host && cam.current && local) { cam.current.srcObject = local; void cam.current.play().catch(() => {}); } }, [host, local]);
  // Share the host's zoom with viewers (debounced while the slider moves).
  useEffect(() => {
    if (!host) return undefined;
    const t = setTimeout(() => { void chan.current?.send({ type: 'broadcast', event: 'zoom', payload: { z: zoom } }); }, 120);
    return () => clearTimeout(t);
  }, [zoom, host]);
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

  const stop = async () => {
    await supabase.rpc('bixtok_end_live', { p_id: live.id }); setEnded(true);
    if (recording) { flash('Saving replay…'); setRecording(false); await new Promise(r => setTimeout(r, 80)); await replay.finish(); }
    stream.current?.getTracks().forEach(t => t.stop()); qc.invalidateQueries({ queryKey: ['bixtok'] });
  };
  const sendSfx = (k: SfxKey) => { playSfx.current(k); void chan.current?.send({ type: 'broadcast', event: 'sfx', payload: { k } }); };
  const saveShowcase = async (key: ShowcaseKey | null) => {
    const { error } = await supabase.rpc('bixtok_live_showcase', { p_live: live.id, p_key: key as string });
    if (error) return flash(error.message);
    setShowcase(key); setSheet(null); void chan.current?.send({ type: 'broadcast', event: 'showcase', payload: { key } });
  };
  const startPk = async (a: string, b: string, minutes: number) => {
    const { data, error } = await supabase.rpc('bixtok_pk_start', { p_live: live.id, p_a: a, p_b: b, p_minutes: minutes });
    if (error) return flash(error.message);
    setPk(data as unknown as Pk); setPkScore([0, 0]); setSheet(null); sendSfx('trumpet'); ping();
  };
  const endPk = async () => { await supabase.rpc('bixtok_pk_end', { p_live: live.id }); setPk(null); ping(); };
  const enter = async () => {
    setEntered(true); sfxRef.current.join();
    await unlockAudio();
    const v = view.current; if (v && mode === 'p2p') { v.muted = !sound; void v.play().catch(() => {}); }
  };
  const react = (e: string) => {
    if (!QUICK_REACTIONS.includes(e)) return;
    floatEmoji(e); try { navigator.vibrate?.(8); } catch { /* unsupported */ }
    void chan.current?.send({ type: 'broadcast', event: 'react', payload: { e } });
  };
  const tap = (e?: { clientX: number; clientY: number }) => {
    if (audioBlocked) void unlockAudio();
    setLikes(l => l + 1); pending.current += 1; sfx.pop();
    try { navigator.vibrate?.(10); } catch { /* unsupported */ }
    if (e && e.clientX) setFloaters(f => [...f.slice(-30), { id: Math.random(), x: 0, px: e.clientX, py: e.clientY, color: COLORS[Math.floor(Math.random() * COLORS.length)]!, drift: Math.random() * 60 - 30 }]);
    else spawn(1);
  };
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
  const pinReferral = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('referral_codes').select('code').eq('user_id', user?.id ?? '').maybeSingle();
    if (!data?.code) return flash('Your referral code is not ready yet.');
    await savePin(`REF:${data.code}`);
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
  const stageMax = Math.min(5, Math.max(1, Number(cfg.stage_max ?? 5)));

  const bgCss = backdropCss(backdrop, cfg.live_backdrops);
  const bgAvatar = allBackdrops(cfg.live_backdrops).find(b => b.id === backdrop)?.avatar;
  const setBg = async (off: boolean, id: string | null) => {
    const { error } = await supabase.rpc('bixtok_live_backdrop', { p_live: live.id, p_cam_off: off, p_backdrop: id ?? '' });
    if (error) return flash(error.message);
    setCamOff(off); setBackdrop(id);
    void chan.current?.send({ type: 'broadcast', event: 'bg', payload: { off, id } });
  };
  return <div className={`bixtok-room${clean ? ' bxl-clean' : ''}${eco ? ' bxl-eco' : ''}`} role="dialog" aria-label="LIVE room">
    <div className="bxl-view-toggles">
      <button type="button" aria-label={clean ? 'Show chat and buttons' : 'Clean screen: hide chat and buttons'} aria-pressed={clean} onClick={e => { e.stopPropagation(); setClean(c => !c); }}>{clean ? '👁' : '◐'}</button>
      <button type="button" aria-label={eco ? 'Battery saver on' : 'Battery saver off'} aria-pressed={eco} className={eco ? 'on' : ''} onClick={e => { e.stopPropagation(); setEco(v => { const n = !v; try { localStorage.setItem('bxl-eco', n ? '1' : '0'); } catch {} flash(n ? 'Battery saver on: lighter animations' : 'Battery saver off'); return n; }); }}>🔋</button>
    </div>
    <div className="bxl-stage" onClick={tap}>
      {camOff && <div className="bxl-voicebg" style={{ background: bgCss }} aria-hidden>{bgAvatar && <b className="bxl-voicebg-av">{bgAvatar}</b>}<span className="bxl-backdrop-host"><Mic size={14}/> @{live.host_name} · Voice LIVE</span></div>}
      {host ? <>
          <video ref={cam} autoPlay muted playsInline className="bixtok-video" style={{ objectFit: 'contain', transform: sharing ? undefined : `scale(${facing === 'user' ? -zoom : zoom}, ${zoom})` }}/>
          {camErr && <div className="bxl-camerr" role="alert" onClick={e => e.stopPropagation()}>
            <strong>{MEDIA_HELP[camErr].title}</strong>
            <p>{MEDIA_HELP[camErr].body}</p>
            <button type="button" onClick={() => setCamTry(n => n + 1)}>Try again</button>
          </div>}
        </>
        : <>
          <video ref={view} autoPlay playsInline muted className="bixtok-video" style={{ objectFit: 'contain', transform: `scale(${zoom})` }}/>
          {(!main || state !== 'live') && <div className="bixtok-room-bg"><Radio size={42}/><p>@{live.host_name}</p>
            <small>{ended ? 'LIVE ended' : state === 'failed' ? 'Video could not connect on this network — chat, likes and gifts still work.' : voiceOnly ? 'The host is on voice only right now — turn your sound on to listen.' : 'Connecting to the host camera…'}</small></div>}
        </>}
    </div>
    {(tiles.length > 0 || (guest && local)) && <div className="bxl-tiles">
      {guest && local && <Tile stream={local} label="you" mirror={facing === 'user'}/>}
      {tiles.map(t => <Tile key={t.id} stream={t.stream} label={names.get(t.id) ?? 'guest'}/>)}
    </div>}
    {pk && (() => {
      const streamOf = (id: string) => (id === me ? local : feeds.find(f => f.id === id)?.stream ?? null);
      const over = now >= new Date(pk.ends_at).getTime(); const left = Math.max(0, Math.round((new Date(pk.ends_at).getTime() - now) / 1000));
      const total = pkScore[0] + pkScore[1]; const pct = total ? Math.round((pkScore[0] / total) * 100) : 50; const w = over ? pkWinner(pkScore[0], pkScore[1]) : null;
      return <div className="bxl-pk" onClick={tap}>
        <div className="bxl-pk-bar"><i style={{ width: `${pct}%` }}/><span>{Math.round(pkScore[0])}</span><b><Swords size={12}/> {over ? (w ? 'PK END' : 'DRAW') : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`}</b><span>{Math.round(pkScore[1])}</span></div>
        <div className="bxl-pk-grid">
          <PkSide stream={streamOf(pk.a)} label={names.get(pk.a) ?? 'player'} score={pkScore[0]} win={w === 'a'} mirror={pk.a === me && facing === 'user'}/>
          <PkSide stream={streamOf(pk.b)} label={names.get(pk.b) ?? 'player'} score={pkScore[1]} win={w === 'b'} mirror={pk.b === me && facing === 'user'}/>
        </div>
      </div>;
    })()}
    <header className="bixtok-room-top">
      <div className="bxl-host"><span className="bxl-avatar">{live.host_name.slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0"><b className="block truncate text-xs">@{live.host_name}</b><small className="block truncate">{live.title}</small></div>
        {!host && <button className={`bxl-follow ${following ? 'on' : ''}`} aria-label={following ? 'Following' : 'Follow'} onClick={onFollow}>{following ? <Check size={14}/> : <UserPlus size={14}/>}</button>}
      </div>
      <span className="bxl-chip"><Eye size={13}/>{viewers}</span>
      <span className="bxl-chip"><Heart size={13}/>{likes}</span>
      {host && !ended && <button className="bixtok-end" onClick={stop}>End</button>}
      {onMinimize && !ended && <button aria-label="Mini mode" className="bixtok-icon" onClick={onMinimize}><Minimize2 size={17}/></button>}
      <button aria-label="Close" className="bixtok-icon" onClick={() => { if (host && !ended) { if (!window.confirm('Leave and end this LIVE?')) return; void stop(); } onClose(); }}><X size={18}/></button>
    </header>
    <div className="bxl-sub">
      <span className="bixtok-badge">{live.kind === 'official' ? 'OFFICIAL LIVE' : 'LIVE'}</span>
      {top.length > 0 && <span className="bxl-top" aria-label="Top gifters"><Crown size={12}/>{top.map((t, i) => <em key={i}>{['🥇', '🥈', '🥉'][i]} {t.name} · {Number(t.total)} {t.currency}</em>)}</span>}
    </div>
    {pinned && (/^REF:BIX-\d{6}$/.test(pinned) ? <div className="bxl-pin bxl-refcard"><UserRoundPlus size={14}/><span><b>Join @{live.host_name}'s team</b><small> · {pinned.slice(4)}</small></span>
      {!host && <><button onClick={() => { void copyText(`${window.location.origin}/register?ref=${pinned.slice(4)}`).then(ok => flash(ok ? 'Referral link copied' : `Copy failed — code: ${pinned.slice(4)}`)); }}><Copy size={12}/></button>
      <Link to="/register" search={{ ref: pinned.slice(4) }} target="_blank" onClick={() => window.localStorage.setItem('bixlink-ref', pinned.slice(4))}>Join</Link></>}</div>
      : <div className="bxl-pin"><Pin size={13}/><span>{pinned}</span></div>)}
    {!host && cfg.live_cta !== false && <div className="bxl-cta">
      <Link to="/stake">Join Staking</Link>
      <Link to="/presale">Presale</Link>
      <Link to="/nft-marketplace">Shop</Link>
    </div>}
    {showcase && cfg.showcase_enabled !== false && SHOWCASE[showcase] && <Link to={SHOWCASE[showcase].to} className="bxl-showcase" onClick={e => { if (host) e.preventDefault(); }}>
      <span>{SHOWCASE[showcase].emoji}</span><div><b>{SHOWCASE[showcase].title}</b><small>{SHOWCASE[showcase].sub}</small></div><em>{host ? 'Pinned' : 'Open'}</em>
    </Link>}
    {burst && <div className="bxl-sfx-burst" key={burst.id} aria-hidden onAnimationEnd={() => setBurst(null)}>{burst.e}</div>}
    {host && recording && <span className="bxl-rec"><Circle size={9} fill="currentColor"/> REC</span>}
    {ended && <div className="bxl-endcard" role="dialog" aria-label="LIVE ended"><b>LIVE ended</b><small>Thanks for watching @{live.host_name}</small><button type="button" className="bxl-btn" onClick={onClose}>Exit LIVE</button></div>}
    {!host && entered && audioBlocked && sound && <button className="bxl-unmute" onClick={e => { e.stopPropagation(); void unlockAudio(); }}><Volume2 size={16}/> Ketuk untuk mengaktifkan suara</button>}
    {banner && <div className="bxl-banner" key={banner.id}><Gift size={18}/><div><b>{banner.name}</b><small>{banner.body}</small></div></div>}
    {mega && <div className="bxl-mega" key={mega.id} aria-hidden><span>{giftInfo(mega.body).emoji}</span><b>{mega.name}</b><small>{mega.body}</small></div>}
    <div className="bxl-floaters" aria-hidden>{floaters.map(f => <Heart key={f.id} className="bxl-heart" fill={f.color} color={f.color}
      style={f.px != null ? { position: 'fixed', left: `${f.px - 15}px`, top: `${(f.py ?? 0) - 15}px`, bottom: 'auto', ['--drift' as string]: `${f.drift}px` } : { right: `${f.x}px`, ['--drift' as string]: `${f.drift}px` }} onAnimationEnd={() => setFloaters(x => x.filter(y => y.id !== f.id))}/>)}
      {emojis.map(f => <span key={f.id} className="bxl-emoji-float" style={{ right: `${f.x}px`, ['--drift' as string]: `${f.drift}px` }} onAnimationEnd={() => setEmojis(x => x.filter(y => y.id !== f.id))}>{f.e}</span>)}</div>
    {!ended && <div className="bxl-react-bar" role="group" aria-label="Quick reactions" onClick={e => e.stopPropagation()}>{QUICK_REACTIONS.map(e => <button key={e} type="button" aria-label={`React ${e}`} onClick={() => react(e)}>{e}</button>)}</div>}
    <button type="button" className={`bxl-qa-toggle${qaOnly ? ' on' : ''}`} aria-pressed={qaOnly} onClick={() => setQaOnly(v => !v)}>Q&amp;A{qaCount ? ` · ${qaCount}` : ''}</button>
    <div className={`bixtok-chat${showcase && cfg.showcase_enabled !== false ? ' with-card' : ''}`}>{(qaOnly ? msgs.filter(isQuestion) : msgs).map(m => <p key={m.id} className={`${m.kind === 'gift' ? 'gift' : ''}${isQuestion(m) ? ' q' : ''}`} onClick={host ? () => setModMsg(m) : undefined}><b>{m.name}</b> {m.body}</p>)}{qaOnly && !qaCount && <p className="q">No questions yet — viewers can end a message with “?”</p>}</div>
    <div className={`bxl-tools${host && !toolsOpen ? ' compact' : ''}`}>
      {host && <button type="button" className="bxl-tools-more" aria-label={toolsOpen ? 'Hide host tools' : 'Show all host tools'} aria-expanded={toolsOpen} onClick={() => setToolsOpen(o => !o)}>{toolsOpen ? <X size={18}/> : <span style={{ fontSize: '1.1rem', fontWeight: 900 }}>⋯</span>}</button>}
      {publishing && <>
        <button aria-label="Flip camera" onClick={() => setFacing(f => (f === 'user' ? 'environment' : 'user'))}><SwitchCamera size={20}/></button>
        {host && <button aria-label={sharing ? 'Stop sharing screen' : 'Share screen or slides'} title={sharing ? 'Stop sharing' : 'Share screen / slides'} className={sharing ? 'bxl-share-on' : ''} onClick={() => { void toggleShare(); }}>{sharing ? <MonitorOff size={20}/> : <MonitorUp size={20}/>}</button>}
        {host && <input ref={slideInput} type="file" accept="image/*" multiple hidden onChange={e => { void startSlides(e.target.files); e.target.value = ''; }}/>}
        {host && slides.length > 1 && <>
          <button aria-label="Slide sebelumnya" disabled={slideIdx === 0} onClick={() => setSlideIdx(i => Math.max(0, i - 1))}>‹</button>
          <button aria-label="Slide berikutnya" style={{ fontSize: '.65rem', fontWeight: 800 }} onClick={() => setSlideIdx(i => Math.min(slides.length - 1, i + 1))}>{slideIdx + 1}/{slides.length} ›</button>
        </>}
        {host && <label className="bxl-zoom" onClick={e => e.stopPropagation()}><small>{zoom.toFixed(1)}×</small><input type="range" aria-label="Camera zoom" min={ZOOM_MIN} max={ZOOM_MAX} step={0.05} value={zoom} onChange={e => setZoom(clampZoom(+e.target.value))}/></label>}
        <button aria-label={mic ? 'Mute microphone' : 'Unmute microphone'} onClick={() => setMic(m => !m)}>{mic ? <Mic size={20}/> : <MicOff size={20}/>}</button>
      </>}
      {host && cfg.backdrops_enabled !== false && <button aria-label={camOff ? 'Turn camera on' : 'Camera off — show background'} className={camOff ? 'on' : ''} onClick={() => setSheet('bg')}>{camOff ? <VideoOff size={20}/> : <ImageIcon size={20}/>}</button>}
      {publishing && <button aria-label="Filters and voice changer" className={beautyOn || voiceFx !== 'none' ? 'on' : ''} onClick={() => setSheet('fx')}><Sparkles size={20}/></button>}
      {host && <button aria-label="Pin message" onClick={() => setPinEdit(pinned ?? '')}><Pin size={20}/></button>}
      {host && <button aria-label="Pin my referral card" onClick={() => { void pinReferral(); }}><UserRoundPlus size={20}/></button>}
      {host && cfg.soundboard !== false && <button aria-label="Soundboard" onClick={() => setSheet('board')}><Music2 size={20}/></button>}
      {host && cfg.showcase_enabled !== false && <button aria-label="Showcase card" className={showcase ? 'on' : ''} onClick={() => setSheet('showcase')}><ShoppingBag size={20}/></button>}
      {host && cfg.pk_enabled !== false && <button aria-label="PK battle" className={pk ? 'on' : ''} onClick={() => setSheet('pk')}><Swords size={20}/></button>}
      {host && cfg.replay_enabled !== false && !ended && <button aria-label={recording ? 'Stop recording replay' : 'Record replay'} className={recording ? 'rec' : ''} onClick={() => { setRecording(r => !r); flash(recording ? 'Recording stopped — saving replay…' : 'Recording replay to your BIXTOK feed'); }}><Circle size={20} fill={recording ? 'currentColor' : 'none'}/></button>}
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
      {!host && <button className="bxl-act" aria-label={`Video quality: ${saver}. Tap to change`} onClick={() => setSaver(v => { const n = v === 'hd' ? 'sd' : v === 'sd' ? 'audio' : 'hd'; flash(n === 'audio' ? 'Audio-only data saver: video paused, voice continues' : n === 'sd' ? 'SD data saver on' : 'HD video'); return n; })} style={{ fontSize: '.55rem', fontWeight: 800 }}>{saver === 'audio' ? 'AUD' : saver.toUpperCase()}</button>}
      {!host && <button className="bxl-act" aria-label={sound ? 'Mute room sounds' : 'Unmute room sounds'} onClick={() => { setSound(s => !s); if (!sound) void unlockAudio(); }}>{sound ? <Volume2 size={18}/> : <VolumeX size={18}/>}</button>}
      <button className="bxl-act" aria-label="Share" onClick={() => setShare(true)}><Share2 size={18}/></button>
      {(!host || (cfg.host_gifts !== false && onStage.length > 0)) && <button className="bixtok-giftbtn" aria-label="Send gift" onClick={() => onGift([...(host ? [] : [{ id: live.host_id, name: live.host_name }]), ...onStage.filter(s => s.user_id !== me).map(s => ({ id: s.user_id, name: s.name }))])}><Gift/></button>}
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
      <div className="flex items-center justify-between"><h3 className="font-bold">Stage guests (max {stageMax})</h3><button aria-label="Close" onClick={() => setStagePanel(false)}><X size={18}/></button></div>
      {!pendingReq.length && !onStage.length && <p className="mt-3 text-sm text-muted-foreground">No requests yet. Viewers tap the people icon to ask to join.</p>}
      <ul className="bxl-stage-list">
        {pendingReq.map(s => <li key={s.id}><b>@{s.name}</b><span>wants to join</span><button onClick={() => decide(s.id, 'approved')}>Accept</button><button className="ghost" onClick={() => decide(s.id, 'rejected')}>Decline</button></li>)}
        {onStage.map(s => <li key={s.id}><b>@{s.name}</b><span>on stage</span>{cfg.host_gifts !== false && <button onClick={() => onGift([{ id: s.user_id, name: s.name }])}><Gift size={13}/> Gift</button>}<button className="ghost" onClick={() => decide(s.id, 'left')}>Remove</button></li>)}
      </ul>
    </div></div>}
    {pinEdit !== null && <div className="bixtok-sheet-wrap" onClick={() => setPinEdit(null)}><form className="bixtok-sheet" onClick={e => e.stopPropagation()} onSubmit={e => { e.preventDefault(); void savePin(pinEdit); }}>
      <h3 className="font-bold">Pinned message</h3>
      <textarea className="bxl-pin-input" value={pinEdit} maxLength={160} onChange={e => setPinEdit(e.target.value)} placeholder="e.g. Presale closes in 3 days — tap Presale to join"/>
      <div className="mt-2 flex gap-2"><button type="submit" className="bxl-btn">Pin</button>{pinned && <button type="button" className="bxl-btn ghost" onClick={() => savePin('')}>Unpin</button>}</div>
    </form></div>}
    {sheet && <div className="bixtok-sheet-wrap" onClick={() => setSheet(null)}><div className={`bixtok-sheet bxl-lux-sheet${sheet === 'fx' ? ' bxl-fx-sheet' : ''}`} onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between"><h3 className="font-bold">{sheet === 'board' ? 'Soundboard' : sheet === 'showcase' ? 'Showcase card' : sheet === 'bg' ? 'Camera off · background' : sheet === 'fx' ? 'Filters & voice' : 'PK battle'}</h3><button aria-label="Close" className="bxl-lux-x" onClick={() => setSheet(null)}><X size={20}/></button></div>
      <button type="button" className="bxl-back" onClick={() => setSheet(null)}>‹ Back to LIVE</button>
      {sheet === 'board' && <div className="bxl-board">{SOUNDBOARD.map(([k, e, l]) => <button key={k} onClick={() => sendSfx(k)}><span>{e}</span>{l}</button>)}<p>Everyone in the room hears it.</p></div>}
      {sheet === 'fx' && <div>
        <p className="mt-1 text-xs opacity-70">Effects run on your phone — viewers see and hear them with no extra data.</p>
        <div className="bxl-board">{FACE_FILTERS.map(f => <button key={f.id} className={faceFx === f.id ? 'on' : ''} onClick={() => { setFaceFx(f.id); setLevels(f.levels); }}><span>{f.id === 'none' ? '🙂' : '✨'}</span>{f.name}</button>)}</div>
        <button type="button" className="bxl-btn ghost mt-2 w-full" onClick={() => { setFaceFx('none'); setLevels(FACE_FILTERS[0]!.levels); }}>Reset to original</button>
        <h4 className="mt-3 text-xs font-bold opacity-80">Voice changer</h4>
        <div className="bxl-board">{VOICE_FX.map(v => <button key={v.id} className={voiceFx === v.id ? 'on' : ''} onClick={() => setVoiceFx(v.id)}><span>{v.id === 'robot' ? '🤖' : v.id === 'deep' ? '🎙️' : v.id === 'echo' ? '🔊' : v.id === 'studio' ? '🎧' : '🗣️'}</span>{v.name}</button>)}</div>
        <button type="button" className="bxl-fx-done" onClick={() => setSheet(null)}><Check size={16}/> Done · close filters</button>
      </div>}
      {sheet === 'bg' && <div>
        <p className="mt-1 text-xs opacity-70">Hide your camera and show a background — your voice stays live. Saves data too.</p>
        <div className="bxl-bg-grid">{allBackdrops(cfg.live_backdrops).map(b => <button key={b.id} type="button" className={camOff && (backdrop ?? 'obsidian-gold') === b.id ? 'on' : ''} onClick={() => { void setBg(true, b.id); }}><i style={{ background: b.css }}>{b.avatar}</i><small>{b.name}</small></button>)}</div>
        {camOff && <button type="button" className="bxl-btn mt-3 w-full" onClick={() => { void setBg(false, backdrop); setSheet(null); }}><Camera size={14}/> Turn camera back on</button>}
      </div>}
      {sheet === 'showcase' && <div className="bxl-board">{(Object.keys(SHOWCASE) as ShowcaseKey[]).map(k => <button key={k} className={showcase === k ? 'on' : ''} onClick={() => saveShowcase(k)}><span>{SHOWCASE[k].emoji}</span>{SHOWCASE[k].title}</button>)}
        {showcase && <button className="ghost" onClick={() => saveShowcase(null)}>Remove card</button>}</div>}
      {sheet === 'pk' && <PkSetup players={[{ id: live.host_id, name: live.host_name }, ...onStage.map(s => ({ id: s.user_id, name: s.name }))]} active={!!pk} onStart={startPk} onEnd={() => { void endPk(); setSheet(null); }}/>}
    </div></div>}
    {modMsg && <div className="bixtok-sheet-wrap" onClick={() => setModMsg(null)}><div className="bixtok-sheet" onClick={e => e.stopPropagation()}>
      <h3 className="font-bold">Moderate @{modMsg.name}</h3><p className="mt-1 text-xs text-muted-foreground">{modMsg.body}</p>
      <div className="mt-3 flex flex-wrap gap-2">{isQuestion(modMsg) && <button className="bxl-btn" onClick={() => { void savePin(`❓ @${modMsg.name}: ${modMsg.body}`.slice(0, 140)); setModMsg(null); }}>Spotlight question</button>}{modMsg.kind !== 'gift' && <button className="bxl-btn ghost" onClick={() => moderate(modMsg, false)}>Delete message</button>}<button className="bxl-btn ghost" onClick={() => moderate(modMsg, true)}>Mute in this LIVE</button></div>
    </div></div>}
    {!host && !entered && !ended && <button className="bxl-gate" onClick={() => { void enter(); }}>
      <Volume2 size={34}/><b>Tap to join with sound</b><small>@{live.host_name} · {live.title}</small>
    </button>}
    {note && <div className="bixtok-toast" role="status">{note}</div>}
    {host && !ended && <p className="bixtok-hint">{!local ? 'Camera and microphone are off — viewers cannot see or hear you yet.' : `You are broadcasting ${local.getVideoTracks().length ? 'camera' : ''}${local.getVideoTracks().length && local.getAudioTracks().length ? ' and ' : ''}${local.getAudioTracks().length ? 'voice' : ''} to ${Math.max(0, viewers - 1)} viewer${viewers - 1 === 1 ? '' : 's'}${mode === 'lk' ? '' : ' (backup connection)'}. Tap a chat message to moderate it.`}</p>}
  </div>;
}

function PkSetup({ players, active, onStart, onEnd }: { players: { id: string; name: string }[]; active: boolean; onStart: (a: string, b: string, m: number) => void; onEnd: () => void }) {
  const [a, setA] = useState(players[0]?.id ?? ''); const [b, setB] = useState(players[1]?.id ?? ''); const [m, setM] = useState(5);
  if (active) return <div className="mt-3"><p className="text-sm text-muted-foreground">A PK battle is running. Gifts sent to each player count toward their score.</p><button className="bxl-btn mt-3" onClick={onEnd}>End PK</button></div>;
  if (players.length < 2) return <p className="mt-3 text-sm text-muted-foreground">Accept at least one stage guest first, then start a PK battle.</p>;
  return <form className="mt-3 grid gap-2" onSubmit={e => { e.preventDefault(); if (a && b && a !== b) onStart(a, b, m); }}>
    <label className="text-xs text-muted-foreground">Left player<select className="form-input mt-1" value={a} onChange={e => setA(e.target.value)}>{players.map(p => <option key={p.id} value={p.id}>@{p.name}</option>)}</select></label>
    <label className="text-xs text-muted-foreground">Right player<select className="form-input mt-1" value={b} onChange={e => setB(e.target.value)}>{players.map(p => <option key={p.id} value={p.id}>@{p.name}</option>)}</select></label>
    <label className="text-xs text-muted-foreground">Duration (minutes)<input className="form-input mt-1" type="number" min={1} max={30} value={m} onChange={e => setM(Number(e.target.value))}/></label>
    <button type="submit" className="bxl-btn" disabled={!a || !b || a === b}>Start PK</button>
    <p className="text-[10px] text-muted-foreground">Score is display-only from gifts sent during the battle.</p>
  </form>;
}
