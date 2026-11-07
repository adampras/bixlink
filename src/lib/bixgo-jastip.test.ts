import { describe, expect, it } from 'vitest';
import { jastipFee } from '@/components/BixgoJastip';
describe('jastip fee', () => {
  it('minimum Rp10.000', () => expect(jastipFee(50000)).toBe(10000));
  it('10% of budget above minimum', () => expect(jastipFee(300000)).toBe(30000));
});
