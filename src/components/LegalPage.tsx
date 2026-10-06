import { Link } from '@tanstack/react-router';
import { BixShell } from '@/components/BixShell';
import { useMember, usePublicConfig } from '@/lib/useMember';

export type LegalSection = { title: string; body: string[] };

export function LegalPage({ eyebrow, title, updated, sections }: { eyebrow: string; title: string; updated: string; sections: LegalSection[] }) {
  const { data: config, isPending } = usePublicConfig();
  const { data: member } = useMember();
  if (!config?.readiness.legalEnabled && !member?.isAdmin) return <BixShell><main className="mx-auto min-h-[50vh] max-w-3xl px-5 py-12"><h1 className="section-title">{isPending ? 'BIXLINK' : 'COMING SOON'}</h1><p className="mt-4 text-muted-foreground">{isPending ? 'Loading availability…' : 'This page is not open yet.'}</p><Link to="/" className="mt-6 inline-block text-chart-3">Return home →</Link></main></BixShell>;
  return <BixShell><main className="mx-auto w-full max-w-3xl px-5 py-12 md:py-20">
    <div className="eyebrow">{eyebrow}</div>
    <h1 className="section-title break-words">{title}</h1>
    <p className="mt-3 text-xs text-muted-foreground">Last updated: {updated}</p>
    <div className="mt-10 space-y-8">{sections.map(s => <section key={s.title} className="rounded-2xl border border-border bg-card/60 p-5 sm:p-6">
      <h2 className="font-display text-lg font-bold text-chart-3 sm:text-xl">{s.title}</h2>
      {s.body.map((p, i) => <p key={i} className="mt-3 text-sm leading-7 text-muted-foreground">{p}</p>)}
    </section>)}</div>
    <nav className="mt-10 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
      <Link to="/terms" className="hover:text-foreground">Terms</Link><Link to="/privacy" className="hover:text-foreground">Privacy</Link><Link to="/risk" className="hover:text-foreground">Risk Disclosure</Link><Link to="/about" className="hover:text-foreground">About &amp; Support</Link>
    </nav>
  </main></BixShell>;
}

export const legalHead = (title: string, description: string) => ({ meta: [{ title: `${title} — BIXLINK` }, { name: 'description', content: description }, { property: 'og:title', content: `${title} — BIXLINK` }, { property: 'og:description', content: description }, { property: 'og:type', content: 'article' }, { name: 'twitter:card', content: 'summary' }] });
