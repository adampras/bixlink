export type ContentItem = { title: string; description: string; image?: string; enabled?: boolean; quarter?: string };
export type LandingContent = { ecosystem: ContentItem[]; income: ContentItem[]; spaces?: ContentItem[]; roadmap?: ContentItem[]; narrative?: ContentItem[]; narrativeTitle?: string; narrativeIntro?: string; narrativeEnabled?: boolean };
export const defaultSpaces: ContentItem[] = ['FOREX', 'CRYPTO', 'RWA', 'ADVERTISING'].map(title => ({ title, description: 'Planned income category', enabled: true }));
export const defaultRoadmap: ContentItem[] = ([['Q1 2026','Launch'],['Q2 2026','Staking App Beta'],['Q3 2026','RWA Listing'],['Q4 2026','Ecosystem'],['Q1 2027','DAO'],['Q2 2027','21 JUTA MILESTONE']] as [string, string][]).map(([quarter, title]) => ({ quarter, title, description: '', enabled: true }));
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