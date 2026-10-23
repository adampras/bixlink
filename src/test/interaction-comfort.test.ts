import { describe, expect, it } from 'vitest';
import { clampChatPosition, touchEffectsEnabled } from '@/lib/interaction-comfort';

describe('interaction comfort', () => {
  it('owner can turn touch feedback off', () => expect(touchEffectsEnabled({ touchEffectsEnabled: false })).toBe(false));
  it('owner can turn touch feedback on', () => expect(touchEffectsEnabled({ touchEffectsEnabled: true })).toBe(true));
  it('respects reduced motion even when enabled', () => expect(touchEffectsEnabled({ touchEffectsEnabled: true }, true)).toBe(false));
  it('keeps chat above bottom navigation on a phone', () => expect(clampChatPosition(999, 999, 390, 844)).toEqual({ x: 326, y: 680 }));
  it('keeps chat inside the top and left edges', () => expect(clampChatPosition(-20, -20, 390, 844)).toEqual({ x: 12, y: 80 }));
});