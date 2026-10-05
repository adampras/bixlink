import { createFileRoute, Navigate } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard')({
  head: () => ({ meta: [{ title: 'Dashboard moved — BIXLINK' }, { name: 'description', content: 'The BIXLINK dashboard is now available from HOME.' }, { property: 'og:title', content: 'BIXLINK HOME' }, { property: 'og:description', content: 'Open the BIXLINK market and staking home.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: () => <Navigate to="/" replace />,
});