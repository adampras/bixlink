import { Coins, Globe2, Network } from 'lucide-react';
import { ContentImage } from '@/components/ContentImage';
import { categoryImage } from '@/lib/category-images';
import { roadmapImage } from '@/lib/roadmap-images';
import { defaultNarrative, defaultNarrativeIntro, defaultNarrativeTitle, type LandingContent } from '@/lib/landing-content';

export function LandingNarrative({ content }: { content: LandingContent }) {
  const items = (content.narrative ?? defaultNarrative).filter(item => item.enabled !== false);
  const title = content.narrativeTitle ?? defaultNarrativeTitle;
  const intro = content.narrativeIntro ?? defaultNarrativeIntro;
  if (content.narrativeEnabled === false || (!title && !intro && !items.length)) return null;
  const icons = [Coins, Network, Globe2];
  const accents = ['border-chart-3/30 text-chart-3 bg-chart-3/10', 'border-primary/30 text-primary bg-primary/10', 'border-chart-2/30 text-chart-2 bg-chart-2/10'];
  const images = [categoryImage('CRYPTO'), roadmapImage('ECOSYSTEM', 3), categoryImage('RWA')];
  return <section aria-label="BIXLINK narrative" className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
    <header className="mb-8 max-w-2xl"><div className="mb-3 flex items-center gap-3"><span className="h-0.5 w-8 bg-chart-3"/><span className="eyebrow">CORE FOUNDATION</span></div>{title && <h2 className="break-words font-display text-3xl font-extrabold leading-tight text-chart-3 md:text-4xl">{title}</h2>}{intro && <p className="mt-4 text-sm leading-7 text-muted-foreground">{intro}</p>}</header>
    <div className="grid gap-5 lg:grid-cols-3">{items.map((item, index) => {
      const Icon = icons[index % icons.length] ?? Globe2;
      return <article key={`${item.title}-${index}`} className="group relative isolate min-w-0 overflow-hidden rounded-lg border border-border bg-card/50">
        <ContentImage path={item.image} fallbackSrc={images[index % images.length]} alt={item.title} className="absolute inset-0 -z-10 h-full w-full object-cover opacity-10 transition-opacity duration-300 motion-safe:group-hover:opacity-20 motion-reduce:transition-none"/>
        <div className="flex items-start gap-4 p-5 sm:p-6"><span className={`mt-1 flex size-11 shrink-0 items-center justify-center rounded-lg border ${accents[index % accents.length]}`}><Icon size={22}/></span><div className="min-w-0"><h3 className="break-words font-display text-lg font-bold leading-6">{item.title}</h3>{item.description && <p className="mt-3 break-words text-sm leading-6 text-muted-foreground">{item.description}</p>}</div></div>
      </article>;
    })}</div>
    <p className="mt-6 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">Internal balances are not on-chain tokens. Returns are not guaranteed.</p>
  </section>;
}