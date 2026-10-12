import { createFileRoute } from '@tanstack/react-router';
import { BixShell } from '@/components/BixShell';
import { AdminStakingControls } from '@/components/AdminStakingControls';
import { useState } from 'react';

export const Route = createFileRoute('/yield-control')({
  head: () => ({ meta: [{ title: 'Yield & Market Control — BIXLINK' }, { name: 'description', content: 'Owner control for staking daily profit and the internal BIX price.' }, { property: 'og:title', content: 'Yield & Market Control — BIXLINK' }, { property: 'og:description', content: 'Owner control for staking profit and BIX reference price.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: YieldControl,
});

function YieldControl() {
  const [message, setMessage] = useState('');
  return <BixShell><main className="mx-auto max-w-6xl px-5 py-8 pb-28">{message && <p role="status" className="text-sm text-chart-2">{message}</p>}<AdminStakingControls onMessage={setMessage}/></main></BixShell>;
}
