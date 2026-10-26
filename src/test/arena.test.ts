import { describe, expect, it } from 'vitest';
import { arenaRewardsMatch, denTier, questPayout, welcomeReward } from '@/lib/arena';

describe('Fox Arena rules', () => {
  it('uses the 100 BIXP welcome default only when no owner reward exists', () => {
    expect(welcomeReward({ checkin: 10 })).toBe(100);
    expect(welcomeReward({ welcome: 25 })).toBe(25);
    expect(welcomeReward({ welcome: 0 })).toBe(0);
  });
  it('confirms the exact edited reward after saving', () => { expect(arenaRewardsMatch({ rewards: { checkin: 15 } }, { rewards: { checkin: 15 } })).toBe(true); expect(arenaRewardsMatch({ rewards: { checkin: 15 } }, { rewards: { checkin: 10 } })).toBe(false); });
  it('pays the full reward under the 100 vBIX cap', () => { expect(questPayout(5, 40, 0)).toBe(5); });
  it('shares the 100 vBIX cap with mining', () => { expect(questPayout(5, 98, 0)).toBe(2); });
  it('pays nothing once the account reaches 100 vBIX', () => { expect(questPayout(5, 100, 0)).toBe(0); });
  it('never exceeds the 1,000,000 pool', () => { expect(questPayout(5, 0, 999_999)).toBe(1); });
  it('Fox Den tier comes from real progress', () => {
    expect(denTier({ streak: 0, mining: false, hasStake: false }).name).toBe('Bronze');
    expect(denTier({ streak: 30, mining: true, hasStake: true }).name).toBe('Royal Jade');
  });
});
