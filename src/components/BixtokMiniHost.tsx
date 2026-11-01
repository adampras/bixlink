import { lazy, Suspense, useEffect, useRef, useState, type PointerEvent as RPE } from 'react';
import { Maximize2, X, ZoomIn, ZoomOut } from 'lucide-react';
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
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [scale, setScale] = useState(1);
  const pinch = useRef<{ d: number; s: number } | null>(null);
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const [tucked, setTucked] = useState<'l' | 'r' | null>(null);
  const st = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  const onPointerDown = (e: RPE<HTMLDivElement>) => {
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.current.size === 2) { const [a, b] = [...pts.current.values()]; pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), s: scale }; st.current = null; return; }
    const r = e.currentTarget.getBoundingClientRect();
    st.current = { sx: e.clientX, sy: e.clientY, ox: r.left, oy: r.top, moved: false };
  };
  const onPointerMove = (e: RPE<HTMLDivElement>) => {
    if (pts.current.has(e.pointerId)) pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pts.current.size === 2) { const [a, b] = [...pts.current.values()]; setScale(Math.min(1.8, Math.max(0.6, pinch.current.s * Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.d))); return; }
    const s = st.current; if (!s) return;
    const dx = e.clientX - s.sx, dy = e.clientY - s.sy;
    if (!s.moved && Math.hypot(dx, dy) < 8) return;
    if (!s.moved) { s.moved = true; e.currentTarget.setPointerCapture(e.pointerId); setTucked(null); }
    const w = e.currentTarget.offsetWidth, h = e.currentTarget.offsetHeight;
    setPos({ x: Math.min(window.innerWidth - w * 0.3, Math.max(-w * 0.7, s.ox + dx)), y: Math.min(window.innerHeight - h, Math.max(0, s.oy + dy)) });
  };
  const onPointerUp = (e: RPE<HTMLDivElement>) => {
    pts.current.delete(e.pointerId); if (pts.current.size < 2) pinch.current = null;
    const s = st.current; st.current = null; if (!s?.moved) return;
    const r = e.currentTarget.getBoundingClientRect();
    const edge = r.left < -r.width * 0.25 ? 'l' : r.right > window.innerWidth + r.width * 0.25 ? 'r' : null;
    if (edge) { setTucked(edge); try { navigator.vibrate?.([18, 40, 18]); } catch { /* unsupported */ } }
    e.preventDefault();
  };
  const onClickCapture = (e: React.MouseEvent) => { if (tucked) { e.stopPropagation(); e.preventDefault(); setTucked(null); setPos(p => p && { ...p, x: tucked === 'l' ? 12 : window.innerWidth - (e.currentTarget as HTMLElement).offsetWidth - 12 }); } };
  const sz = { width: `min(${Math.round(52 * scale)}vw, ${Math.round(240 * scale)}px)`, maxWidth: 'none', ['--s' as string]: String(Math.min(0.52 * scale, (240 * scale) / (typeof window !== 'undefined' ? window.innerWidth : 400)).toFixed(3)) } as React.CSSProperties;
  const style = tucked ? { top: pos?.y, bottom: 'auto', left: tucked === 'l' ? 0 : 'auto', right: tucked === 'r' ? 0 : 'auto', width: 28, touchAction: 'none' as const }
    : pos ? { ...sz, left: pos.x, top: pos.y, right: 'auto', bottom: 'auto', touchAction: 'none' as const } : { ...sz, touchAction: 'none' as const };
  const zoom = (d: number) => setScale(v => Math.min(1.8, Math.max(0.6, +(v + d).toFixed(2))));
  return { tucked, zoom, bind: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onClickCapture, style } };
}

// Mini player keeps the speaker on; falls back to muted only if the browser blocks sound, then unmutes on first tap.
function SoundVideo({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { const el = ref.current; if (!el) return; el.muted = false; el.volume = 1;
    el.play().catch(() => { el.muted = true; void el.play().catch(() => {}); const on = () => { el.muted = false; void el.play().catch(() => {}); }; window.addEventListener('pointerdown', on, { once: true }); });
  }, [src]);
  return <video ref={ref} src={src} autoPlay loop playsInline className="h-full w-full object-cover"/>;
}

export function BixtokMiniHost() {
  const { room, mini, feed } = useBixtokMini();
  const router = useRouter();
  const drag = useDrag();
  if (!room && feed && router.state.location.pathname !== '/bixtok') return <div className={`bxl-mini bxl-mini-feed${drag.tucked ? ' bxl-tucked' : ''}`} {...drag.bind}>
    {feed.kind === 'iframe' ? <iframe src={feed.src.replace('mute=1', 'mute=0')} title={feed.title} allow="autoplay; encrypted-media" className="h-full w-full border-0"/> : feed.kind === 'video' ? <SoundVideo src={feed.src}/> : <img src={feed.src} alt={feed.title} className="h-full w-full object-cover"/>}
    <div className="bxl-mini-ctl"><span className="bxl-mini-badge feed">BIXTOK</span>
      <button type="button" aria-label="Smaller" onClick={() => drag.zoom(-0.2)}><ZoomOut size={14}/></button>
      <button type="button" aria-label="Bigger" onClick={() => drag.zoom(0.2)}><ZoomIn size={14}/></button>
      <button type="button" aria-label="Open BIXTOK" onClick={() => { bixtokMini.setFeed(null); void router.navigate({ to: '/bixtok' }); }}><Maximize2 size={14}/></button>
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
    {mini && <div className="bxl-mini-ctl">
      <button type="button" className="bxl-mini-hit" aria-label="Expand LIVE" onClick={() => bixtokMini.setMini(false)}/>
      <span className="bxl-mini-badge">● LIVE</span>
      <button type="button" aria-label="Smaller" onClick={() => drag.zoom(-0.2)}><ZoomOut size={14}/></button>
      <button type="button" aria-label="Bigger" onClick={() => drag.zoom(0.2)}><ZoomIn size={14}/></button>
      <button type="button" aria-label="Expand LIVE" onClick={() => bixtokMini.setMini(false)}><Maximize2 size={14}/></button>
      <button type="button" aria-label="Close LIVE" onClick={() => { bixtokMini.setMini(false); setTimeout(() => (document.querySelector('.bxl-full [aria-label="Close"]') as HTMLButtonElement | null)?.click(), 50); }}><X size={14}/></button>
    </div>}
  </div>;
}
