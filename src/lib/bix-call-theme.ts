import { supabase } from '@/integrations/supabase/client';

/** BIX CALL colour model chosen by the owner (bixtok_config.features.call_matcha). Applied as a body attribute so the call screen matches anywhere. */
const KEY = 'bixcall-theme';
const apply = (on: boolean) => { if (typeof document === 'undefined') return; if (on) document.body.dataset['bcTheme'] = 'matcha'; else delete document.body.dataset['bcTheme']; };
let loaded = false;
export function syncBixCallTheme() {
  try { apply(localStorage.getItem(KEY) === 'matcha'); } catch { /* ignore */ }
  if (loaded) return; loaded = true;
  void supabase.from('bixtok_config').select('features').eq('id', 1).maybeSingle().then(({ data }) => {
    const on = (data as { features?: Record<string, boolean> } | null)?.features?.['call_matcha'] === true;
    apply(on); try { localStorage.setItem(KEY, on ? 'matcha' : 'default'); } catch { /* ignore */ }
  });
}
