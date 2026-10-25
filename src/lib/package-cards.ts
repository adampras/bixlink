import s1url from '@/assets/cards/stk-001-clean.jpg';
const s1 = { url: s1url };
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
  { name: 'SEED', url: s1.url },
  { name: 'SPARK', url: s2.url },
  { name: 'EXPLORER', url: s3.url },
  { name: 'PIONEER', url: s4.url },
  { name: 'BUILDER', url: s5.url },
  { name: 'GUARDIAN', url: s6.url },
  { name: 'TITAN', url: s7.url },
  { name: 'PLATINUM', url: s8.url },
  { name: 'LEGEND', url: s9.url },
  { name: 'SUPER PREMIUM', url: s10.url },
] as const;
export const PACKAGE_CARDS: Record<string, { name: string; url: string }> = {
  SEED: STK_CARDS[0], SPARK: STK_CARDS[1], EXPLORER: STK_CARDS[2], PIONEER: STK_CARDS[3], BUILDER: STK_CARDS[4],
  GUARDIAN: STK_CARDS[5], TITAN: STK_CARDS[6], PLATINUM: STK_CARDS[7], LEGEND: STK_CARDS[8],
};
/** Packages without a named card (clones, custom) get the STK card matching their value. */
const STEPS = [10, 30, 100, 500, 1000, 3000, 5000, 7000, 10000, 10001];
export const stkCardFor = (usd: number) => STK_CARDS[Math.max(0, STEPS.filter(v => usd >= v).length - 1)];
export const packageCard = (id?: string | null, usd?: number) => (id && PACKAGE_CARDS[id.toUpperCase()]) || (usd != null ? stkCardFor(usd) : undefined);
