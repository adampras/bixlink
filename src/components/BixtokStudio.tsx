import { useEffect, useRef, useState } from 'react';
import { Camera, Image as ImageIcon, RefreshCw, Sparkles, Timer, Type, X, Check, Gauge } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const BIXTOK_FILTERS: { key: string; label: string; css: string }[] = [
  { key: 'none', label: 'Original', css: 'none' },
  { key: 'beauty', label: 'Beauty', css: 'brightness(1.08) contrast(0.94) saturate(1.06) blur(0.4px)' },
  { key: 'glow', label: 'Studio Glow', css: 'brightness(1.16) contrast(1.02) saturate(1.1)' },
  { key: 'warm', label: 'Rosy', css: 'sepia(0.18) saturate(1.25) brightness(1.06) hue-rotate(-8deg)' },
  { key: 'gold', label: 'Golden Lux', css: 'sepia(0.35) saturate(1.4) brightness(1.04) contrast(1.05)' },
  { key: 'matcha', label: 'Matcha Cyber', css: 'hue-rotate(28deg) saturate(1.35) contrast(1.1)' },
  { key: 'cool', label: 'Ice', css: 'hue-rotate(-18deg) saturate(1.1) brightness(1.05)' },
  { key: 'vivid', label: 'Vivid', css: 'saturate(1.6) contrast(1.12)' },
  { key: 'noir', label: 'Noir Titanium', css: 'grayscale(1) contrast(1.25) brightness(1.02)' },
];
export const filterCss = (k?: string | null) => BIXTOK_FILTERS.find(f => f.key === k)?.css ?? 'none';

const DURATIONS = [15, 60, 180];
const SPEEDS = [0.5, 1, 2];
const TAGS = ['#BIXLINK', '#BIXCOIN', '#Staking', '#Web3', '#FinancialFreedom'];

type Media = { file: Blob; kind: 'video' | 'photo'; url: string; ext: string };

export function BixtokStudio({ userId, onClose, onDone }: { userId: string; onClose: () => void; onDone: (msg: string) => void }) {
  const [step, setStep] = useState<'capture' | 'edit'>('capture');
  const [media, setMedia] = useState<Media | null>(null);
  const [filter, setFilter] = useState('beauty');
  const [beauty, setBeauty] = useState(50);
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [dur, setDur] = useState(15);
  const [speed, setSpeed] = useState(1);
  const [timer, setTimer] = useState(0);
  const [count, setCount] = useState(0);
  const [rec, setRec] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [camErr, setCamErr] = useState('');
  const [caption, setCaption] = useState('');
  const [overlay, setOverlay] = useState('');
  const [gifts, setGifts] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const vid = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const css = (() => { const base = filterCss(filter); const b = beauty / 100; const soft = `brightness(${1 + b * 0.1}) blur(${(b * 0.6).toFixed(2)}px)`; return base === 'none' ? (b > 0 ? soft : 'none') : `${base} ${soft}`; })();

  useEffect(() => {
    if (step !== 'capture') return undefined;
    let off = false;
    (async () => {
      try {
        stream.current?.getTracks().forEach(t => t.stop());
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 720 }, height: { ideal: 1280 } }, audio: true });
        if (off) { s.getTracks().forEach(t => t.stop()); return; }
        stream.current = s; setCamErr('');
        if (vid.current) { vid.current.srcObject = s; vid.current.play().catch(() => {}); }
      } catch { setCamErr('Camera unavailable. You can still upload from your gallery.'); }
    })();
    return () => { off = true; stream.current?.getTracks().forEach(t => t.stop()); stream.current = null; };
  }, [facing, step]);

  useEffect(() => {
    if (!rec) return undefined;
    const t = setInterval(() => setElapsed(e => { if (e + 1 >= dur) stopRec(); return e + 1; }), 1000);
    return () => clearInterval(t);
  }, [rec, dur]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bake the filter into the recording by drawing the camera through a filtered canvas.
  const startRec = () => {
    const v = vid.current; const s = stream.current; if (!v || !s) return;
    const c = document.createElement('canvas'); c.width = v.videoWidth || 720; c.height = v.videoHeight || 1280;
    const ctx = c.getContext('2d')!; let raf = 0;
    const draw = () => { ctx.filter = css; if (facing === 'user') { ctx.setTransform(-1, 0, 0, 1, c.width, 0); } ctx.drawImage(v, 0, 0, c.width, c.height); ctx.setTransform(1, 0, 0, 1, 0, 0); if (overlay) { ctx.filter = 'none'; ctx.font = `bold ${Math.round(c.width / 14)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 6; ctx.strokeText(overlay, c.width / 2, c.height * 0.3); ctx.fillText(overlay, c.width / 2, c.height * 0.3); } raf = requestAnimationFrame(draw); };
    draw();
    const fps = Math.max(10, Math.round(30 / speed));
    const out = c.captureStream(fps);
    if (speed === 1) s.getAudioTracks().forEach(t => out.addTrack(t));
    const mime = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'].find(m => MediaRecorder.isTypeSupported(m)) ?? '';
    const r = new MediaRecorder(out, mime ? { mimeType: mime } : undefined); const chunks: Blob[] = [];
    r.ondataavailable = e => e.data.size && chunks.push(e.data);
    r.onstop = () => { cancelAnimationFrame(raf); const type = r.mimeType || 'video/webm'; const b = new Blob(chunks, { type }); setMedia({ file: b, kind: 'video', url: URL.createObjectURL(b), ext: type.includes('mp4') ? 'mp4' : 'webm' }); setFilter('none'); setBeauty(0); setStep('edit'); };
    recorder.current = r; r.start(500); setElapsed(0); setRec(true);
  };
  function stopRec() { setRec(false); if (recorder.current?.state === 'recording') recorder.current.stop(); }
  const shoot = () => {
    if (rec) return stopRec();
    if (!timer) return startRec();
    setCount(timer); let n = timer;
    const t = setInterval(() => { n -= 1; setCount(n); if (n <= 0) { clearInterval(t); startRec(); } }, 1000);
  };
  const snap = () => {
    const v = vid.current; if (!v) return;
    const c = document.createElement('canvas'); c.width = v.videoWidth || 720; c.height = v.videoHeight || 1280;
    const ctx = c.getContext('2d')!; ctx.filter = css; if (facing === 'user') ctx.setTransform(-1, 0, 0, 1, c.width, 0); ctx.drawImage(v, 0, 0, c.width, c.height);
    c.toBlob(b => { if (!b) return; setMedia({ file: b, kind: 'photo', url: URL.createObjectURL(b), ext: 'jpg' }); setFilter('none'); setBeauty(0); setStep('edit'); }, 'image/jpeg', 0.9);
  };
  const pick = (f?: File) => {
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) { setErr('File is larger than 50 MB.'); return; }
    const kind = f.type.startsWith('image/') ? 'photo' : f.type.startsWith('video/') ? 'video' : null;
    if (!kind) { setErr('Choose a photo or video.'); return; }
    setMedia({ file: f, kind, url: URL.createObjectURL(f), ext: (f.name.split('.').pop() || (kind === 'photo' ? 'jpg' : 'mp4')).toLowerCase().slice(0, 5) });
    setStep('edit');
  };

  const publish = async () => {
    if (!media) return; setBusy(true); setErr('');
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${media.ext}`;
    const up = await supabase.storage.from('bixtok-media').upload(path, media.file, { contentType: media.file.type || undefined });
    if (up.error) { setBusy(false); setErr(up.error.message); return; }
    const { error } = await supabase.rpc('bixtok_publish' as never, { p_path: path, p_kind: media.kind, p_caption: caption, p_filter: filter, p_overlay: media.kind === 'video' && step === 'edit' ? overlay : overlay, p_allow_gifts: gifts } as never);
    setBusy(false);
    if (error) { await supabase.storage.from('bixtok-media').remove([path]); setErr(error.message); return; }
    onDone('Posted to BIXTOK');
  };

  return <div className="bixtok-studio" role="dialog" aria-label="Create post">
    {step === 'capture' ? <>
      <div className="studio-stage">
        {camErr ? <p className="studio-camerr">{camErr}</p> : <video ref={vid} muted playsInline className={facing === 'user' ? 'mirror' : ''} style={{ filter: css }}/>}
        {overlay && <span className="studio-overlay">{overlay}</span>}
        {count > 0 && <span className="studio-count">{count}</span>}
        {rec && <span className="studio-rec">● {elapsed}s / {dur}s</span>}
      </div>
      <header className="studio-top"><button aria-label="Close" onClick={onClose}><X/></button></header>
      <aside className="studio-tools">
        <button onClick={() => setFacing(f => f === 'user' ? 'environment' : 'user')}><RefreshCw/><small>Flip</small></button>
        <button onClick={() => setSpeed(s => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length]!)}><Gauge/><small>{speed}×</small></button>
        <button onClick={() => setTimer(t => t === 0 ? 3 : t === 3 ? 10 : 0)}><Timer/><small>{timer ? `${timer}s` : 'Timer'}</small></button>
        <button onClick={() => { const t = prompt('Text on video', overlay); if (t !== null) setOverlay(t.slice(0, 40)); }}><Type/><small>Text</small></button>
      </aside>
      <div className="studio-bottom">
        <label className="studio-beauty"><Sparkles size={14}/> Beauty <input type="range" min={0} max={100} value={beauty} onChange={e => setBeauty(+e.target.value)}/> <b>{beauty}</b></label>
        <div className="studio-filters">{BIXTOK_FILTERS.map(f => <button key={f.key} className={filter === f.key ? 'on' : ''} onClick={() => setFilter(f.key)}><i style={{ filter: f.css }}/><small>{f.label}</small></button>)}</div>
        <div className="studio-durs">{DURATIONS.map(d => <button key={d} className={dur === d ? 'on' : ''} onClick={() => !rec && setDur(d)}>{d < 60 ? `${d}s` : `${d / 60}m`}</button>)}</div>
        <div className="studio-shutter">
          <button className="studio-side" onClick={() => fileInput.current?.click()}><ImageIcon/><small>Upload</small></button>
          <button aria-label={rec ? 'Stop recording' : 'Record'} className={`studio-rec-btn ${rec ? 'on' : ''}`} disabled={!!camErr} onClick={shoot}/>
          <button className="studio-side" disabled={!!camErr || rec} onClick={snap}><Camera/><small>Photo</small></button>
        </div>
        <input ref={fileInput} type="file" accept="video/*,image/*" hidden onChange={e => pick(e.target.files?.[0])}/>
        {err && <p className="studio-err">{err}</p>}
      </div>
    </> : media && <div className="studio-edit">
      <header className="studio-top"><button aria-label="Back" onClick={() => { setMedia(null); setStep('capture'); }}><X/></button><b>Post</b><span/></header>
      <div className="studio-preview">
        {media.kind === 'video' ? <video src={media.url} autoPlay loop muted playsInline style={{ filter: filterCss(filter) }}/> : <img src={media.url} alt="" style={{ filter: filterCss(filter) }}/>}
        {overlay && <span className="studio-overlay">{overlay}</span>}
      </div>
      <div className="studio-filters">{BIXTOK_FILTERS.map(f => <button key={f.key} className={filter === f.key ? 'on' : ''} onClick={() => setFilter(f.key)}><i style={{ filter: f.css }}/><small>{f.label}</small></button>)}</div>
      <input className="form-input" maxLength={40} placeholder="Text on post (optional)" value={overlay} onChange={e => setOverlay(e.target.value)}/>
      <textarea className="form-input" rows={3} maxLength={300} placeholder="Describe your post…" value={caption} onChange={e => setCaption(e.target.value)}/>
      <div className="studio-tags">{TAGS.map(t => <button key={t} onClick={() => setCaption(c => (c.includes(t) ? c : `${c} ${t}`.trim()).slice(0, 300))}>{t}</button>)}</div>
      <label className="studio-switch"><input type="checkbox" checked={gifts} onChange={e => setGifts(e.target.checked)}/> Allow BIXP / BIXCOIN gifts</label>
      {err && <p className="studio-err">{err}</p>}
      <button className="bixtok-cta w-full" disabled={busy} onClick={publish}>{busy ? 'Posting…' : <><Check size={16} className="inline"/> Post</>}</button>
    </div>}
  </div>;
}
