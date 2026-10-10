import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { catalogSchema, type CatalogItem } from '@/lib/nft-catalog';
export const saveNftCatalog = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
.inputValidator((d: { items: CatalogItem[] }) => catalogSchema.refine(c => c.items.every(i => i.theme === 'REACTOR'), 'Only reactor artwork is supported').parse(d))
.handler(async ({ context, data }) => {
 const owner = await context.supabase.rpc('is_bix_admin');
 if (owner.error || !owner.data) throw new Error('Owner access required');
 const { error } = await context.supabase.from('app_settings').upsert({ key: 'nft_catalog', value: data });
 if (error) throw new Error(error.message);
 return { ok: true };
});
