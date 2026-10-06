import { createFileRoute } from '@tanstack/react-router';
import { LegalPage, legalHead } from '@/components/LegalPage';

export const Route = createFileRoute('/about')({ head: () => legalHead('About & Support', 'About the BIXLINK project and how to contact member support.'), component: () => <LegalPage eyebrow="COMPANY" title="ABOUT & SUPPORT" updated="October 2026" sections={[
  { title: 'About BIXLINK', body: ['BIXLINK is a BIXCOIN staking, exchange, DeFi and RWA ecosystem currently operating as a prelaunch internal ledger. Legal entity and licensing details will be published here before any real-money service opens.'] },
  { title: 'Member support', body: ['Email: bixdevpras@gmail.com', 'Response time: within 1×24 hours on business days. Never share your password or verification codes with anyone, including support.'] },
  { title: 'Reporting issues', body: ['Report suspected fraud, impersonation or security issues to support with your member code and a short description.'] },
]} /> });
