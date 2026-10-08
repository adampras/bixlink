import { describe, expect, it } from 'vitest';
import { PRESENTATION_THEMES, resolvePresentationTheme } from '@/lib/presentation-theme';

describe('Owner-selected presentation themes', () => {
  it('resolves every supported theme without changing existing selections', () => {
    for (const theme of PRESENTATION_THEMES) expect(resolvePresentationTheme(theme)).toBe(theme);
  });
  it('falls back safely for unknown settings', () => {
    expect(resolvePresentationTheme('unknown')).toBe('original');
    expect(resolvePresentationTheme(undefined)).toBe('original');
  });
  it('supports the additional clear-glass model without retiring existing themes', () => {
    expect(PRESENTATION_THEMES).toEqual(['original', 'emerald', 'graphite', 'royal', 'glass']);
    expect(resolvePresentationTheme('glass')).toBe('glass');
  });
});