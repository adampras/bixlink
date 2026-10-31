import { describe, expect, it } from 'vitest';
import { clampZoom } from '@/components/BixtokLiveRoom';

describe('LIVE camera zoom shared with viewers', () => {
  it('starts from the natural frame and never zooms out past it', () => {
    expect(clampZoom(0.5)).toBe(1);
    expect(clampZoom(Number.NaN)).toBe(1);
  });
  it('caps the host zoom at 3x', () => {
    expect(clampZoom(5)).toBe(3);
    expect(clampZoom(1.6)).toBe(1.6);
  });
});
