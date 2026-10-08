import { ChevronRight } from 'lucide-react';
import { ContentLink } from '@/components/ContentLink';
import { defaultTokenomics, hasPage, type LandingContent } from '@/lib/landing-content';

const colors = ['bg-primary', 'bg-chart-2', 'bg-chart-3', 'bg-muted-foreground', 'bg-chart-4', 'bg-chart-5'];

export function TokenomicsCard({ content }: { content?: LandingContent | undefined }) {
  if (content?.tokenomicsEnabled === false) return null;
  const items = (content?.tokenomics ?? defaultTokenomics).map((item, index) => ({ item, index })).filter(({ item }) => item.enabled !== false);
  return <div>
    <div className="eyebrow">SUPPLY DESIGN</div><h2 className="section-title">BIX <span>TOKENOMICS</span></h2>
    <div className="mt-7 flex h-4 overflow-hidden rounded-full">{items.map(({ item, index }) => <div key={index} className={colors[index % colors.length]} style={{ width: `${item.percent ?? 0}%` }}/>)}</div>
    <div className="mt-5 grid grid-cols-2 gap-3">{items.map(({ item, index }) => <ContentLink group="tokenomics" index={index} item={item} key={index}><div className="flex items-center justify-between gap-2 border-b border-border py-2 text-sm"><span className="flex items-center gap-2 text-muted-foreground"><i className={`h-2 w-2 shrink-0 rounded-full ${colors[index % colors.length]}`}/>{item.title}</span><b className="flex items-center">{item.percent ?? 0}%{hasPage(item) && <ChevronRight size={14} className="text-muted-foreground"/>}</b></div></ContentLink>)}</div>
    <p className="mt-4 text-xs text-muted-foreground">Conceptual allocation of the fixed 21,000,000 BIX supply; this is not evidence of an issued on-chain supply.</p>
  </div>;
}
