import { describe, expect, it } from 'vitest';
import { BOOSTER_VIDEOS, resolveBoosterVisual, SPLASH_DURATION_MS } from '@/lib/booster-visual';
describe('Booster video and splash rules', () => {
  it('offers video choices without image mascots', () => {
    expect(BOOSTER_VIDEOS).toEqual(['reactor', 'video', 'orbital', 'crystal', 'rocket']);
    expect(resolveBoosterVisual('fox')).toBe('video');
    expect(resolveBoosterVisual('emblem')).toBe('video');
    expect(resolveBoosterVisual('reactor')).toBe('reactor');
    expect(resolveBoosterVisual('orbital')).toBe('orbital');
    expect(resolveBoosterVisual('crystal')).toBe('crystal');
  });
  it('preserves the additional presale rocket selection shared by BOOST and landing', () => {
    expect(resolveBoosterVisual('rocket')).toBe('rocket');
  });
  it('uses exactly half a second for splash', () => {
    expect(SPLASH_DURATION_MS).toBe(500);
  });
});