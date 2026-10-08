import { describe, expect, it } from 'vitest';
import { canReviewerEditSetting, reviewerDepositWallet, reviewerWalletSchema } from '@/lib/reviewer-policy';

describe('Owner 2 scope', () => {
  it('allows Market and Referral only, not other owner settings', () => {
    expect(canReviewerEditSetting('bix_market')).toBe(true);
    expect(canReviewerEditSetting('referrals')).toBe(true);
    for (const key of ['wallet', 'swap', 'booster', 'readiness', 'bix_pay', 'bix_token', 'landing_content', 'deposit_wallets']) expect(canReviewerEditSetting(key)).toBe(false);
  });
  it('returns only WLT-01 even when another wallet is first', () => {
    const wallets = [{ code: 'WLT-02' }, { code: 'WLT-01' }, { code: 'WLT-03' }];
    expect(reviewerDepositWallet(wallets)).toEqual({ code: 'WLT-01' });
    expect(reviewerDepositWallet([{ code: 'WLT-02' }])).toBeNull();
  });
  it('rejects changes to any wallet other than WLT-01', () => {
    const wallet = { code: 'WLT-01', label: '', network: 'BEP20', address: '', enabled: false };
    expect(reviewerWalletSchema.safeParse(wallet).success).toBe(true);
    expect(reviewerWalletSchema.safeParse({ ...wallet, code: 'WLT-02' }).success).toBe(false);
    expect(reviewerWalletSchema.safeParse({ ...wallet, enabled: true }).success).toBe(false);
  });
});