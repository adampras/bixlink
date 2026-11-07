import { createFileRoute } from '@tanstack/react-router';
import { LegalPage } from '@/components/LegalPage';
import { ecosystemHead } from '@/lib/ecosystem-seo';

export const Route = createFileRoute('/about')({ head: () => ecosystemHead('/about', 'Tentang BIXLINK — Ekosistem & Dukungan', 'Mengenal ekosistem BIXLINK: BIX CALL, BIXGO, BIXTOK, BIX GOLD, BIX PAY, ketersediaan layanan dan dukungan anggota.'), component: () => <LegalPage eyebrow="COMPANY" title="ABOUT & SUPPORT" updated="November 2026" sections={[
  { title: 'About BIXLINK', body: ['BIXLINK connects communication through BIX CALL, mobility and delivery through BIXGO, community video through BIXTOK, gold reference information through BIX GOLD, and internal member transfers through BIX PAY. Account requirements and availability vary by service.', 'BIXLINK also has separate internal staking features operating under a non-custodial prelaunch model. Projections are not guaranteed returns. Gold custody, physical redemption and external payment services are not established by these previews. Legal entity and licensing details will be published here before any real-money service opens.'] },
  { title: 'Member support', body: ['Email: bixdevpras@gmail.com', 'Response time: within 1×24 hours on business days. Never share your password or verification codes with anyone, including support.'] },
  { title: 'Reporting issues', body: ['Report suspected fraud, impersonation or security issues to support with your member code and a short description.'] },
]} /> });
