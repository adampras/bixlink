import { Children, useRef, useState, type ReactNode } from 'react';

/** Phone-widget style swipe deck: one card per page with snap + dots. Desktop shows a grid. */
export function SwipeDeck({ children, label, desktopCols = 'md:grid-cols-3' }: { children: ReactNode; label: string; desktopCols?: string }) {
  const items = Children.toArray(children);
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const onScroll = () => {
    const el = ref.current; if (!el) return;
    setActive(Math.round(el.scrollLeft / Math.max(el.clientWidth * 0.86, 1)));
  };
  const go = (i: number) => {
    const el = ref.current; if (!el) return;
    const child = el.children[i] as HTMLElement | undefined;
    child?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };
  return <div className="swipe-deck" aria-roledescription="carousel" aria-label={label}>
    <div ref={ref} onScroll={onScroll} className={`swipe-deck-track md:grid ${desktopCols} md:gap-3 md:overflow-visible`}>
      {items.map((c, i) => <div key={i} className={`swipe-deck-slide ${i === active ? 'is-active' : ''}`} aria-label={`${i + 1} / ${items.length}`}>{c}</div>)}
    </div>
    <div className="mt-3 flex items-center justify-center gap-1.5 md:hidden">
      {items.map((_, i) => <button key={i} type="button" aria-label={`Go to card ${i + 1}`} onClick={() => go(i)} className={`swipe-deck-dot ${i === active ? 'is-active' : ''}`}/>)}
    </div>
  </div>;
}

/** Global-presence visual: orbiting rings over a glowing globe. Decorative only. */
export function GlobalOrbit({ caption }: { caption: string }) {
  return <div className="global-orbit" aria-hidden>
    <div className="global-orbit-globe"/>
    <div className="global-orbit-ring r1"><i/></div>
    <div className="global-orbit-ring r2"><i/></div>
    <div className="global-orbit-ring r3"><i/></div>
    <span className="global-orbit-caption">{caption}</span>
  </div>;
}
