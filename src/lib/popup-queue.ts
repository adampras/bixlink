/** Tiny shared flag so the install invitation waits while the welcome reward dialog is on screen. */
let welcomeActive = false;
const EVT = 'bix-welcome-done';
export function setWelcomeActive(v: boolean) {
  welcomeActive = v;
  if (!v && typeof window !== 'undefined') window.dispatchEvent(new Event(EVT));
}
export const isWelcomeActive = () => welcomeActive;
export function onWelcomeDone(cb: () => void) {
  window.addEventListener(EVT, cb, { once: true });
  return () => window.removeEventListener(EVT, cb);
}
