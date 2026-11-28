import { describe, expect, it } from 'vitest';
import { activeBonusAccess } from './leader-bonus-control';

describe('focused sponsored bonus control', () => {
  it('opens only active bonuses, not full account access', () => {
    expect(activeBonusAccess(true)).toBe('active_bonus');
  });
  it('restores target rules when switched off', () => {
    expect(activeBonusAccess(false)).toBe('normal');
  });
});