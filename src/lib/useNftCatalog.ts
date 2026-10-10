import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalogSchema, DEFAULT_NFT_CATALOG } from '@/lib/nft-catalog';
export function useNftCatalog() { return useQuery({ queryKey: ['nft-catalog'], queryFn: async () => {
 const { data, error } = await supabase.from('app_settings').select('value').eq('key','nft_catalog').maybeSingle();
 if (error) throw error;
 if (!data) return DEFAULT_NFT_CATALOG;
 const parsed = catalogSchema.safeParse(data.value); if (!parsed.success) throw new Error('NFT catalog unavailable');
 return parsed.data.items;
}, refetchInterval: 15000 }); }
