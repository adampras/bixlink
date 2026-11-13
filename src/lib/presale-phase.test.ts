import { describe, it, expect } from 'vitest';
import { bixFor, clampUsd, PHASE1, phaseState } from './presale-phase';
import { presaleReleased } from './presale';
describe('presale phase 1', () => {
  it('$500 at $0.25 gives 2,000 BIX', () => expect(bixFor(500)).toBe(2000));
  it('limits amount to $100–$1,000', () => { expect(clampUsd(50)).toBe(100); expect(clampUsd(5000)).toBe(1000); });
  it('vests 1% per day over 100 days', () => expect(presaleReleased(2000, PHASE1.vestingDays, 0, 864e5)).toBeCloseTo(20));
  it('opens at midnight WIB on 14 Nov 2026', () => { expect(phaseState(Date.parse('2026-11-13T16:59:59Z'))).toBe('upcoming'); expect(phaseState(Date.parse('2026-11-13T17:00:00Z'))).toBe('live'); });
});
