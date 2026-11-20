import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

const TRIGGER = 120;
const DEADZONE = 70;
const EDGE = 140; // touch must start near the top of the screen
const SKIP = /^\/(bixtok|call|bixgo|care|game|exchange|trade|p2p)(\/|$)/;

/** Pull down from the very top of the page to reload the newest published version (APK + PWA). */
export function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const start = useRef<number | null>(null);
  const startX = useRef(0);
  const dist = useRef(0);
  useEffect(() => {
    const blocked = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return !!el?.closest?.('[role="dialog"],.bixcall-screen,input,textarea,[data-no-ptr],.leaflet-container');
    };
    const inScroller = (t: EventTarget | null) => {
      for (let el = t as HTMLElement | null; el && el !== document.body; el = el.parentElement) {
        const oy = getComputedStyle(el).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 2) return true;
      }
      return false;
    };
    const down = (e: TouchEvent) => {
      const t0 = e.touches[0];
      if (!t0 || window.scrollY > 0 || e.touches.length !== 1 || t0.clientY > EDGE || SKIP.test(window.location.pathname) || blocked(e.target) || inScroller(e.target)) { start.current = null; return; }
      start.current = t0.clientY; startX.current = t0.clientX; dist.current = 0;
    };
    const move = (e: TouchEvent) => {
      if (start.current === null) return;
      const d = e.touches[0]!.clientY - start.current;
      if (Math.abs(e.touches[0]!.clientX - startX.current) > d * 0.6 && Math.abs(e.touches[0]!.clientX - startX.current) > 12) { start.current = null; dist.current = 0; setPull(0); return; }
      if (d <= 0 || window.scrollY > 0) { dist.current = 0; setPull(0); return; }
      if (d < DEADZONE) { dist.current = 0; setPull(0); return; }
      const x = d - DEADZONE; const prev = dist.current;
      dist.current = Math.min(140, 170 * (1 - Math.exp(-x / 220)));
      if (prev < TRIGGER && dist.current >= TRIGGER) { try { navigator.vibrate?.(10); } catch { /* unsupported */ } }
      setPull(dist.current);
    };
    const up = () => {
      if (start.current === null) return;
      start.current = null;
      if (dist.current >= TRIGGER) {
        setBusy(true);
        void (async () => {
          try { const keys = await caches?.keys?.(); await Promise.all((keys ?? []).map(k => caches.delete(k))); } catch { /* optional */ }
          window.location.reload();
        })();
      } else setPull(0);
      dist.current = 0;
    };
    window.addEventListener('touchstart', down, { passive: true });
    window.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('touchend', up);
    return () => { window.removeEventListener('touchstart', down); window.removeEventListener('touchmove', move); window.removeEventListener('touchend', up); };
  }, []);
  if (!pull && !busy) return null;
  const ready = pull >= TRIGGER || busy;
  return <div aria-live="polite" className="ptr-indicator" style={{ transform: `translate(-50%, ${busy ? 70 : pull}px)` }}>
    <RefreshCw size={18} className={busy ? 'animate-spin' : ''} style={{ transform: busy ? undefined : `rotate(${pull * 3}deg)` }} aria-hidden />
    <span>{busy ? 'Memperbarui…' : ready ? 'Lepas untuk perbarui' : 'Tarik untuk perbarui'}</span>
  </div>;
}
