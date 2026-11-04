import { toEnglish } from '@/lib/legacy-english';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContentDetailModal } from '@/components/ContentDetailModal';
import { categoryImage } from '@/lib/category-images';
import { roadmapImage } from '@/lib/roadmap-images';
import { defaultRoadmap, defaultSpaces } from '@/lib/landing-content';
import { roadmapNarratives, spaceNarratives, withNarratives } from '@/lib/content-narratives';
import { IncomeCategoryCard } from '@/components/IncomeCategoryCard';
import { RoadmapCard } from '@/components/RoadmapCard';
import type { ContentItem } from '@/lib/landing-content';

export function ContentCarousel({ items: rawItems, group, title }: { items: ContentItem[]; group: 'spaces' | 'roadmap'; title: string }) {
  const items = group === 'spaces' ? withNarratives(toEnglish(rawItems), defaultSpaces, spaceNarratives) : withNarratives(toEnglish(rawItems), defaultRoadmap, roadmapNarratives);
  const [open, setOpen] = useState<number | null>(null);
  const openRef = useRef(false);
  openRef.current = open !== null;
  const track = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(0);
  const [atEnd, setAtEnd] = useState(false);
  const visible = items.map((item, index) => ({ item, index })).filter(({ item }) => item.enabled !== false);
  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const update = () => {
      setPosition(element.scrollLeft);
      setAtEnd(element.scrollLeft + element.clientWidth >= element.scrollWidth - 2);
    };
    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();
    return () => observer.disconnect();
  }, [rawItems]);
  const paused = useRef(false);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      const element = track.current;
      if (!element || paused.current || openRef.current || document.hidden) return;
      const card = element.firstElementChild;
      const step = (card?.getBoundingClientRect().width ?? 280) + 16;
      const end = element.scrollLeft + element.clientWidth >= element.scrollWidth - 2;
      element.scrollTo({ left: end ? 0 : element.scrollLeft + step, behavior: 'smooth' });
    }, 3800);
    return () => window.clearInterval(timer);
  }, [rawItems]);
  if (!visible.length) return null;
  const move = (direction: number) => {
    const element = track.current;
    if (!element) return;
    const card = element.firstElementChild;
    const step = (card?.getBoundingClientRect().width ?? 280) + 16;
    element.scrollBy({ left: step * direction, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  };
  const hold = () => { paused.current = true; };
  const release = () => { window.setTimeout(() => { paused.current = false; }, 2500); };
  return <div className="content-carousel" data-content-group={group} onMouseEnter={hold} onMouseLeave={release} onTouchStart={hold} onTouchEnd={release} onFocus={hold} onBlur={release}>
    <header className="mb-5 flex items-center justify-between gap-3">
      <h2 className="min-w-0 break-words text-lg font-bold uppercase leading-6">{title}</h2>
      <div className="flex shrink-0 gap-2">
        <Button type="button" size="icon" variant="outline" className="size-8 rounded-full bg-card/50" aria-label={`${title}: previous`} title="Previous" disabled={position === 0} onClick={() => move(-1)}><ChevronLeft size={16}/></Button>
        <Button type="button" size="icon" variant="outline" className="size-8 rounded-full bg-card/50" aria-label={`${title}: next`} title="Next" disabled={atEnd || visible.length < 2} onClick={() => move(1)}><ChevronRight size={16}/></Button>
      </div>
    </header>
    <div ref={track} className="content-carousel-track" tabIndex={0} role="region" aria-label={title} onScroll={event => {
      const element = event.currentTarget;
      setPosition(element.scrollLeft);
      setAtEnd(element.scrollLeft + element.clientWidth >= element.scrollWidth - 2);
    }}>
      {visible.map(({ item, index }) => <button type="button" key={`${item.title}-${index}`} className="content-carousel-slide block min-w-0 rounded-lg text-left focus-visible:ring-2 focus-visible:ring-primary motion-safe:active:scale-[0.98]" aria-label={`${item.title} details`} onClick={() => setOpen(index)}>
        {group === 'spaces' ? <IncomeCategoryCard item={item}/> : <RoadmapCard item={item} index={index}/>}
        <span className="mt-2 block text-center text-[10px] font-bold uppercase tracking-[0.15em] text-chart-3">Tap for details ▸</span>
      </button>)}
    </div>
    {group === 'roadmap' && <p className="mt-5 text-xs leading-5 text-muted-foreground">Development roadmap, not a guarantee of outcomes or completion timelines.</p>}
    <ContentDetailModal item={open === null ? null : items[open] ?? null} eyebrow={open === null ? '' : group === 'roadmap' ? `PHASE ${open + 1}${items[open]?.quarter ? ` · ${items[open]?.quarter}` : ''}` : 'DEVELOPMENT CATEGORY'} fallbackSrc={open === null ? undefined : group === 'spaces' ? categoryImage((items[open]?.title ?? "")) : roadmapImage((items[open]?.title ?? ""), open)} onClose={() => { setOpen(null); paused.current = false; }}/>
  </div>;
}
