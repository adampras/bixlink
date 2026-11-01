import { lazy, Suspense, useEffect, useRef, useState, type PointerEvent as RPE } from 'react';
import { Maximize2, Volume2, X } from 'lucide-react';
import { useRouter } from '@tanstack/react-router';
import { bixtokMini, useBixtokMini } from '@/lib/bixtok-mini';

// The LIVE room is code-split. After an app update the old file URL can vanish,
// which used to throw and blank the whole screen. Retry, then show a reload card.
function LiveRoomLoadFailed({ onClose }: { onClose: () => void }) {
  return <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-background p-6 text-center text-foreground">
    <p className="text-sm">LIVE needs a quick refresh to load the latest version.</p>
    <div className="flex gap-2">
      <button type="button" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" onClick={() => window.location.reload()}>Reload</button>
      <button type="button" className="rounded-full border border-border px-4 py-2 text-sm" onClick={onClose}>Close</button>
    </div>
  </div>;
}
const BixtokLiveRoom = lazy(async () => {
  for (let i = 0; i < 3; i++) {
    try {
      const m = await import('@/components/BixtokLiveRoom');
      return { default: m.BixtokLiveRoom };
    } catch {
      await new Promise(r => setTimeout(r, 600 * (i + 1)));
    }
  }
  return { default: ((p: { onClose: () => void }) => <LiveRoomLoadFailed onClose={p.onClose}/>) as unknown as typeof import('@/components/BixtokLiveRoom').BixtokLiveRoom };
});

// Drag the mini window anywhere; drop it past a screen edge to tuck it away (a tab stays visible).
function useDrag() {
  const [pos, setPosRaw] = useState<{ x: number; y: number } | null>(null);
  const raf = useRef(0);
  const setPos: typeof setPosRaw = (v) => { cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(() => setPosRaw(v)); };
  const [scale, setScale] = useState(1);
  const pinch = useRef<{ d: number; s: number } | null>(null);
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const [tucked, setTucked] = useState<'l' | 'r' | null>(null);
  const st = useRef<{ sx: number; sy: number; ox: number; oy: number; lx: number; ly: number; moved: boolean } | null>(null);
  const onPointerDown = (e: RPE<HTMLDivElement>) => {
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.current.size === 2) { const [a, b] = [...pts.current.values()] as { x: number; y: number }[]; pinch.current = { d: Math.hypot(a!.x - b!.x, a!.y - b!.y), s: scale }; st.current = null; return; }
    const r = e.currentTarget.getBoundingClientRect();
    st.current = { sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top, lx: r.left, ly: r.top, moved: false };
  };
  const onPointerMove = (e: RPE<HTMLDivElement>) => {
    if (pts.current.has(e.pointerId)) pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pts.current.size === 2) { const [a, b] = [...pts.current.values()] as { x: number; y: number }[]; setScale(Math.min(1.8, Math.max(0.6, pinch.current.s * Math.hypot(a!.x - b!.x, a!.y - b!.y) / pinch.current.d))); return; }
    const s = st.current; if (!s) return;
    const dx = e.clientX - s.sx, dy = e.clientY - s.sy;
    if (!s.moved && Math.hypot(dx, dy) < 8) return;
    const el = e.currentTarget;
    if (!s.moved) { s.moved = true; el.setPointerCapture(e.pointerId); el.classList.add('bxl-dragging'); setTucked(null); }
    const w = el.offsetWidth, h = el.offsetHeight;
    const x = Math.min(window.innerWidth - w * 0.3, Math.max(-w * 0.7, s.ox + dx)), y = Math.min(window.innerHeight - h, Math.max(0, s.oy + dy));
    s.lx = x; s.ly = y;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => { el.style.transform = `translate3d(${x - s.ox}px, ${y - s.oy}px, 0)`; });
  };
  const onPointerUp = (e: RPE<HTMLDivElement>) => {
    pts.current.delete(e.pointerId); if (pts.current.size < 2) pinch.current = null;
    const s = st.current; st.current = null; if (!s?.moved) return;
    const el = e.currentTarget; cancelAnimationFrame(raf.current);
    const r = el.getBoundingClientRect();
    el.classList.remove('bxl-dragging'); el.style.transform = '';
    setPosRaw({ x: s.lx, y: s.ly });
    const edge = r.left < -r.width * 0.25 ? 'l' : r.right > window.innerWidth + r.width * 0.25 ? 'r' : null;
    if (edge) { setTucked(edge); try { navigator.vibrate?.([18, 40, 18]); } catch { /* unsupported */ } }
    e.preventDefault();
  };
  const onClickCapture = (e: React.MouseEvent) => { if (tucked) { e.stopPropagation(); e.preventDefault(); setTucked(null); setPos(p => p && { ...p, x: tucked === 'l' ? 12 : window.innerWidth - (e.currentTarget as HTMLElement).offsetWidth - 12 }); } };
  const sz = { width: `min(${Math.round(52 * scale)}vw, ${Math.round(240 * scale)}px)`, maxWidth: 'none', ['--s' as string]: String(Math.min(0.52 * scale, (240 * scale) / (typeof window !== 'undefined' ? window.innerWidth : 400)).toFixed(3)) } as React.CSSProperties;
  const style = tucked ? { top: pos?.y, bottom: 'auto', left: tucked === 'l' ? 0 : 'auto', right: tucked === 'r' ? 0 : 'auto', width: 28, touchAction: 'none' as const }
    : pos ? { ...sz, left: pos.x, top: pos.y, right: 'auto', bottom: 'auto', touchAction: 'none' as const } : { ...sz, touchAction: 'none' as const };
  const resize = (corner: 'tl' | 'tr' | 'bl' | 'br') => (e: RPE<HTMLSpanElement>) => {
    e.stopPropagation(); e.preventDefault();
    const box = (e.currentTarget.parentElement as HTMLElement); const r = box.getBoundingClientRect();
    const sx = e.clientX, s0 = scale, w0 = r.width, h0 = r.height;
    const tgt = e.currentTarget; tgt.setPointerCapture(e.pointerId); box.classList.add('bxl-resizing');
    let raf = 0;
    const move = (ev: PointerEvent) => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => {
      const dx = (ev.clientX - sx) * (corner === 'tl' || corner === 'bl' ? -1 : 1);
      const ns = Math.min(1.8, Math.max(0.6, s0 * (w0 + dx) / w0)); const nw = w0 * ns / s0, nh = h0 * ns / s0;
      setScale(ns);
      setPos({ x: corner === 'tl' || corner === 'bl' ? r.right - nw : r.left, y: corner === 'tl' || corner === 'tr' ? r.bottom - nh : r.top });
    }); };
    const up = () => { box.classList.remove('bxl-resizing'); tgt.removeEventListener('pointermove', move); tgt.removeEventListener('pointerup', up); tgt.removeEventListener('pointercancel', up); try { navigator.vibrate?.(8); } catch { /* */ } };
    tgt.addEventListener('pointermove', move); tgt.addEventListener('pointerup', up); tgt.addEventListener('pointercancel', up);
  };
  const handles = tucked ? null : (['tl', 'tr', 'bl', 'br'] as const).map(c => <span key={c} className={`bxl-grip bxl-grip-${c}`} onPointerDown={resize(c)} aria-hidden/>);
  return { tucked, handles, bind: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onClickCapture, style } };
}

// Mini player keeps the speaker on; falls back to muted only if the browser blocks sound, then unmutes on first tap.
function SoundVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { const el = ref.current; if (!el) return; el.muted = false; el.volume = 1;
    el.play().catch(() => { el.muted = true; void el.play().catch(() => {}); const on = () => { el.muted = false; void el.play().catch(() => {}); }; window.addEventListener('pointerdown', on, { once: true }); });
  }, [src]);
  return <video ref={ref} src={src} autoPlay loop playsInline className="h-full w-full object-contain"/>;
}

export function BixtokMiniHost() {
  const { room, mini, feed } = useBixtokMini();
  const router = useRouter();
  const drag = useDrag();
  const [nonce, setNonce] = useState(0);
  if (!room && feed) return <div className={`bxl-mini bxl-mini-feed${drag.tucked ? ' bxl-tucked' : ''}`} {...drag.bind}>
    {feed.kind === 'iframe' ? <iframe key={`${feed.src}-${nonce}`} src={feed.src.replace('mute=1', 'mute=0')} title={feed.title} allow="autoplay; encrypted-media" className="h-full w-full border-0"/> : feed.kind === 'video' ? <SoundVideo key={nonce} src={feed.src}/> : <img src={feed.src} alt={feed.title} className="h-full w-full object-contain"/>}
    {feed.title && <p className="bxl-mini-cap">{feed.title}</p>}
    {drag.handles}
    <div className="bxl-mini-ctl"><span className="bxl-mini-badge feed">BIXTOK</span>
      {feed.kind !== 'img' && <button type="button" aria-label="Sound on" onClick={() => setNonce(n => n + 1)}><Volume2 size={14}/></button>}
      <button type="button" aria-label="Open BIXTOK" onClick={() => { if (feed.id) bixtokMini.rememberId(feed.id); bixtokMini.setFeed(null); void router.navigate({ to: '/bixtok' }); }}><Maximize2 size={14}/></button>
      <button type="button" aria-label="Close BIXTOK mini" onClick={() => bixtokMini.setFeed(null)}><X size={14}/></button></div>
  </div>;
  if (!room) return null;
  const minimize = () => {
    bixtokMini.setMini(true);
    if (router.state.location.pathname === '/bixtok' && window.history.length > 1) window.history.back();
  };
  return <div className={mini ? `bxl-mini${drag.tucked ? ' bxl-tucked' : ''}` : 'bxl-full'} {...(mini ? drag.bind : {})}>
    <div className={mini ? 'bxl-mini-inner' : undefined}>
      <Suspense fallback={null}>
        <BixtokLiveRoom live={room.live} me={room.me} cfg={room.cfg} following={room.following} onFollow={room.onFollow} onGift={room.onGift} onClose={() => bixtokMini.close()} onMinimize={minimize}/>
      </Suspense>
    </div>
    {mini && drag.handles}
    {mini && <div className="bxl-mini-ctl">
      <button type="button" className="bxl-mini-hit" aria-label="Expand LIVE" onClick={() => bixtokMini.setMini(false)}/>
      <span className="bxl-mini-badge">● LIVE</span>
      <button type="button" aria-label="Expand LIVE" onClick={() => bixtokMini.setMini(false)}><Maximize2 size={14}/></button>
      <button type="button" aria-label="Close LIVE" onClick={() => { bixtokMini.setMini(false); setTimeout(() => (document.querySelector('.bxl-full [aria-label="Close"]') as HTMLButtonElement | null)?.click(), 50); }}><X size={14}/></button>
    </div>}
  </div>;
}
