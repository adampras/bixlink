import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { SNAPSHOT_KEYS, PUBLIC_SNAPSHOT_KEYS } from '@/lib/site-control';

// Owner-only switch. When staging turns ON the current public settings are
// frozen into a snapshot that non-admins keep seeing; turning it OFF publishes.
export const saveSiteControl = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: { maintenance: boolean; staging: boolean; message?: string }) => z.object({ maintenance: z.boolean(), staging: z.boolean(), message: z.string().trim().max(240).optional() }).strict().parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: admin, error } = await sb.rpc('is_bix_admin');
    if (error || !admin) throw new Error('Owner access required');
    const prev = await sb.from('app_settings').select('value').eq('key', 'site_control').maybeSingle();
    const before = (prev.data?.value ?? {}) as { staging?: boolean; publicSnapshot?: Record<string, unknown> };
    let publicSnapshot = before.staging ? before.publicSnapshot ?? {} : {};
    if (data.staging && !before.staging) {
      const rows = await sb.from('app_settings').select('key,value').in('key', [...SNAPSHOT_KEYS]);
      if (rows.error) throw rows.error;
      const snap = Object.fromEntries((rows.data ?? []).map((r: any) => [r.key, r.value]));
      publicSnapshot = Object.fromEntries(PUBLIC_SNAPSHOT_KEYS.filter(k => k in snap).map(k => [k, snap[k]]));
      const s = await sb.from('app_settings').upsert({ key: 'site_snapshot', value: snap });
      if (s.error) throw s.error;
    }
    const value = { maintenance: data.maintenance, staging: data.staging, message: data.message ?? '', publicSnapshot: data.staging ? publicSnapshot : {} };
    const r = await sb.from('app_settings').upsert({ key: 'site_control', value });
    if (r.error) throw r.error;
    return { ok: true };
  });
