import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

const togglesSchema = z.object({ telegram: z.boolean(), whatsapp: z.boolean(), deposit: z.boolean(), withdraw: z.boolean(), review: z.boolean() });

async function owner(context: { supabase: any }) {
  const { data, error } = await context.supabase.rpc('is_bix_admin');
  if (error || !data) throw new Error('Owner access required');
}

export const getNotifySettings = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await owner(context);
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { readToggles, channelStatus } = await import('./notify.server');
  return { toggles: await readToggles(supabaseAdmin), connected: channelStatus() };
});

export const saveNotifySettings = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => togglesSchema.parse(d))
  .handler(async ({ context, data }) => {
    await owner(context);
    const { error } = await context.supabase.from('app_settings').upsert({ key: 'notify_channels', value: data });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const testNotify = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await owner(context);
  const { sendAll } = await import('./notify.server');
  return sendAll('<b>🔔 UJI COBA NOTIFIKASI</b> · BIXLINK\nKoneksi notifikasi Admin aktif.', { telegram: true, whatsapp: true, deposit: true, withdraw: true, review: true });
});

// Called right after member/owner wallet actions so alerts arrive immediately; also runs on the deposit cron.
export const dispatchAlerts = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).handler(async () => {
  try {
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { dispatchWalletAlerts } = await import('./notify.server');
    return { sent: await dispatchWalletAlerts(supabaseAdmin) };
  } catch (e) { console.error('notify', e); return { sent: 0 }; }
});
