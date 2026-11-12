/** BIX CALL light/dark/auto mode, stored on this phone; sets html[data-bc-theme] which CSS scopes to BIX CALL. */
const K = 'bixcall-ui-theme';
export const getBcTheme = () => { try { return localStorage.getItem(K) || 'dark'; } catch { return 'dark'; } };
export function applyBcTheme(): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  const set = () => { const m = getBcTheme(); document.documentElement.dataset['bcTheme'] = m === 'auto' ? (mq.matches ? 'light' : 'dark') : m; };
  set(); mq.addEventListener('change', set); window.addEventListener('bix-bc-theme', set);
  return () => { mq.removeEventListener('change', set); window.removeEventListener('bix-bc-theme', set); delete document.documentElement.dataset['bcTheme']; };
}
export const setBcTheme = (m: string) => { try { localStorage.setItem(K, m); } catch { /* ignore */ } window.dispatchEvent(new Event('bix-bc-theme')); };
