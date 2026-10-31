import { describe, expect, it } from 'vitest';
import { giftInfo, isMegaGift } from '@/components/BixtokLiveRoom';

describe('BIXTOK gift effects', () => {
  it('reads emoji, amount and currency from a gift message', () => {
    expect(giftInfo('🦊 sent Fox · 50 BIX')).toEqual({ emoji: '🦊', amount: 50, currency: 'BIX' });
  });
  it('shows the full-screen effect from 10 BIX', () => {
    expect(isMegaGift('🚀 sent Rocket · 10 BIX')).toBe(true);
    expect(isMegaGift('🌹 sent Rose · 9 BIX')).toBe(false);
  });
  it('shows the full-screen effect from 100 BIXP', () => {
    expect(isMegaGift('👑 sent Crown · 100 BIXP')).toBe(true);
    expect(isMegaGift('🌹 sent Rose · 99 BIXP')).toBe(false);
  });
});
