import { supabase } from '@/integrations/supabase/client';

/** BIX CALL colour model chosen by the owner (bixtok_config.features.call_theme, legacy call_matcha). Applied as a body attribute so the call screen matches anywhere. */
export type BixCallTheme = 'default' | 'matcha' | 'toska';
const KEY = 'bixcall-theme';
export function resolveBixCallTheme(f: Record<string, unknown> | null | undefined): BixCallTheme {
  const t = f?.['call_theme'];
  if (t === 'toska' || t === 'matcha' || t === 'default') return t;
  return f?.['call_matcha'] === true ? 'matcha' : 'toska';
}
export const applyBixCallTheme = (t: BixCallTheme) => {
  if (typeof document === 'undefined') return;
  if (t === 'default') delete document.body.dataset['bcTheme']; else document.body.dataset['bcTheme'] = t;
  try { localStorage.setItem(KEY, t); } catch { /* ignore */ }
};
let loaded = false;
export function syncBixCallTheme() {
  try { const s = localStorage.getItem(KEY); if (s === 'default') delete document.body.dataset['bcTheme']; else document.body.dataset['bcTheme'] = s === 'matcha' ? 'matcha' : 'toska'; } catch { /* ignore */ }
  if (loaded) return; loaded = true;
  void supabase.from('bixtok_config').select('features').eq('id', 1).maybeSingle().then(({ data }) => {
    applyBixCallTheme(resolveBixCallTheme((data as { features?: Record<string, unknown> } | null)?.features));
  });
}
