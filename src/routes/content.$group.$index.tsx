import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { BixShell } from '@/components/BixShell';
import { ContentImage } from '@/components/ContentImage';
import { usePublicConfig } from '@/lib/useMember';
import { categoryImage } from '@/lib/category-images';
import { roadmapImage } from '@/lib/roadmap-images';
import { contentGroups, defaultLandingContent, defaultRoadmap, defaultSpaces, defaultTokenomics, type ContentGroup, type ContentItem } from '@/lib/landing-content';

export const Route = createFileRoute('/content/$group/$index')({
  head: () => ({ meta: [{ title: 'BIXLINK Ecosystem Detail' }, { name: 'description', content: 'Detailed BIXLINK ecosystem, roadmap and tokenomics information.' }, { property: 'og:title', content: 'BIXLINK Ecosystem Detail' }, { property: 'og:description', content: 'Read more about this BIXLINK ecosystem topic.' }, { property: 'og:type', content: 'article' }, { name: 'twitter:card', content: 'summary_large_image' }] }),
  component: ContentPage,
});

const widths = { narrow: 'max-w-2xl', normal: 'max-w-4xl', wide: 'max-w-6xl' };

function ContentPage() {
  const { group, index } = Route.useParams();
  const { data: cfg } = usePublicConfig();
  const c = cfg?.landingContent ?? defaultLandingContent;
  const g = (contentGroups as readonly string[]).includes(group) ? group as ContentGroup : undefined;
  const fallback: Record<ContentGroup, ContentItem[]> = { ecosystem: c.ecosystem, income: c.income, spaces: c.spaces ?? defaultSpaces, roadmap: c.roadmap ?? defaultRoadmap, narrative: c.narrative ?? [], tokenomics: c.tokenomics ?? defaultTokenomics };
  const i = Number(index);
  const item = g ? fallback[g][i] : undefined;
  const available = item && item.enabled !== false && item.pageOpen !== false;
  const fallbackImg = item && (g === 'spaces' ? categoryImage(item.title) : g === 'roadmap' ? roadmapImage(item.title, i) : undefined);
  return <BixShell><main className={`mx-auto ${widths[item?.pageWidth ?? 'normal']} px-5 py-10 md:px-8`}>
    <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft size={16}/> Back</Link>
    {!cfg ? <div className="mt-8 h-64 animate-pulse rounded-lg bg-card"/> : !available ? <p className="mt-10 text-muted-foreground">This page is not available.</p> : <article className="mt-6">
      <div className="eyebrow">{g?.toUpperCase()}{item.quarter ? ` · ${item.quarter}` : ''}</div>
      <h1 className="section-title">{item.title}{typeof item.percent === 'number' && <span> {item.percent}%</span>}</h1>
      <ContentImage path={item.detailImage ?? item.image} fallbackSrc={fallbackImg} alt={item.title} className="mt-6 aspect-video w-full rounded-lg object-cover"/>
      {item.description && <p className="mt-6 text-lg leading-8 text-foreground/85">{item.description}</p>}
      {item.detail && <div className="mt-6 whitespace-pre-line text-sm leading-7 text-muted-foreground">{item.detail}</div>}
      <p className="mt-10 border-t border-border pt-4 text-xs text-muted-foreground">Owner-managed narrative. Planned items and projections are not guarantees of delivery or return.</p>
    </article>}
  </main></BixShell>;
}
