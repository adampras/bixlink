import { describe, it, expect } from 'vitest';
import { gasFeeBix, careNext } from './bixcare';

describe('BIXCARE gas fee', () => {
  it('car wash Rp50.000 at 3% costs 0.1875 BIX', () => { expect(gasFeeBix(50000, 'wash')).toBe(0.1875); });
  it('rental Rp1.000.000 at 2% costs 2.5 BIX', () => { expect(gasFeeBix(1000000, 'rent')).toBe(2.5); });
  it('buyer can only cancel while pending', () => { expect(careNext('accepted', 'buyer')).toEqual([]); expect(careNext('pending', 'buyer')).toEqual(['cancelled']); });
});
