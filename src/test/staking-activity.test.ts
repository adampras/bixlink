import { describe, expect, it } from 'vitest';
import { stakingUpdates } from '@/lib/staking-activity';

const stake = { id: 's1', package_id: 'STK-01', amount_usd: 10, created_at: '2026-10-29T15:00:00Z' };
describe('authoritative staking notifications', () => {
  it('keeps a pending record pending', () => {
    expect(stakingUpdates([{ ...stake, status: 'pending' }])[0]?.status).toBe('pending');
  });
  it('changes notification identity only with a recorded status', () => {
    expect(stakingUpdates([{ ...stake, status: 'completed' }])[0]?.id).toBe('stake:s1:completed');
    expect(stakingUpdates([{ ...stake, status: 'active' }])[0]?.id).toBe('stake:s1:active');
  });
});