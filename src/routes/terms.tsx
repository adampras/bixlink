import { createFileRoute } from '@tanstack/react-router';
import { LegalPage, legalHead } from '@/components/LegalPage';

export const Route = createFileRoute('/terms')({ head: () => legalHead('Terms of Use', 'Terms governing use of the BIXLINK prelaunch staking simulation.'), component: () => <LegalPage eyebrow="LEGAL" title="TERMS OF USE" updated="October 2026" sections={[
  { title: '1. Prelaunch simulation', body: ['BIXLINK is a prelaunch, internal-ledger environment for BIXCOIN (no smart contract). Balances, stakes, yield projections and transfers shown in the app are internal records and are not a deposit account, security, or investment contract.'] },
  { title: '2. Eligibility', body: ['You must be of legal age in your country and must not use BIXLINK where crypto staking or referral programs are restricted. You are responsible for complying with your local laws.'] },
  { title: '3. Accounts', body: ['Keep your credentials secure. One person may operate one account. We may suspend accounts involved in abuse, fraud, multiple-account farming or false information.'] },
  { title: '4. Staking, yield and referrals', body: ['APY figures are annualized illustrations. Projected yield is display-only and is not credited to spendable balances unless a separate settlement rule is published. Referral and weekly figures are estimates and may change.'] },
  { title: '5. Withdrawals and verification', body: ['Withdrawals are reviewed manually within 1×24 hours, limited to $10–$10,000 per account per day, and may require identity verification (KYC). Requests may be rejected if verification fails.'] },
  { title: '6. No guarantee and liability', body: ['The service is provided "as is" without warranty. We do not guarantee profit, availability or token value. To the extent permitted by law, BIXLINK is not liable for indirect losses.'] },
  { title: '7. Changes', body: ['We may update these terms. Continued use after an update means you accept the revised terms.'] },
]} /> });
