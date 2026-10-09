export const PRESENTATION_THEMES = ['original', 'emerald', 'graphite', 'royal', 'glass', 'future'] as const;
export type PresentationTheme = typeof PRESENTATION_THEMES[number];
export function resolvePresentationTheme(value: unknown): PresentationTheme {
  return value === 'emerald' || value === 'graphite' || value === 'royal' || value === 'glass' || value === 'future' ? value : 'original';
}