export const PRESENTATION_THEMES = ['original', 'emerald', 'graphite'] as const;
export type PresentationTheme = typeof PRESENTATION_THEMES[number];
export function resolvePresentationTheme(value: unknown): PresentationTheme {
  return value === 'emerald' || value === 'graphite' ? value : 'original';
}