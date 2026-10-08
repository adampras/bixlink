export const BOOSTER_VIDEOS = ['reactor', 'video'] as const;
export type BoosterVisual = typeof BOOSTER_VIDEOS[number];
export function resolveBoosterVisual(value: unknown): BoosterVisual {
  return value === 'reactor' ? 'reactor' : 'video';
}
export const SPLASH_DURATION_MS = 500;