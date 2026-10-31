import { describe, expect, it } from 'vitest';
import { BIXTRADE_DEFAULTS, checkBixtradeRequest, withdrawNet } from '@/lib/bixtrade';
const s = { ...BIXTRADE_DEFAULTS, enabled: true };
describe('bixtrade requests', () => {
  it('rejects deposit below min allocation', () => expect(checkBixtradeRequest(s, 'deposit', 50)).not.toBeNull());
  it('accepts deposit in range', () => expect(checkBixtradeRequest(s, 'deposit', 500)).toBeNull());
  it('blocks deposit when paused', () => expect(checkBixtradeRequest({ ...s, depositOpen: false }, 'deposit', 500)).not.toBeNull());
  it('rejects withdraw below minimum', () => expect(checkBixtradeRequest(s, 'withdraw', 10)).not.toBeNull());
  it('applies withdraw fee', () => expect(withdrawNet({ ...s, withdrawFeePct: 2 }, 100)).toBe(98));
});
