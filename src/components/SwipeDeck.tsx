import { Children, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/** Phone-widget style swipe deck: one card per page with snap + dots. Desktop shows a grid unless `alwaysSwipe`. */
export function SwipeDeck({ children, label, desktopCols = 'md:grid-cols-3', autoPlayMs, alwaysSwipe = false }: { children: ReactNode; label: string; desktopCols?: string; autoPlayMs?: number; alwaysSwipe?: boolean }) {
  const items = Children.toArray(children);
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const paused = useRef(false);
  const onScroll = () => {
    const el = ref.current; if (!el) return;
    const first = el.children[0] as HTMLElement | undefined;
    const step = first ? first.offsetWidth + 12 : el.clientWidth * 0.86;
    setActive(Math.min(items.length - 1, Math.round(el.scrollLeft / Math.max(step, 1))));
  };
  const go = (i: number) => {
    const el = ref.current; if (!el) return;
    const n = (i + items.length) % items.length;
    const child = el.children[n] as HTMLElement | undefined;
    if (child) el.scrollTo({ left: child.offsetLeft - (el.clientWidth - child.offsetWidth) / 2, behavior: 'smooth' });
  };
  useEffect(() => {
    if (!autoPlayMs || items.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = window.setInterval(() => {
      const el = ref.current;
      if (!el || paused.current || document.hidden || el.scrollWidth <= el.clientWidth + 4) return;
      go(active + 1);
    }, autoPlayMs);
    return () => window.clearInterval(t);
  });
  const grid = alwaysSwipe ? '' : `md:grid ${desktopCols} md:gap-3 md:overflow-visible`;
  return <div className={`swipe-deck${alwaysSwipe ? ' swipe-deck-always' : ''}`} aria-roledescription="carousel" aria-label={label}
    onPointerEnter={() => { paused.current = true; }} onPointerLeave={() => { paused.current = false; }}
    onTouchStart={() => { paused.current = true; }} onTouchEnd={() => { window.setTimeout(() => { paused.current = false; }, 4000); }}>
    <div ref={ref} onScroll={onScroll} className={`swipe-deck-track ${grid}`}>
      {items.map((c, i) => <div key={i} className={`swipe-deck-slide ${i === active ? 'is-active' : ''}`} aria-label={`${i + 1} / ${items.length}`}>{c}</div>)}
    </div>
    <div className={`mt-3 flex items-center justify-center gap-2 ${alwaysSwipe ? '' : 'md:hidden'}`}>
      {alwaysSwipe && <button type="button" aria-label="Previous" onClick={() => go(active - 1)} className="swipe-deck-arrow"><ChevronLeft size={16}/></button>}
      <div className="flex items-center gap-1.5">{items.map((_, i) => <button key={i} type="button" aria-label={`Go to card ${i + 1}`} onClick={() => go(i)} className={`swipe-deck-dot ${i === active ? 'is-active' : ''}`}/>)}</div>
      {alwaysSwipe && <button type="button" aria-label="Next" onClick={() => go(active + 1)} className="swipe-deck-arrow"><ChevronRight size={16}/></button>}
    </div>
  </div>;
}

/** Global-presence visual: holographic 3D globe with nodes and orbit rings. Decorative only. */
export function GlobalOrbit({ caption }: { caption: string }) {
  return <div className="global-orbit" aria-hidden>
    <div className="global-orbit-halo"/>
    <div className="global-orbit-globe">
      <span className="gl-grid"/>
      <span className="gl-mer m1"/><span className="gl-mer m2"/><span className="gl-mer m3"/>
      <span className="gl-lat"/>
      {[[28, 34], [62, 26], [44, 58], [72, 62], [22, 66], [54, 40]].map(([x, y], i) => <b key={i} className="gl-node" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.6}s` }}/>)}
      <span className="gl-shine"/>
    </div>
    <div className="global-orbit-ring r1"><i/></div>
    <div className="global-orbit-ring r2"><i/></div>
    <div className="global-orbit-ring r3"><i/></div>
    <span className="global-orbit-caption">{caption}</span>
  </div>;
}
