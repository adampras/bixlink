import { Building2, ChartCandlestick, Coins, Megaphone } from 'lucide-react';
import { ContentImage } from '@/components/ContentImage';
import { categoryImage } from '@/lib/category-images';
import type { ContentItem } from '@/lib/landing-content';

export function IncomeCategoryCard({ item }: { item: ContentItem }) {
  const title = item.title.trim().toUpperCase();
  const Icon = title === 'FOREX' ? ChartCandlestick : title === 'CRYPTO' ? Coins : title === 'ADVERTISING' ? Megaphone : Building2;
  const accent = title === 'FOREX' ? 'text-chart-2' : title === 'CRYPTO' ? 'text-primary' : 'text-chart-3';
  return <article className={`group relative isolate ${item.size === 'lg' ? 'aspect-[16/10]' : item.size === 'sm' ? 'aspect-square' : 'aspect-[2/3]'} min-w-0 overflow-hidden rounded-lg border bg-card ${title === 'ADVERTISING' ? 'border-chart-3/50' : 'border-border'}`}>
    <ContentImage path={item.image} fallbackSrc={categoryImage(item.title)} alt={`${item.title} — planned ecosystem category`} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 motion-safe:group-hover:scale-105 motion-reduce:transition-none"/>
    <div className="absolute inset-x-2 bottom-2 rounded-lg border border-foreground/20 bg-background/75 px-2 py-3 text-center backdrop-blur-xl sm:inset-x-3 sm:bottom-3 sm:px-3 sm:py-4">
      <Icon size={19} aria-hidden="true" className={`mx-auto mb-2 ${accent}`}/>
      <h3 className="break-words font-display text-xs font-bold leading-5 sm:text-sm">{item.title}</h3>
      {item.description && <p className="mt-1 break-words text-[10px] leading-4 text-foreground/75 sm:text-xs">{item.description}</p>}
    </div>
  </article>;
}