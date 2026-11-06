import { describe, expect, it } from 'vitest';
import { goldPackageUsd, readBixGold } from './bix-gold';

describe('BIX GOLD', () => {
  it('prices a package as grams × USD per gram', () => { expect(goldPackageUsd(5, { priceUsdPerGram: 80 })).toBe(400); });
  it('starts with 10 generation levels at 0% until the owner sets them', () => { const s = readBixGold(undefined); expect(s.levels).toHaveLength(10); expect(s.levels.every(l => l === 0)).toBe(true); });
});
