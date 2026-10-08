import { ContentImage } from '@/components/ContentImage';
import { roadmapImage } from '@/lib/roadmap-images';
import type { ContentItem } from '@/lib/landing-content';

export function RoadmapCard({ item, index }: { item: ContentItem; index: number }) {
  return <article className="content-medium-card group h-full min-w-0 overflow-hidden rounded-lg border border-border bg-card/50 backdrop-blur-md">
    <ContentImage path={item.image} fallbackSrc={roadmapImage(item.title, index)} alt={`${item.title} — conceptual roadmap illustration`} className="h-32 w-full object-cover transition-transform duration-700 motion-safe:group-hover:scale-[1.02] motion-reduce:transition-none"/>
    <div className="p-5">
      <span className="block text-[10px] font-bold leading-4 text-chart-2">PHASE {index + 1}{item.quarter ? ` · ${item.quarter}` : ''}</span>
      <h3 className="mt-2 break-words text-base font-bold leading-6">{item.title}</h3>
      {item.description && <p className="mt-2 break-words text-sm leading-relaxed text-muted-foreground">{item.description}</p>}
    </div>
  </article>;
}