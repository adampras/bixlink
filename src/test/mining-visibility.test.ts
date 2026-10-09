import { describe, expect, it } from 'vitest';
import { isMiningVisible, miningVisibilitySchema } from '@/lib/mining-visibility';
describe('Owner mining visibility', () => {
  it('Tutup hides HOME mining', () => { expect(isMiningVisible(miningVisibilitySchema.parse({ visible: false }))).toBe(false); });
  it('Buka shows HOME mining', () => { expect(isMiningVisible(miningVisibilitySchema.parse({ visible: true }))).toBe(true); });
  it('preserves existing visibility', () => { expect(isMiningVisible(undefined)).toBe(true); });
});
