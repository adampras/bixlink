import { Globe2 } from 'lucide-react';

/** Global rollout status: Indonesia is the live launch market; other regions are labeled honestly as beta or pre-registration. */
export const REGION_PHASES = [
  { flag: '🇮🇩', name: 'Indonesia', phase: 'Live' },
  { flag: '🇲🇾', name: 'Malaysia', phase: 'Beta' },
  { flag: '🇸🇬', name: 'Singapore', phase: 'Pre-registration' },
  { flag: '🇹🇭', name: 'Thailand', phase: 'Pre-registration' },
  { flag: '🇵🇭', name: 'Philippines', phase: 'Pre-registration' },
  { flag: '🇦🇪', name: 'UAE', phase: 'Pre-registration' },
] as const;

export function GlobalRegions({ service }: { service: string }) {
  return <section className="mx-3 mt-3 rounded-2xl border border-primary/25 bg-card/70 p-3" aria-label={`${service} global coverage`}>
    <div className="flex items-center justify-between text-[11px]"><b className="flex items-center gap-1 uppercase tracking-widest text-primary"><Globe2 className="h-3.5 w-3.5"/>{service} Global</b><span className="text-muted-foreground">Launching first in Indonesia</span></div>
    <ul className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">{REGION_PHASES.map(r => <li key={r.name} className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${r.phase === 'Live' ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground'}`}>{r.flag} {r.name} · {r.phase}</li>)}</ul>
  </section>;
}
