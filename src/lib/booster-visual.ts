export const BOOSTER_VIDEOS = ['reactor', 'video', 'orbital', 'crystal'] as const;
export type BoosterVisual = typeof BOOSTER_VIDEOS[number];
export function resolveBoosterVisual(value: unknown): BoosterVisual {
  return value === 'reactor' || value === 'orbital' || value === 'crystal' ? value : 'video';
}
export const SPLASH_DURATION_MS = 500;