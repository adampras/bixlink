import s1 from '@/assets/cards/stk-001.jpg.asset.json';
import s2 from '@/assets/cards/stk-002.jpg.asset.json';
import s3 from '@/assets/cards/stk-003.jpg.asset.json';
import s4 from '@/assets/cards/stk-004.jpg.asset.json';
import s5 from '@/assets/cards/stk-005.jpg.asset.json';
import s6 from '@/assets/cards/stk-006.jpg.asset.json';
import s7 from '@/assets/cards/stk-007.jpg.asset.json';
import s8 from '@/assets/cards/stk-008.jpg.asset.json';
import s9 from '@/assets/cards/stk-009.jpg.asset.json';
import s10 from '@/assets/cards/stk-010.jpg.asset.json';

/** STK voucher NFT series — one card per staking package, ordered by package value. */
export const STK_CARDS = [
  { name: 'STK-001 Standard', url: s1.url },
  { name: 'STK-002 Bronze', url: s2.url },
  { name: 'STK-003 Silver', url: s3.url },
  { name: 'STK-004 Gold', url: s4.url },
  { name: 'STK-005 Platinum', url: s5.url },
  { name: 'STK-006 Diamond', url: s6.url },
  { name: 'STK-007 Emerald', url: s7.url },
  { name: 'STK-008 Ruby', url: s8.url },
  { name: 'STK-009 Elite', url: s9.url },
  { name: 'STK-010 Super Premium', url: s10.url },
] as const;
export const PACKAGE_CARDS: Record<string, { name: string; url: string }> = {
  SEED: STK_CARDS[0], SPARK: STK_CARDS[1], EXPLORER: STK_CARDS[2], PIONEER: STK_CARDS[3], BUILDER: STK_CARDS[4],
  GUARDIAN: STK_CARDS[5], TITAN: STK_CARDS[6], PLATINUM: STK_CARDS[7], LEGEND: STK_CARDS[8],
};
/** Packages without a named card (clones, custom) get the STK card matching their value. */
const STEPS = [10, 30, 100, 500, 1000, 3000, 5000, 7000, 10000, 10001];
export const stkCardFor = (usd: number) => STK_CARDS[Math.max(0, STEPS.filter(v => usd >= v).length - 1)];
export const packageCard = (id?: string | null, usd?: number) => (id && PACKAGE_CARDS[id.toUpperCase()]) || (usd != null ? stkCardFor(usd) : undefined);
