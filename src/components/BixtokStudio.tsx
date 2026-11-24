import { useEffect, useRef, useState } from 'react';
import { Upload, Camera, RefreshCw, Sparkles, Smile, Sun, Wand2, Timer, Type, X, Check, Gauge, Link2, Plus, Trash2, Music2, Search, Play, Pause, Download, Bold } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import bixtokLogo from '@/assets/bixtok-logo.png';

export const BIXTOK_FILTERS: { key: string; label: string; css: string; face?: boolean }[] = [
  { key: 'none', label: 'Original', css: 'none' },
  { key: 'bright', label: 'Brighten', css: 'brightness(1.18) contrast(0.96) saturate(1.04)', face: true },
  { key: 'smooth', label: 'Smooth Skin', css: 'brightness(1.06) contrast(0.9) blur(0.7px) saturate(1.05)', face: true },
  { key: 'radiant', label: 'Radiant Lux', css: 'brightness(1.12) sepia(0.12) saturate(1.2) contrast(0.97)', face: true },
  { key: 'beauty', label: 'Beauty', css: 'brightness(1.08) contrast(0.94) saturate(1.06) blur(0.4px)', face: true },
  { key: 'glow', label: 'Studio Glow', css: 'brightness(1.16) contrast(1.02) saturate(1.1)' },
  { key: 'warm', label: 'Rosy', css: 'sepia(0.18) saturate(1.25) brightness(1.06) hue-rotate(-8deg)' },
  { key: 'gold', label: 'Golden Lux', css: 'sepia(0.35) saturate(1.4) brightness(1.04) contrast(1.05)' },
  { key: 'matcha', label: 'Matcha Cyber', css: 'hue-rotate(28deg) saturate(1.35) contrast(1.1)' },
  { key: 'cool', label: 'Ice', css: 'hue-rotate(-18deg) saturate(1.1) brightness(1.05)' },
  { key: 'vivid', label: 'Vivid', css: 'saturate(1.6) contrast(1.12)' },
  { key: 'noir', label: 'Noir Titanium', css: 'grayscale(1) contrast(1.25) brightness(1.02)' },
];
export const filterCss = (k?: string | null) => BIXTOK_FILTERS.find(f => f.key === k)?.css ?? 'none';

export type TextStyle = { x: number; y: number; color: string; size: number; weight: number; bg: boolean; shadow: boolean; font: string; italic?: boolean };
export const DEFAULT_TEXT: TextStyle = { x: 50, y: 30, color: '#ffffff', size: 26, weight: 800, bg: false, shadow: true, font: 'sans-serif' };
const COLORS = ['#ffffff', '#000000', '#FFD700', '#9BE15D', '#FF8A00', '#38BDF8', '#F472B6', '#A855F7', '#EF4444'];
const FONTS: [string, string][] = [['sans-serif', 'Classic'], ['Georgia, serif', 'Serif'], ['"Courier New", monospace', 'Mono'], ['"Brush Script MT", cursive', 'Script'], ['Impact, sans-serif', 'Bold']];
export function textCss(s?: Partial<TextStyle> | null): React.CSSProperties {
  const t = { ...DEFAULT_TEXT, ...(s ?? {}) };
  return { left: `${t.x}%`, top: `${t.y}%`, color: t.color, fontSize: `${t.size}px`, fontWeight: t.weight, fontFamily: t.font, fontStyle: t.italic ? 'italic' : 'normal',
    background: t.bg ? (t.color === '#000000' ? '#fff' : 'rgba(0,0,0,.6)') : 'transparent', padding: t.bg ? '.15em .45em' : 0, borderRadius: '.35em',
    textShadow: t.shadow ? '0 2px 8px rgba(0,0,0,.75)' : 'none' };
}

const DURATIONS = [600, 60, 15];
const SPEEDS = [0.5, 1, 2];
const TAGS = ['#BIXLINK', '#BIXCOIN', '#Staking', '#Web3', '#FinancialFreedom'];
type Sound = { id: string; title: string; artist: string; category: string; audio_url: string; cover?: string | undefined };

/** Center-crops any camera frame to portrait 9:16 so recordings match the full-screen preview. */
function frame9x16(v: HTMLVideoElement) {
  const vw = v.videoWidth || 720, vh = v.videoHeight || 1280;
  const sw = Math.min(vw, Math.round(vh * 9 / 16)), sh = Math.min(vh, Math.round(sw * 16 / 9));
  return { sx: Math.round((vw - sw) / 2), sy: Math.round((vh - sh) / 2), sw, sh, w: sw, h: sh };
}

export function DraggableText({ text, style, onMove, editable }: { text: string; style: TextStyle; onMove?: (x: number, y: number) => void; editable?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null); const [drag, setDrag] = useState(false);
  const down = (e: React.PointerEvent) => {
    if (!editable || !onMove) return; e.preventDefault(); e.stopPropagation();
    const el = ref.current; const box = el?.parentElement?.getBoundingClientRect(); if (!el || !box) return;
    el.setPointerCapture(e.pointerId); setDrag(true);
    const sx = e.clientX, sy = e.clientY, ox = style.x, oy = style.y; let nx = ox, ny = oy, raf = 0;
    const move = (ev: PointerEvent) => {
      nx = Math.min(95, Math.max(5, ox + ((ev.clientX - sx) / box.width) * 100));
      ny = Math.min(92, Math.max(6, oy + ((ev.clientY - sy) / box.height) * 100));
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; el.style.left = `${nx}%`; el.style.top = `${ny}%`; });
    };
    const up = () => { cancelAnimationFrame(raf); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); setDrag(false); onMove(nx, ny); };
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  };
  return <span ref={ref} onPointerDown={down} className={`studio-overlay${editable ? ' drag' : ''}${drag ? ' dragging' : ''}`} style={textCss(style)}>{text}</span>;
}

export function BixtokStudio({ userId, onClose, onDone, slots = 5, maxLinks = 10 }: { userId: string; onClose: () => void; onDone: (msg: string) => void; slots?: number; maxLinks?: number }) {
  const [mode, setMode] = useState<'link' | 'camera'>('link');
  const [links, setLinks] = useState<string[]>(() => Array.from({ length: Math.max(1, slots) }, () => ''));
  const [filter, setFilter] = useState('none');
  const [smooth, setSmooth] = useState(0); const [glow, setGlow] = useState(0); const [bright, setBright] = useState(0);
  const [facing, setFacing] = useState<'user' | 'environment'>('user'); const [zoom, setZoom] = useState(1); const [beautyOpen, setBeautyOpen] = useState(false); const [fxOpen, setFxOpen] = useState(false); const [photoMode, setPhotoMode] = useState(false); const [toolsOpen, setToolsOpen] = useState(true);
  const [dur, setDur] = useState(15); const [speed, setSpeed] = useState(1); const [timer, setTimer] = useState(0);
  const [count, setCount] = useState(0); const [rec, setRec] = useState(false); const [elapsed, setElapsed] = useState(0);
  const [camErr, setCamErr] = useState(''); const [shot, setShot] = useState<{ url: string; ext: string } | null>(null);
  const [caption, setCaption] = useState('');
  const [overlay, setOverlay] = useState(''); const [ts, setTs] = useState<TextStyle>(DEFAULT_TEXT); const [textOpen, setTextOpen] = useState(false);
  const [music, setMusic] = useState<{ title: string; url: string } | null>(null); const [musicOpen, setMusicOpen] = useState(false);
  const [gifts, setGifts] = useState(true); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const hwZoom = useRef<{ min: number; max: number } | null>(null);
  const applyZoom = (z: number) => { setZoom(z); const tr = stream.current?.getVideoTracks()[0]; const hz = hwZoom.current; if (tr && hz) tr.applyConstraints({ advanced: [{ zoom: Math.min(hz.max, Math.max(hz.min, hz.min * z)) }] } as unknown as MediaTrackConstraints).catch(() => {}); };
  const vid = useRef<HTMLVideoElement>(null); const stream = useRef<MediaStream | null>(null); const recorder = useRef<MediaRecorder | null>(null);

  const css = (() => { const base = filterCss(filter); const extra = `brightness(${1 + bright / 400 + glow / 600}) saturate(${1 + glow / 500}) contrast(${1 - smooth / 900}) blur(${(smooth / 140).toFixed(2)}px)`; return base === 'none' ? extra : `${base} ${extra}`; })();

  useEffect(() => {
    if (mode !== 'camera' || shot) return undefined;
    let off = false;
    (async () => {
      try {
        stream.current?.getTracks().forEach(t => t.stop());
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } }, audio: true });
        if (off) { s.getTracks().forEach(t => t.stop()); return; }
        stream.current = s; setCamErr(''); setZoom(1);
        const tr = s.getVideoTracks()[0]; const cap = (tr?.getCapabilities?.() ?? {}) as { zoom?: { min: number; max: number } };
        hwZoom.current = cap.zoom ?? null;
        const adv: Record<string, unknown> = { exposureMode: 'continuous', whiteBalanceMode: 'continuous', focusMode: 'continuous' };
        if (cap.zoom) adv.zoom = cap.zoom.min;
        tr?.applyConstraints({ advanced: [adv] } as unknown as MediaTrackConstraints).catch(() => {});
        if (vid.current) { vid.current.srcObject = s; vid.current.play().catch(() => {}); }
      } catch { setCamErr('Camera unavailable on this device.'); }
    })();
    return () => { off = true; stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; };
  }, [facing, mode, shot]);

  useEffect(() => {
    if (!rec) return undefined;
    const t = setInterval(() => setElapsed(e => { if (e + 1 >= dur) stopRec(); return e + 1; }), 1000);
    return () => clearInterval(t);
  }, [rec, dur]); // eslint-disable-line react-hooks/exhaustive-deps

  const drawText = (ctx: CanvasRenderingContext2D, c: HTMLCanvasElement) => {
    if (!overlay) return; const scale = c.width / (vid.current?.clientWidth || 360);
    ctx.filter = 'none'; ctx.font = `${ts.italic ? 'italic ' : ''}${ts.weight} ${Math.round(ts.size * scale)}px ${ts.font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const x = c.width * ts.x / 100, y = c.height * ts.y / 100;
    if (ts.bg) { const w = ctx.measureText(overlay).width + ts.size * scale; ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(x - w / 2, y - ts.size * scale * 0.75, w, ts.size * scale * 1.5); }
    if (ts.shadow) { ctx.shadowColor = 'rgba(0,0,0,.75)'; ctx.shadowBlur = 8; }
    ctx.fillStyle = ts.color; ctx.fillText(overlay, x, y); ctx.shadowBlur = 0;
  };
  const startRec = () => {
    const v = vid.current; const s = stream.current; if (!v || !s) return;
    const c = document.createElement('canvas'); const fr = frame9x16(v); c.width = fr.w; c.height = fr.h;
    const ctx = c.getContext('2d')!; let raf = 0;
    const draw = () => { ctx.filter = css; if (facing === 'user') ctx.setTransform(-1, 0, 0, 1, c.width, 0); ctx.drawImage(v, fr.sx, fr.sy, fr.sw, fr.sh, 0, 0, c.width, c.height); ctx.setTransform(1, 0, 0, 1, 0, 0); drawText(ctx, c); raf = requestAnimationFrame(draw); };
    draw();
    const out = c.captureStream(Math.max(10, Math.round(30 / speed)));
    if (speed === 1) s.getAudioTracks().forEach(t => out.addTrack(t));
    const mime = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m)) ?? '';
    const r = new MediaRecorder(out, mime ? { mimeType: mime, videoBitsPerSecond: 6_000_000 } : undefined); const chunks: Blob[] = [];
    r.ondataavailable = e => e.data.size && chunks.push(e.data);
    r.onstop = () => { cancelAnimationFrame(raf); const type = r.mimeType || 'video/webm'; setShot({ url: URL.createObjectURL(new Blob(chunks, { type })), ext: type.includes('mp4') ? 'mp4' : 'webm' }); };
    recorder.current = r; r.start(500); setElapsed(0); setRec(true);
  };
  function stopRec() { setRec(false); if (recorder.current?.state === 'recording') recorder.current.stop(); }
  const shoot = () => {
    if (rec) return stopRec(); if (!timer) return startRec();
    setCount(timer); let n = timer;
    const t = setInterval(() => { n -= 1; setCount(n); if (n <= 0) { clearInterval(t); startRec(); } }, 1000);
  };
  const snap = () => {
    const v = vid.current; if (!v) return;
    const c = document.createElement('canvas'); const fr = frame9x16(v); c.width = fr.w; c.height = fr.h;
    const ctx = c.getContext('2d')!; ctx.filter = css; if (facing === 'user') ctx.setTransform(-1, 0, 0, 1, c.width, 0); ctx.drawImage(v, fr.sx, fr.sy, fr.sw, fr.sh, 0, 0, c.width, c.height); ctx.setTransform(1, 0, 0, 1, 0, 0); drawText(ctx, c);
    c.toBlob(b => b && setShot({ url: URL.createObjectURL(b), ext: 'jpg' }), 'image/jpeg', 0.92);
  };

  const fileRef = useRef<HTMLInputElement>(null); const [pct, setPct] = useState('');
  /** Uploads a device file/recording to the member's own media folder, then publishes it via the server RPC. */
  const postBlob = async (blob: Blob, ext: string) => {
    const kind = blob.type.startsWith('image/') ? 'photo' : 'video';
    if (blob.size > 50 * 1024 * 1024) return setErr('File is larger than 50 MB. Trim the video or use a link.');
    if (!blob.type.startsWith('image/') && !blob.type.startsWith('video/')) return setErr('Choose a video or photo file.');
    setBusy(true); setErr(''); setPct('Uploading…');
    const path = `${userId}/post-${Date.now()}.${ext.replace(/[^a-z0-9]/gi, '').toLowerCase() || (kind === 'photo' ? 'jpg' : 'mp4')}`;
    const up = await supabase.storage.from('bixtok-media').upload(path, blob, { contentType: blob.type, upsert: false });
    if (up.error) { setBusy(false); setPct(''); return setErr(`Upload failed: ${up.error.message}`); }
    setPct('Publishing…');
    const { error } = await supabase.rpc('bixtok_publish', { p_path: path, p_kind: kind, p_caption: caption, p_filter: filter, p_overlay: overlay, p_allow_gifts: gifts });
    setBusy(false); setPct('');
    if (error) { await supabase.storage.from('bixtok-media').remove([path]); return setErr(error.message); }
    const { data: rw } = await supabase.rpc('bixtok_post_reward_claim' as never); const r = rw as { amount?: number } | null;
    onDone(`Posted to BIXTOK${r?.amount ? ` · +${Number(r.amount).toFixed(2)} BIX` : ''}`);
  };
  const onFile = (f: File | undefined) => { if (f) void postBlob(f, f.name.split('.').pop() ?? ''); if (fileRef.current) fileRef.current.value = ''; };
  const postShot = async () => { if (!shot) return; const b = await (await fetch(shot.url)).blob(); await postBlob(b, shot.ext); };
  const publish = async () => {
    const urls = links.map(l => l.trim()).filter(Boolean);
    if (!urls.length) return setErr('Paste at least one link.');
    if (urls.some(u => !/^https:\/\/\S+$/.test(u))) return setErr('Every link must start with https://');
    setBusy(true); setErr('');
    const { data, error } = await supabase.rpc('bixtok_publish_links', { p_urls: urls, p_caption: caption, p_filter: filter, p_overlay: overlay, p_text_style: ts as never, p_music_title: music?.title ?? '', p_music_url: music?.url ?? '', p_allow_gifts: gifts });
    setBusy(false);
    if (error) return setErr(error.message);
    const { data: rw } = await supabase.rpc('bixtok_post_reward_claim' as never);
    const r = rw as { amount?: number } | null;
    onDone(`${data} post${Number(data) > 1 ? 's' : ''} published to BIXTOK${r?.amount ? ` · +${Number(r.amount).toFixed(2)} BIX` : ''}`);
  };

  const textBtn = <button onClick={() => { if (!overlay) setOverlay('Your text'); setTextOpen(true); }}><Type/><small>Text</small></button>;
  const musicBtn = <button className="studio-music-pill" onClick={() => setMusicOpen(true)}><Music2 size={14}/>{music ? music.title.slice(0, 22) : 'Add sound'}</button>;

  return <div className="bixtok-studio" role="dialog" aria-label="Create post">
    <input ref={fileRef} type="file" accept="video/*,image/*" hidden onChange={e => onFile(e.target.files?.[0])}/>
    {mode === 'camera' ? <>
      <div className="studio-stage">
        {shot ? (shot.ext === 'jpg' ? <img src={shot.url} alt="Captured"/> : <video src={shot.url} autoPlay loop playsInline controls/>)
          : camErr ? <p className="studio-camerr">{camErr}</p> : <video ref={vid} muted playsInline style={{ filter: css, objectFit: 'cover', transform: (() => { const z = hwZoom.current ? 1 : zoom; return `scale(${facing === 'user' ? -z : z}, ${z})`; })() }}/>}
        {!shot && overlay && <DraggableText text={overlay} style={ts} editable onMove={(x, y) => setTs(s => ({ ...s, x, y }))}/>}
        {count > 0 && <span className="studio-count">{count}</span>}
        {rec && <span className="studio-rec">● {elapsed}s / {dur}s</span>}
      </div>
      <header className="studio-top tt"><button aria-label="Close" onClick={onClose}><X/></button>{musicBtn}<span/></header>
      {!shot && <aside className="studio-tools">
        <button onClick={() => setFacing(f => f === 'user' ? 'environment' : 'user')}><RefreshCw/><small>Balik</small></button>
        {toolsOpen && <><button onClick={() => setSpeed(s => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length]!)}><Gauge/><small>{speed}×</small></button>
        <button onClick={() => setTimer(t => t === 0 ? 3 : t === 3 ? 10 : 0)}><Timer/><small>{timer ? `${timer}s` : 'Timer'}</small></button>
        {textBtn}
        <button onClick={() => setBeautyOpen(o => !o)} className={beautyOpen ? 'on' : ''}><Sparkles/><small>Beauty</small></button>
        <button onClick={() => applyZoom(zoom >= 2 ? 1 : zoom + 0.5)}><Search/><small>{zoom}×</small></button></>}
        <button aria-label="Lainnya" onClick={() => setToolsOpen(o => !o)} className="tt-chev">{toolsOpen ? '︿' : '﹀'}</button>
      </aside>}
      <div className="studio-bottom">
        {shot ? <div className="studio-shot-actions">
          <button className="bixtok-cta" disabled={busy} onClick={() => void postShot()}><Check size={16} className="inline"/> {busy ? pct || 'Posting…' : 'Post to BIXTOK'}</button>
          {err && <p className="studio-err">{err}</p>}
          <a className="studio-ghost" href={shot.url} download={`bixtok-${Date.now()}.${shot.ext}`}><Download size={16} className="inline"/> Save to device</a>
          <button className="studio-ghost" onClick={() => setShot(null)}>Retake</button>
          <p className="text-[11px] opacity-75">Post it directly, or save it to your device.</p>
        </div> : <>
          {beautyOpen && <BeautySliders smooth={smooth} glow={glow} bright={bright} set={{ setSmooth, setGlow, setBright }}/>}
          {fxOpen && <div className="tt-fx"><div className="tt-fx-head"><b>Efek &amp; Filter</b><button onClick={() => setFxOpen(false)}><X size={18}/></button></div><FilterRow value={filter} onPick={setFilter}/></div>}
          {!rec && <div className="studio-durs tt">{DURATIONS.map(d => <button key={d} className={!photoMode && dur === d ? 'on' : ''} onClick={() => { setPhotoMode(false); setDur(d); }}>{d === 600 ? '10 mnt' : `${d} detik`}</button>)}<button className={photoMode ? 'on' : ''} onClick={() => setPhotoMode(true)}>FOTO</button></div>}
          <div className="studio-shutter tt">
            <button className="studio-side" onClick={() => setFxOpen(o => !o)}><Wand2/><small>Efek</small></button>
            <button aria-label={photoMode ? 'Take photo' : rec ? 'Stop recording' : 'Record'} className={`studio-rec-btn ${rec ? 'on' : ''} ${photoMode ? 'photo' : ''}`} disabled={!!camErr} onClick={photoMode ? snap : shoot}/>
            <button className="studio-side" disabled={busy || rec} onClick={() => fileRef.current?.click()}><Upload/><small>{busy && pct ? pct : 'Unggah'}</small></button>
          </div>
          <div className="tt-modes"><button className="on">KAMERA</button><button onClick={() => setMode('link')}>BUAT</button></div>
        </>}
      </div>
    </> : <div className="studio-edit">
      <header className="studio-top"><button aria-label="Close" onClick={onClose}><X/></button><b className="flex items-center gap-2"><img src={bixtokLogo} alt="" width={22} height={22}/>New post</b><button aria-label="Camera" onClick={() => setMode('camera')}><Camera/></button></header>
      <button className="bixtok-cta w-full" disabled={busy} onClick={() => fileRef.current?.click()}><Upload size={16} className="inline"/> {busy && pct ? pct : 'Upload from gallery (video / photo, max 50 MB)'}</button>
      <p className="text-xs opacity-75">Or paste links from TikTok, YouTube Shorts, Instagram Reels or any https video / photo. Each link becomes one post.</p>
      <div className="studio-links">{links.map((l, i) => <div key={i} className="studio-link-row">
        <span>{i + 1}</span><input className="form-input" inputMode="url" placeholder="https://www.tiktok.com/@user/video/…" value={l} onChange={e => setLinks(ls => ls.map((x, j) => j === i ? e.target.value : x))}/>
        <button aria-label="Remove link" disabled={links.length <= 1} onClick={() => setLinks(ls => ls.filter((_, j) => j !== i))}><Trash2 size={16}/></button>
      </div>)}</div>
      <button className="studio-ghost" disabled={links.length >= maxLinks} onClick={() => setLinks(ls => [...ls, ''])}><Plus size={14} className="inline"/> Add link ({links.length}/{maxLinks})</button>
      <div className="studio-preview-mini"><span className="studio-mini-bg" style={{ filter: css }}/>{overlay && <DraggableText text={overlay} style={ts} editable onMove={(x, y) => setTs(s => ({ ...s, x, y }))}/>}<small>Drag text to position</small></div>
      <div className="flex flex-wrap gap-2">{musicBtn}<button className="studio-ghost" onClick={() => { if (!overlay) setOverlay('Your text'); setTextOpen(true); }}><Type size={14} className="inline"/> Text</button></div>
      <FilterRow value={filter} onPick={setFilter}/>
      <textarea className="form-input" rows={3} maxLength={300} placeholder="Describe your post…" value={caption} onChange={e => setCaption(e.target.value)}/>
      <div className="studio-tags">{TAGS.map(t => <button key={t} onClick={() => setCaption(c => (c.includes(t) ? c : `${c} ${t}`.trim()).slice(0, 300))}>{t}</button>)}</div>
      <label className="studio-switch"><input type="checkbox" checked={gifts} onChange={e => setGifts(e.target.checked)}/> Allow BIXP / BIXCOIN gifts</label>
      {err && <p className="studio-err">{err}</p>}
      <button className="bixtok-cta w-full" disabled={busy} onClick={publish}>{busy ? 'Posting…' : <><Check size={16} className="inline"/> Post links</>}</button>
    </div>}
    {textOpen && <TextEditor text={overlay} style={ts} onText={setOverlay} onStyle={setTs} onClose={() => setTextOpen(false)}/>}
    {musicOpen && <MusicSearch current={music} onPick={m => { setMusic(m); setMusicOpen(false); }} onClose={() => setMusicOpen(false)}/>}
  </div>;
}

function BeautySliders({ smooth, glow, bright, set }: { smooth: number; glow: number; bright: number; set: { setSmooth: (n: number) => void; setGlow: (n: number) => void; setBright: (n: number) => void } }) {
  const row = (label: string, v: number, f: (n: number) => void) => <label className="studio-beauty"><Sparkles size={13} className="studio-spark"/>{label}<input type="range" min={0} max={100} value={v} onChange={e => f(+e.target.value)}/><b>{v}</b></label>;
  return <div className="grid gap-1">{row('Smooth', smooth, set.setSmooth)}{row('Glow', glow, set.setGlow)}{row('Bright', bright, set.setBright)}</div>;
}

function FilterRow({ value, onPick }: { value: string; onPick: (k: string) => void }) {
  return <div className="studio-filters">{BIXTOK_FILTERS.map(f => <button key={f.key} className={value === f.key ? 'on' : ''} onClick={() => onPick(f.key)}>
    <i className={f.face ? 'face' : ''}>{f.face ? <Smile/> : f.key === 'none' ? <Wand2/> : f.key === 'glow' || f.key === 'bright' ? <Sun/> : <Sparkles/>}</i><small>{f.label}</small></button>)}</div>;
}

function TextEditor({ text, style, onText, onStyle, onClose }: { text: string; style: TextStyle; onText: (t: string) => void; onStyle: (s: TextStyle) => void; onClose: () => void }) {
  const set = (p: Partial<TextStyle>) => onStyle({ ...style, ...p });
  return <div className="studio-sheet" role="dialog" aria-label="Text style">
    <div className="studio-sheet-head"><b>Text</b><button onClick={onClose}><Check/></button></div>
    <input className="form-input" maxLength={60} autoFocus value={text} onChange={e => onText(e.target.value)} placeholder="Type your text"/>
    <div className="studio-colors">{COLORS.map(c => <button key={c} aria-label={c} className={style.color === c ? 'on' : ''} style={{ background: c }} onClick={() => set({ color: c })}/>)}</div>
    <div className="studio-fonts">{FONTS.map(([f, l]) => <button key={f} className={style.font === f ? 'on' : ''} style={{ fontFamily: f }} onClick={() => set({ font: f })}>{l}</button>)}</div>
    <label className="studio-beauty">Size<input type="range" min={14} max={56} value={style.size} onChange={e => set({ size: +e.target.value })}/><b>{style.size}</b></label>
    <label className="studio-beauty"><Bold size={13}/>Weight<input type="range" min={300} max={900} step={100} value={style.weight} onChange={e => set({ weight: +e.target.value })}/><b>{style.weight}</b></label>
    <div className="flex flex-wrap gap-2 text-xs">
      <button className={`studio-chip ${style.bg ? 'on' : ''}`} onClick={() => set({ bg: !style.bg })}>Highlight</button>
      <button className={`studio-chip ${style.shadow ? 'on' : ''}`} onClick={() => set({ shadow: !style.shadow })}>Shadow</button>
      <button className={`studio-chip ${style.italic ? 'on' : ''}`} onClick={() => set({ italic: !style.italic })}>Italic</button>
      <button className="studio-chip" onClick={() => set({ x: 50, y: 30 })}>Center</button>
      <button className="studio-chip" onClick={() => { onText(''); onClose(); }}>Remove</button>
    </div>
    <p className="text-[11px] opacity-70">Drag the text on screen to move it anywhere.</p>
  </div>;
}

function MusicSearch({ current, onPick, onClose }: { current: { title: string; url: string } | null; onPick: (m: { title: string; url: string } | null) => void; onClose: () => void }) {
  const [term, setTerm] = useState(''); const [q, setQ] = useState(''); const [cat, setCat] = useState('All'); const [playing, setPlaying] = useState('');
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => { audio.current?.pause(); }, []);
  const lib = useQuery({ queryKey: ['bixtok-sounds'], queryFn: async () => ((await supabase.from('bixtok_sounds').select('id,title,artist,category,audio_url').eq('enabled', true).order('sort')).data ?? []) as Sound[] });
  const online = useQuery({ queryKey: ['bixtok-music', q], enabled: q.length > 1, staleTime: 300_000, queryFn: async () => {
    const r = await fetch(`https://itunes.apple.com/search?media=music&entity=song&limit=25&term=${encodeURIComponent(q)}`);
    const j = await r.json() as { results: { trackId: number; trackName: string; artistName: string; previewUrl?: string; artworkUrl60?: string }[] };
    return j.results.filter(x => x.previewUrl?.startsWith('https://')).map(x => ({ id: String(x.trackId), title: x.trackName, artist: x.artistName, category: 'Online', audio_url: x.previewUrl!, cover: x.artworkUrl60 }));
  } });
  const cats = ['All', ...Array.from(new Set((lib.data ?? []).map(s => s.category)))];
  const list = q.length > 1 ? online.data ?? [] : (lib.data ?? []).filter(s => cat === 'All' || s.category === cat);
  const toggle = (s: Sound) => { if (playing === s.id) { audio.current?.pause(); setPlaying(''); return; } audio.current?.pause(); audio.current = new Audio(s.audio_url); audio.current.play().catch(() => {}); audio.current.onended = () => setPlaying(''); setPlaying(s.id); };
  return <div className="studio-sheet tall" role="dialog" aria-label="Add sound">
    <div className="studio-sheet-head"><b><Music2 size={16} className="inline"/> Sounds</b><button onClick={onClose}><X/></button></div>
    <form className="bixtok-input" onSubmit={e => { e.preventDefault(); setQ(term.trim()); }}><Search size={16}/><input value={term} onChange={e => setTerm(e.target.value)} placeholder="Search songs online, artists, viral sounds…"/><button>Go</button></form>
    <div className="studio-fonts">{['Viral TikTok','Pop Indonesia','Dangdut','Lo-fi','Hip Hop','K-Pop','EDM','Motivasi','Romantis','Jazz'].map(t => <button key={t} className={q === t ? 'on' : ''} onClick={() => { setTerm(t); setQ(t); }}>{t}</button>)}</div>
    {q.length <= 1 && <div className="studio-fonts">{cats.map(c => <button key={c} className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>{c}</button>)}</div>}
    {current && <button className="studio-chip on" onClick={() => onPick(null)}>Remove “{current.title}”</button>}
    <div className="studio-sounds">
      {online.isFetching && <p className="text-xs opacity-70">Searching…</p>}
      {list.map(s => <div key={s.id} className="studio-sound">
        <button aria-label="Preview" className={`studio-disc ${playing === s.id ? 'spin' : ''}`} onClick={() => toggle(s)} style={s.cover ? { backgroundImage: `url(${s.cover})` } : undefined}>{playing === s.id ? <Pause size={14}/> : <Play size={14}/>}</button>
        <div className="min-w-0 flex-1"><b className="block truncate">{s.title}</b><small className="opacity-70">{s.artist} · {s.category}</small>{playing === s.id && <span className="studio-wave"><i/><i/><i/><i/><i/></span>}</div>
        <button className="studio-chip on" onClick={() => { audio.current?.pause(); onPick({ title: `${s.title} — ${s.artist}`, url: s.audio_url }); }}>Use</button>
      </div>)}
      {!online.isFetching && !list.length && <p className="text-xs opacity-70">No sounds found.</p>}
    </div>
    <p className="text-[10px] opacity-60">Online results are 30-second previews from a public music catalog.</p>
  </div>;
}
