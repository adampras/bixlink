import { describe, expect, it } from 'vitest';
import { moduleOpen } from '@/lib/readiness';

describe('trade module switch', () => {
  it('is open by default', () => expect(moduleOpen(undefined, 'trade')).toBe(true));
  it('closes only when owner sets false', () => expect(moduleOpen({ modules: { trade: false } } as never, 'trade')).toBe(false));
});
