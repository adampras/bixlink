/** Incoming-call vibration rhythm (ms on/off), repeated every VIBE_EVERY_MS while ringing — runs even when the ringtone is muted. */
export const INCOMING_VIBE = [700, 300, 700, 300, 250, 150, 250];
export const VIBE_EVERY_MS = 3200;

export type Route = 'speaker' | 'ear';
export type Tilt = 'flat' | 'upright' | 'between';

/** Phone tilt from DeviceOrientation: lying flat / held in front of the face vs. held up to the ear. */
export function tiltOf(beta: number | null, gamma: number | null): Tilt {
  if (beta == null || gamma == null) return 'between';
  const b = Math.abs(beta), g = Math.abs(gamma);
  if (b < 28 && g < 28) return 'flat';
  if (b > 55 || g > 60) return 'upright';
  return 'between';
}

/** Audio route: any video in the call → loudspeaker; voice call follows the phone position (flat = speaker, at the ear = earpiece). */
export function pickRoute(o: { video: boolean; tilt: Tilt; current: Route }): Route {
  if (o.video) return 'speaker';
  if (o.tilt === 'flat') return 'speaker';
  if (o.tilt === 'upright') return 'ear';
  return o.current;
}
