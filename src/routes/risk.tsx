import { createFileRoute } from '@tanstack/react-router';
import { LegalPage, legalHead } from '@/components/LegalPage';

export const Route = createFileRoute('/risk')({ head: () => legalHead('Risk Disclosure', 'Important risks of crypto staking and the BIXLINK prelaunch ledger.'), component: () => <LegalPage eyebrow="IMPORTANT" title="RISK DISCLOSURE" updated="October 2026" sections={[
  { title: 'No guarantee of profit', body: ['Nothing in BIXLINK is a promise of returns. APY, booster, referral and weekly reward figures are projections and can be reduced, delayed or never realized.'] },
  { title: 'Total loss is possible', body: ['Crypto assets are highly volatile. BIXCOIN has no smart contract and no public market; the internal reference price is set by the owner and may not reflect any real market value.'] },
  { title: 'Liquidity and lock risk', body: ['Staked amounts are locked for the package period. Early unstaking incurs penalties that are deducted from principal. Withdrawals are subject to manual review and daily limits.'] },
  { title: 'Regulatory risk', body: ['Staking and referral programs are regulated or prohibited in some jurisdictions. Laws may change and could force the service to restrict or stop operating in your country.'] },
  { title: 'Operational risk', body: ['Software errors, outages, security incidents or third-party blockchain failures may cause delays or loss. Only use amounts you can afford to lose.'] },
]} /> });
