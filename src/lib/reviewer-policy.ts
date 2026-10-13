import { z } from 'zod';

export const REVIEWER_WALLET_CODE = 'WLT-01';
export const canReviewerEditSetting = (key: string) => key === 'bix_market' || key === 'referrals';
export const reviewerWalletSchema = z.object({
  code: z.literal(REVIEWER_WALLET_CODE), label: z.string().trim().max(40),
  network: z.enum(['BEP20', 'TRC20', 'ERC20']), asset: z.enum(['USDT', 'USDC']).optional(), address: z.string().trim().max(120), enabled: z.boolean(),
}).strict().refine(w => !w.enabled || (w.network === 'TRC20' ? /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(w.address) : /^0x[0-9a-fA-F]{40}$/.test(w.address)), 'Address does not match network.');

export function reviewerDepositWallet<T extends { code: string }>(wallets: T[]): T | null {
  return wallets.find(w => w.code === REVIEWER_WALLET_CODE) ?? null;
}