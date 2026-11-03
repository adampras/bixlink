import { describe, it, expect } from 'vitest';
import { agencyAmountValid, DEFAULT_AGENCY } from '@/lib/agency';
describe('agency commitment range', () => {
  it('city accepts 5000 and rejects 4999', () => { expect(agencyAmountValid(DEFAULT_AGENCY, 'city', 5000)).toBe(true); expect(agencyAmountValid(DEFAULT_AGENCY, 'city', 4999)).toBe(false); });
  it('national rejects above admin max', () => { expect(agencyAmountValid(DEFAULT_AGENCY, 'national', 100001)).toBe(false); });
});
