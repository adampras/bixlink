import { Building2, ChartCandlestick, Coins, Megaphone } from 'lucide-react';
import { ContentImage } from '@/components/ContentImage';
import { categoryImage } from '@/lib/category-images';
import type { ContentItem } from '@/lib/landing-content';

export function IncomeCategoryCard({ item }: { item: ContentItem }) {
  const title = item.title.trim().toUpperCase();
  const Icon = title === 'FOREX' ? ChartCandlestick : title === 'CRYPTO' ? Coins : title === 'ADVERTISING' ? Megaphone : Building2;
  const accent = title === 'FOREX' ? 'text-chart-2' : title === 'CRYPTO' ? 'text-primary' : 'text-chart-3';
  return <article className="content-medium-card group h-full min-w-0 overflow-hidden rounded-lg border border-border bg-card/50 backdrop-blur-md">
    <ContentImage path={item.image} fallbackSrc={categoryImage(item.title)} alt={`${item.title} — planned ecosystem category`} className="h-40 w-full object-cover transition-transform duration-700 motion-safe:group-hover:scale-[1.02] motion-reduce:transition-none"/>
    <div className="p-5">
      <div className="mb-2 flex items-center gap-2"><Icon size={17} aria-hidden="true" className={accent}/><h3 className="break-words text-sm font-bold uppercase leading-5">{item.title}</h3></div>
      {item.description && <p className="break-words text-sm leading-relaxed text-muted-foreground">{item.description}</p>}
    </div>
  </article>;
}