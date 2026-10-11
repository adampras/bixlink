import { createFileRoute } from '@tanstack/react-router';
import { BixShell } from '@/components/BixShell';
import { YieldControlPanel } from '@/components/YieldControlPanel';

export const Route = createFileRoute('/yield-control')({
  head: () => ({ meta: [{ title: 'Yield & Market Control — BIXLINK' }, { name: 'description', content: 'Owner control for staking daily profit and the internal BIX price.' }, { property: 'og:title', content: 'Yield & Market Control — BIXLINK' }, { property: 'og:description', content: 'Owner control for staking profit and BIX reference price.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: YieldControl,
});

function YieldControl() {
  return <BixShell><main className="mx-auto max-w-6xl px-5 py-8 pb-28"><YieldControlPanel/></main></BixShell>;
}
