import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const nativePushStatus = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({ configured: Boolean(process.env['FIREBASE_MESSAGING_API_KEY'] && process.env['LOVABLE_API_KEY']) }));

export const registerNativeDevice = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ installationId: z.uuid(), token: z.string().min(20).max(4096), platform: z.enum(['android', 'ios']) }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from('bix_native_devices').upsert({
      user_id: context.userId, installation_id: data.installationId, token: data.token,
      platform: data.platform, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,installation_id' });
    if (error) throw new Error('Device registration failed');
    return { registered: true };
  });

export const removeNativeDevice = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ installationId: z.uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from('bix_native_devices').delete().eq('user_id', context.userId).eq('installation_id', data.installationId);
    if (error) throw new Error('Device removal failed');
    return { removed: true };
  });