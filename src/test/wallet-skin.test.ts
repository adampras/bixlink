import { describe, expect, it } from 'vitest';
import { pickWalletSkin } from '@/lib/wallet-skin';

const DAY = 86_400_000;
describe('wallet skin rotation', () => {
  it('one active color never changes', () => {
    expect(pickWalletSkin(['ruby'], 0)).toBe('ruby');
    expect(pickWalletSkin(['ruby'], 7 * DAY)).toBe('ruby');
  });
  it('five active colors change every 24h and cycle over 5 days', () => {
    const all = ['auric', 'violet', 'emerald', 'sapphire', 'ruby'];
    const seen = [0, 1, 2, 3, 4].map(d => pickWalletSkin(all, d * DAY));
    expect(new Set(seen).size).toBe(5);
    expect(pickWalletSkin(all, 5 * DAY)).toBe(seen[0]);
  });
  it('no active color uses the default', () => {
    expect(pickWalletSkin([], 0)).toBeUndefined();
  });
});
