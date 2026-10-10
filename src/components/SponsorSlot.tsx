import { Handshake, ExternalLink } from 'lucide-react';
import type { ContentItem } from '@/lib/landing-content';

type Sponsor = ContentItem & { url?: string };

/**
 * Owner-controlled "Featured Partner" slot. Renders the configured sponsor when
 * enabled in landing content; otherwise shows an honest availability teaser.
 * No fabricated partners are ever displayed.
 */
export function SponsorSlot({ sponsor }: { sponsor?: Sponsor | undefined }) {
  const active = sponsor?.enabled && sponsor.title;
  return (
    <section className="mx-auto max-w-7xl px-5 pb-8 md:px-8">
      <div className="relative overflow-hidden rounded-2xl border border-chart-3/30 bg-gradient-to-br from-chart-3/10 via-card to-card p-5 md:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-chart-3/10 blur-3xl" />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-chart-3/40 bg-chart-3/10 text-chart-3"><Handshake size={20} /></span>
            <div className="min-w-0">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-chart-3">{active ? 'Featured Partner · Sponsored' : 'Featured Partner'}</span>
              <h3 className="truncate font-display text-base font-bold text-foreground">{active ? sponsor!.title : 'Partnership & Sponsorship'}</h3>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                {active
                  ? sponsor!.description
                  : 'This premium placement is reserved for verified ecosystem partners. Sponsored placements are always labelled and never presented as endorsements.'}
              </p>
            </div>
          </div>
          {active && sponsor!.url?.startsWith('https://') && (
            <a href={sponsor!.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-chart-3/40 bg-chart-3/10 px-4 py-1.5 text-xs font-bold text-chart-3 transition hover:bg-chart-3/20">
              Visit partner <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
