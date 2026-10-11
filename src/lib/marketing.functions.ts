import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import type { Json } from '@/integrations/supabase/types';
import { marketingSchema } from './marketing';
export const saveMarketing = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth]).inputValidator(input => marketingSchema.parse(input)).handler(async ({ context, data }) => {
  const role = await context.supabase.rpc('is_bix_admin');
  if (role.error || role.data !== true) throw new Error('Owner access required');
  const result = await context.supabase.from('app_settings').upsert({ key: 'marketing_plan', value: data as unknown as Json }).select('value').single();
  if (result.error) throw new Error('Could not save marketing plan');
  return marketingSchema.parse(result.data.value);
});