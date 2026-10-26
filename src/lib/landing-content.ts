export type ContentItem = { title: string; description: string; image?: string; enabled?: boolean; quarter?: string; detail?: string; detailImage?: string; size?: 'sm' | 'md' | 'lg'; pageWidth?: 'narrow' | 'normal' | 'wide'; pageOpen?: boolean; percent?: number; url?: string };
export const POPUP_PLACEMENTS = ['home', 'presale', 'wallet', 'dashboard'] as const;
export type PopupPlacement = typeof POPUP_PLACEMENTS[number];
export type PopupItem = { title: string; description: string; image?: string | undefined; enabled?: boolean; placement: PopupPlacement; ctaLabel?: string | undefined; url?: string | undefined };
export const popupPlacementForPath = (path: string, signedIn: boolean): PopupPlacement | null =>
  path === '/' ? (signedIn ? 'dashboard' : 'home') : path === '/presale' ? 'presale' : path === '/wallet' ? 'wallet' : null;
export type LandingContent = { ecosystem: ContentItem[]; income: ContentItem[]; spaces?: ContentItem[]; roadmap?: ContentItem[]; narrative?: ContentItem[]; tokenomics?: ContentItem[]; tokenomicsEnabled?: boolean; narrativeTitle?: string; narrativeIntro?: string; narrativeEnabled?: boolean; hero3dEnabled?: boolean; heroImage?: string | undefined; sponsor?: ContentItem; popups?: PopupItem[] };
export const defaultTokenomics: ContentItem[] = [['Staking ecosystem', 40], ['RWA treasury', 25], ['Liquidity plan', 20], ['Community & operations', 15]].map(([title, percent]) => ({ title: String(title), percent: Number(percent), description: '', enabled: true }));
export const contentGroups = ['ecosystem', 'income', 'spaces', 'roadmap', 'narrative', 'tokenomics'] as const;
export type ContentGroup = typeof contentGroups[number];
export const sizeSpan = (item: ContentItem) => item.size === 'lg' ? 'col-span-2' : '';
export const hasPage = (item: ContentItem) => item.pageOpen !== false && Boolean(item.detail?.trim() || item.detailImage);
export const defaultSpaces: ContentItem[] = [
  ['FOREX', 'Foreign exchange research plan for BIXLINK diversification. Results are displayed only after being recorded and reviewed.'],
  ['CRYPTO', 'Digital utility development and crypto research. Internal BIX records are separate from trading and on-chain tokens.'],
  ['RWA', 'Transparent real-world asset reporting framework. Asset verification and legal compliance are required prior to integration.'],
  ['ADVERTISING', 'Promotional space plan across the app, website, and community. Revenue is displayed only after being recorded and reviewed.'],
  ['MARKETPLACE', 'Planned hub for products, vouchers, and merchant services via BIX PAY. Phased release following testing.'],
].map(([title, description]) => ({ title: title ?? '', description: description ?? '', enabled: true, size: 'md' }));
export const defaultRoadmap: ContentItem[] = [
  ['Q1 2026', 'Launch', 'Establishing BIXLINK identity and account access.'],
  ['Q2 2026', 'Staking Beta', 'Testing staking and internal records.'],
  ['Q3 2026', 'RWA Listing', 'Structuring the asset verification framework.'],
  ['Q4 2026', 'Ecosystem', 'Expanding utility and community.'],
  ['Q1 2027', 'DAO', 'Designing community governance.'],
  ['Q2 2027', '21 Million Milestone', 'Reviewing ecosystem progress with the planned 21 million BIX supply, not a price target.'],
].map(([quarter, title, description]) => ({ quarter: quarter ?? '', title: title ?? '', description: description ?? '', enabled: true, size: 'md' }));
export const defaultNarrative: ContentItem[] = [
  { title: 'Internal BIX records', description: 'BIX balances and member transfers are recorded inside the application. On-chain token deployment remains a separate step.', enabled: true },
  { title: 'Community connections', description: 'Explore referral relationships and follow published project updates as the BIXLINK community develops.', enabled: true },
  { title: 'Ecosystem roadmap', description: 'Follow the planned development of digital utilities and real-world asset reporting. Planned milestones are not guarantees of delivery.', enabled: true },
];
export const defaultNarrativeTitle = 'The BIXLINK Ecosystem';
export const defaultNarrativeIntro = 'BIXLINK brings internal BIX activity, community connections and ecosystem updates into one experience.';
export const defaultLandingContent: LandingContent = {
  narrative: defaultNarrative,
  narrativeTitle: defaultNarrativeTitle,
  narrativeIntro: defaultNarrativeIntro,
  narrativeEnabled: true,
  ecosystem: [
    { title: 'BIX Staking', description: 'Structured lock periods and owner-reviewed reward records across eight staking tiers.' },
    { title: 'BIX PAY', description: 'Internal member-to-member BIX utility with account-level transaction records.' },
    { title: 'RWA Roadmap', description: 'A planned framework for reporting verified real-world income categories transparently.' },
  ],
  income: [
    { title: 'Recorded operations', description: 'Owner-entered income sources are displayed only after they are recorded in the system.' },
    { title: 'Ecosystem utility', description: 'BIX utilities are developed as internal product functions, not represented as external market activity.' },
    { title: 'Transparent review', description: 'Staking, swaps, and withdrawals retain reviewable records and clear status disclosures.' },
  ],
  spaces: defaultSpaces,
  roadmap: defaultRoadmap,
};
