import { describe, expect, it } from 'vitest';
import { pickRoute, tiltOf } from './bix-call-route';

describe('BIX CALL auto loudspeaker', () => {
  it('switches to loudspeaker as soon as video is on', () => {
    expect(pickRoute({ video: true, tilt: 'upright', current: 'ear' })).toBe('speaker');
  });
  it('moves voice calls to loudspeaker when the phone is taken away from the ear (laid flat)', () => {
    expect(pickRoute({ video: false, tilt: tiltOf(5, 3), current: 'ear' })).toBe('speaker');
  });
  it('returns to the earpiece when the phone is raised to the ear', () => {
    expect(pickRoute({ video: false, tilt: tiltOf(80, 10), current: 'speaker' })).toBe('ear');
  });
  it('keeps the current route while the phone is in between', () => {
    expect(pickRoute({ video: false, tilt: tiltOf(40, 10), current: 'speaker' })).toBe('speaker');
  });
});
