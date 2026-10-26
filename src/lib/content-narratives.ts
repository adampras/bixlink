import type { ContentItem } from '@/lib/landing-content';

/** Bundled long-form narratives used when the owner has not written a custom detail. */
export const spaceNarratives: Record<string, string> = {
  FOREX: `BIXLINK explores foreign exchange markets as a foundational pillar of ecosystem diversification. Research focuses on major currency pairs, cross-currency risk management, and disciplined hedging models.

All activities related to this category are displayed only after being fully recorded and verified by management. No returns are guaranteed; historical data does not guarantee future performance.

Core pillars:
• Global market research and major currency pair analysis
• Robust risk management framework and clear exposure limits
• Periodic reporting available for community review`,
  CRYPTO: `The CRYPTO vertical drives BIX utility within the BIXLINK ecosystem: staking, BIX PAY, boosters, and internal conversions tracked seamlessly on the app ledger.

BIXLINK maintains a strict separation between internal BIX ledger records and on-chain tokens. The planned issuance of the BIX token with a fixed supply of 21,000,000 on BNB Chain is an independent process signed directly from the owner's wallet, with the platform never holding private keys.

Core pillars:
• BIX utility across staking, transfers, and boosters
• Non-custodial architecture and transparent transaction records
• Fixed-supply smart contract deployment preparation on BNB Chain`,
  RWA: `Real-World Assets (RWA) represent BIXLINK's vision to connect tangible economic value with the digital ecosystem. Scope includes verifiable real estate, commodities, and productive enterprises.

Prior to integrating any asset, rigorous ownership verification, independent appraisal, and regulatory compliance are required. In this phase, RWA represents a development roadmap, not currently owned or pledged assets.

Core pillars:
• Phased curation and verification of real-world assets
• Comprehensive legal and regulatory compliance framework prior to onboarding
• Transparent public reporting on asset status`,
  ADVERTISING: `BIXLINK deploys promotional placements across its app, web portal, and community channels as an ecosystem value generator. Web3 partners, merchants, and community initiatives can reach targeted BIXLINK members.

Revenues from this vertical are recognized only after being fully recorded and reviewed. Future roadmaps allocate a portion of advertising value toward ecosystem sustainability and community initiatives.

Core pillars:
• Ad placements across application, web, and community channels
• Web3 merchant and sponsorship partnerships
• Transparent, auditable revenue reporting`,
  MARKETPLACE: `The BIXLINK Marketplace is designed as an ecosystem utility exchange hub: digital assets, service vouchers, merchant offerings, and community products payable via BIX PAY.

Transactions are slated to settle instantly on the internal ledger with zero gas fees, featuring seller verification and buyer protection. The Marketplace is currently in development; features will roll out progressively following testing and review.

Core pillars:
• BIX PAY settlements for merchants and members
• Verified merchant onboarding and authentic review systems
• Catalog of digital products, vouchers, and community services`,
};

export const roadmapNarratives: Record<string, string> = {
  PELUNCURAN: `The foundational phase establishes BIXLINK infrastructure: brand identity, email-verified account architecture, authentication security, and a non-custodial internal ledger.

Phase targets:
• Launch of landing portal and member dashboard
• User registration, account verification, and automated referral routing
• Core auditable internal ledger infrastructure for BIX and USDT`,
  'STAKING BETA': `The staking test phase introduces eight USDT and BIX BOOST tiers with real-time projected yields.

Phase targets:
• Staking tier validation and daily yield projection modeling
• Management-reviewed deposit and withdrawal settlement workflows
• Comprehensive transaction history for every member
Projections do not constitute guaranteed returns.`,
  'DAFTAR RWA': `This phase formalizes the real-world asset verification framework prior to any on-chain integration.

Phase targets:
• Asset curation and appraisal standards
• Legal due diligence and compliance frameworks
• Transparent public status reporting protocols for all assets`,
  EKOSISTEM: `The expansion phase scales BIX utility and community adoption: BIX PAY, internal market, BIXP mining, and Marketplace integration prep.

Phase targets:
• Instant peer-to-peer BIX member transfers
• Community incentive programs and merchant partnerships
• BIX PAY Marketplace infrastructure readiness`,
  DAO: `The governance phase establishes community-driven ecosystem decision-making powered by the Treasury DAO Reserve.

Phase targets:
• Governance proposal and voting mechanism design
• Transparent treasury management protocols
• Progressive transition toward community-led governance`,
  '21 JUTA MILESTONE': `Comprehensive ecosystem milestone review aligned with the fixed 21,000,000 BIX supply cap and halving schedule.

Phase targets:
• Tokenomics distribution and allocation audit
• Emission schedule and halving roadmap review
• Public progress and audit reporting for the community
This represents a development milestone, not a price target.`,
};

Object.assign(roadmapNarratives, { LAUNCH: roadmapNarratives['PELUNCURAN'], 'STAKING APP BETA': roadmapNarratives['STAKING BETA'], 'RWA LISTING': roadmapNarratives['DAFTAR RWA'], ECOSYSTEM: roadmapNarratives['EKOSISTEM'] });

const key = (title: string) => title.trim().toUpperCase();

/** Fill missing long details from bundled narratives; append bundled defaults absent from saved content. */
export function withNarratives(items: ContentItem[], defaults: ContentItem[], narratives: Record<string, string>): ContentItem[] {
  const titles = new Set(items.map(item => key(item.title)));
  const merged = [...items, ...defaults.filter(item => !titles.has(key(item.title)) && key(item.title) === 'MARKETPLACE')];
  return merged.map(item => item.detail?.trim() ? item : { ...item, detail: narratives[key(item.title)] ?? item.description });
}
