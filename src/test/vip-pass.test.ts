import { describe, it, expect } from 'vitest';
import { vipPassStatus } from '@/components/VaultFacility';

describe('Black Titanium VIP Pass unlock', () => {
  it('stays locked below $500 and shows remaining', () => expect(vipPassStatus(200)).toMatchObject({ unlocked: false, remaining: 300 }));
  it('unlocks automatically at exactly $500', () => expect(vipPassStatus(500).unlocked).toBe(true));
});
