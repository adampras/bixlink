import { ContentImage } from '@/components/ContentImage';
import { roadmapImage } from '@/lib/roadmap-images';
import type { ContentItem } from '@/lib/landing-content';

export function RoadmapCard({ item, index }: { item: ContentItem; index: number }) {
  return <article className="group relative isolate flex min-h-64 min-w-0 flex-col justify-end overflow-hidden rounded-lg border border-border bg-card sm:min-h-80">
    <ContentImage path={item.image} fallbackSrc={roadmapImage(item.title, index)} alt={`${item.title} — conceptual roadmap illustration`} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 motion-safe:group-hover:scale-105 motion-reduce:transition-none"/>
    <div className="relative mx-2 mb-2 mt-36 rounded-lg border border-foreground/20 bg-background/75 px-3 py-3 backdrop-blur-xl sm:mx-3 sm:mb-3 sm:mt-48 sm:py-4">
      <span className="block text-[10px] font-bold leading-4 text-chart-2">PHASE {index + 1}{item.quarter ? ` · ${item.quarter}` : ''}</span>
      <h3 className="mt-2 break-words font-display text-sm font-bold leading-5 sm:text-base">{item.title}</h3>
      {item.description && <p className="mt-2 break-words text-xs leading-5 text-foreground/75">{item.description}</p>}
    </div>
  </article>;
}