import { createFileRoute } from '@tanstack/react-router';
import { LegalPage, legalHead } from '@/components/LegalPage';

export const Route = createFileRoute('/privacy')({ head: () => legalHead('Privacy Policy', 'How BIXLINK collects, uses and protects member data.'), component: () => <LegalPage eyebrow="LEGAL" title="PRIVACY POLICY" updated="October 2026" sections={[
  { title: 'Data we collect', body: ['Account data (email, full name, username), referral relationships, internal ledger activity, wallet addresses you submit, and optional verification data (full name, country, document type and the last 4 characters of the document number).'] },
  { title: 'How we use it', body: ['To operate your account, calculate the internal ledger, review withdrawals, prevent fraud and meet legal obligations. We do not sell personal data.'] },
  { title: 'Storage and security', body: ['Data is stored on secured cloud infrastructure with row-level access controls. Only you and authorized administrators can view your verification record. We never store full document numbers.'] },
  { title: 'Browser storage', body: ['Language, notification preferences and referral codes are kept in your browser storage and can be cleared at any time.'] },
  { title: 'Your rights', body: ['You may request access, correction or deletion of your data through the support contact on the About page, subject to record-keeping obligations.'] },
]} /> });
