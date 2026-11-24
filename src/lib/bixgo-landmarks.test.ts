import { describe, expect, it } from 'vitest';
import { landmarksFor } from './bixgo-landmarks';

describe('landmarksFor', () => {
  it('keeps Mataram landmarks for Mataram', () => { expect(landmarksFor('mataram').some(l => l.name === 'Mataram Mall')).toBe(true); });
  it('never shows Mataram landmarks in another city', () => { expect(landmarksFor('kupang').some(l => l.name.includes('Mataram'))).toBe(false); });
  it('gives uncurated cities their own center pin', () => { expect(landmarksFor('kupang')[0]?.name).toBe('Pusat Kota Kupang'); });
});
