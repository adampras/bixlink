import { useEffect, useRef, useState, type RefObject } from 'react';
import { Link } from '@tanstack/react-router';
import { Bot, CreditCard, Crown, Palette, Rocket, ShoppingBag, Store, Swords, Repeat } from 'lucide-react';

/** Tracks the active card of a horizontal scroller and auto-advances it. */
export function useRailDots(ref: RefObject<HTMLElement | null>, count: number, interval = 3400) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el || count < 2) return;
    const onScroll = () => {
      const card = el.firstElementChild as HTMLElement | null;
      const step = (card?.offsetWidth ?? 240) + 10;
      setActive(Math.min(count - 1, Math.round(el.scrollLeft / step)));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => el.removeEventListener('scroll', onScroll);
    let paused = false;
    const stop = () => { paused = true; }, go = () => { paused = false; };
    el.addEventListener('pointerenter', stop); el.addEventListener('pointerleave', go); el.addEventListener('touchstart', stop, { passive: true }); el.addEventListener('touchend', go);
    const t = setInterval(() => {
      if (paused) return;
      const card = el.firstElementChild as HTMLElement | null; const step = (card?.offsetWidth ?? 240) + 10;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) el.scrollTo({ left: 0, behavior: 'smooth' });
      else el.scrollBy({ left: step, behavior: 'smooth' });
    }, interval);
    return () => { clearInterval(t); el.removeEventListener('scroll', onScroll); el.removeEventListener('pointerenter', stop); el.removeEventListener('pointerleave', go); el.removeEventListener('touchstart', stop); el.removeEventListener('touchend', go); };
  }, [ref, count, interval]);
  const goTo = (i: number) => { const el = ref.current; const card = el?.children[i] as HTMLElement | undefined; if (el && card) el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: 'smooth' }); };
  return { active, goTo };
}

export function RailDots({ count, active, goTo, label }: { count: number; active: number; goTo: (i: number) => void; label: string }) {
  if (count < 2) return null;
  return <div className="rail-dots" role="tablist" aria-label={label}>{Array.from({ length: count }, (_, i) => <button key={i} type="button" role="tab" aria-selected={i === active} aria-label={`${label} ${i + 1}`} className={i === active ? 'is-active' : ''} onClick={() => goTo(i)}/>)}</div>;
}

type Item = { title: string; body: string; icon: typeof Crown; tone: string; href?: '/presale' | '/arena' | '/nft-marketplace' | '/studio'; soon?: boolean };

export function EcosystemRail({ presale }: { presale: boolean }) {
  const items: Item[] = [
    { title: 'Genesis Presale', body: presale ? 'Packages open · from $500' : 'Genesis packages · from $500', icon: Crown, tone: 'gold', href: '/presale' as const },
    { title: 'Fox Arena', body: 'Daily missions & BIXP quests', icon: Swords, tone: 'emerald', href: '/arena' },
    { title: 'Marketplace', body: 'NFT certificates & merchandise', icon: ShoppingBag, tone: 'violet', href: '/nft-marketplace' },
    { title: 'BIX Studio', body: 'Posters, banners & presentations', icon: Palette, tone: 'gold', href: '/studio' },
    { title: 'AI Trading Bot', body: 'Demo simulation · in development', icon: Bot, tone: 'cyan', soon: true },
    { title: 'BIX Virtual Card', body: 'Planned utility card', icon: CreditCard, tone: 'gold', soon: true },
    { title: 'Launchpool', body: 'Planned project launches', icon: Rocket, tone: 'crimson', soon: true },
    { title: 'Swap & RWA', body: 'Planned real-world assets', icon: Repeat, tone: 'emerald', soon: true },
    { title: 'BIX Merchant Pay', body: 'Planned merchant partners', icon: Store, tone: 'violet', soon: true },
  ];
  const ref = useRef<HTMLDivElement>(null);
  const { active, goTo } = useRailDots(ref, items.length);
  return <section className="mx-auto max-w-7xl px-5 pb-6 md:px-8">
    <div className="eco-rail-head"><span>BIXLINK ECOSYSTEM</span><small>Live & coming soon</small></div>
    <div ref={ref} className="eco-rail">{items.map(item => {
      const I = item.icon;
      const inner = <><span className="eco-icon"><I size={20}/></span><b>{item.title}</b><em>{item.body}</em>{item.soon ? <i className="eco-badge">COMING SOON</i> : <i className="eco-badge is-live">● LIVE</i>}</>;
      return item.href ? <Link key={item.title} to={item.href} className={`eco-card eco-${item.tone}`}>{inner}</Link> : <Link key={item.title} to="/coming-soon" className={`eco-card eco-${item.tone} is-soon`}>{inner}</Link>;
    })}</div>
    <RailDots count={items.length} active={active} goTo={goTo} label="Ecosystem"/>
  </section>;
}
