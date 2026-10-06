export type ContentItem = { title: string; description: string; image?: string; enabled?: boolean; quarter?: string };
export type LandingContent = { ecosystem: ContentItem[]; income: ContentItem[]; spaces?: ContentItem[]; roadmap?: ContentItem[] };
export const defaultSpaces: ContentItem[] = ['FOREX', 'CRYPTO', 'RWA', 'ADVERTISING'].map(title => ({ title, description: 'Planned income category', enabled: true }));
export const defaultRoadmap: ContentItem[] = ([['Q1 2026','Launch'],['Q2 2026','Staking App Beta'],['Q3 2026','RWA Listing'],['Q4 2026','Ecosystem'],['Q1 2027','DAO'],['Q2 2027','21 JUTA MILESTONE']] as [string, string][]).map(([quarter, title]) => ({ quarter, title, description: '', enabled: true }));
export const defaultLandingContent: LandingContent = {
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