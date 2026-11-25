import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { dispatchLocationSchema } from './bixgo-dispatch';

export const updateDispatchLocation = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => dispatchLocationSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc('bixgo_dispatch_location', { p_lat: data.lat, p_lng: data.lng, p_accuracy: data.accuracy });
    if (error) throw new Error(error.message);
    return { ok: true };
  });