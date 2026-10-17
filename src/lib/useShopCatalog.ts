import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { shopSchema, DEFAULT_PRODUCTS } from '@/lib/shop';
export function useShopCatalog(){return useQuery({queryKey:['shop-catalog'],queryFn:async()=>{
 const {data,error}=await supabase.from('app_settings').select('value').eq('key','merchandise_catalog').maybeSingle();
 if(error)throw error;
 if(!data)return DEFAULT_PRODUCTS;
 return shopSchema.parse(data.value).items;
},refetchInterval:15000});}
export function useShopPromo(){return useQuery({queryKey:['shop-promo'],queryFn:async()=>{const {data}=await supabase.from('app_settings').select('value').eq('key','merchandise_catalog').maybeSingle();const r=data?shopSchema.safeParse(data.value):null;return r?.success?r.data.promo??null:null;}});}