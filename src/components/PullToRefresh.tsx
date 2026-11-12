import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

const TRIGGER = 80;

/** Pull down from the very top of the page to reload the newest published version (APK + PWA). */
export function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const start = useRef<number | null>(null);
  const dist = useRef(0);
  useEffect(() => {
    const blocked = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      return !!el?.closest?.('[role="dialog"],.bixcall-screen,input,textarea,[data-no-ptr],.leaflet-container');
    };
    const down = (e: TouchEvent) => {
      if (window.scrollY > 0 || e.touches.length !== 1 || blocked(e.target)) { start.current = null; return; }
      start.current = e.touches[0]!.clientY; dist.current = 0;
    };
    const move = (e: TouchEvent) => {
      if (start.current === null) return;
      const d = e.touches[0]!.clientY - start.current;
      if (d <= 0 || window.scrollY > 0) { dist.current = 0; setPull(0); return; }
      dist.current = Math.min(130, d * 0.5); setPull(dist.current);
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
