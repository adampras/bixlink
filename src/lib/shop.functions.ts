import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { shopSchema, type ShopProduct, type ShopPromo } from '@/lib/shop';
export const saveShopCatalog=createServerFn({method:'POST'}).middleware([requireSupabaseAuth]).inputValidator((d:{items:ShopProduct[];promo?:ShopPromo})=>shopSchema.parse(d)).handler(async({context,data})=>{
 const owner=await context.supabase.rpc('is_bix_admin');
 if(owner.error||!owner.data)throw new Error('Owner access required');
 const {error}=await context.supabase.from('app_settings').upsert({key:'merchandise_catalog',value:data});
 if(error)throw new Error('Could not save products');
 return {ok:true};
});