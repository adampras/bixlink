/** Presentation only: never alters a transaction or its authorization. */
export const touchEffectsEnabled = (settings?: { touchEffectsEnabled?: boolean }, reducedMotion = false) => settings?.touchEffectsEnabled !== false && !reducedMotion;

export function clampChatPosition(x: number, y: number, width: number, height: number) {
  return {
    x: Math.max(12, Math.min(x, Math.max(12, width - 64))),
    y: Math.max(80, Math.min(y, Math.max(80, height - 164))),
  };
}

export function revealStakingHistory(element: HTMLElement | null) {
  if (!element) return;
  element.focus({ preventScroll: true });
  element.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
}