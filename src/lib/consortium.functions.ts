import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

/** Verifies the private consortium PIN server-side and only when the owner switch is ON. */
export const unlockConsortium = createServerFn({ method: 'POST' })
  .inputValidator((i) => z.object({ pin: z.string().min(4).max(12) }).parse(i))
  .handler(async ({ data }) => {
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
    const { data: row } = await sb.from('app_settings').select('value').eq('key', 'readiness').maybeSingle();
    const value = (row?.value ?? {}) as { consortiumVaultEnabled?: boolean; consortiumPin?: string };
    if (!value.consortiumVaultEnabled) return { ok: false, reason: 'closed' as const };
    const pin = value.consortiumPin || '882026';
    return data.pin === pin ? { ok: true as const } : { ok: false, reason: 'pin' as const };
  });
