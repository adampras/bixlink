import { describe, expect, it } from 'vitest';
import { driverEarning, nextTier, tierFor } from './bixgo-tier';

describe('BIXGO tiers', () => {
  it('new member is Explorer', () => expect(tierFor(0).key).toBe('explorer'));
  it('$100 stake unlocks Pro Navigator with driver license', () => { expect(tierFor(100).key).toBe('pro'); expect(tierFor(100).driverLicense).toBe(true); });
  it('$99 stays Explorer', () => expect(tierFor(99).key).toBe('explorer'));
  it('$500 is Executive Club', () => expect(tierFor(500).key).toBe('executive'));
  it('$3,000 is Sovereign Fleet Node', () => expect(tierFor(3000).key).toBe('sovereign'));
  it('next tier after $150 is Executive', () => expect(nextTier(150)?.minUsd).toBe(500));
  it('driver keeps 85% of fare', () => expect(driverEarning(100)).toBe(85));
});
