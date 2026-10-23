import { STK_CARDS } from '@/lib/package-cards';

/** Packages above $10,000 use the top STK-010 Super Premium voucher card. */
export const valueCard = (usd: number) => (usd > 10000 ? STK_CARDS[9] : undefined);
