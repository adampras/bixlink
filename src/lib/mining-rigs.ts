import { supabase } from '@/integrations/supabase/client';

export type MiningRig = { id: string; name: string; hashrate_th: number; price_usd: number; quota: number; reserved: number; note: string; enabled: boolean; sort: number };

export async function fetchRigs(): Promise<MiningRig[]> {
  const { data, error } = await supabase.from('bix_mining_rigs').select('*').order('sort');
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, hashrate_th: Number(r.hashrate_th), price_usd: Number(r.price_usd) }));
}

export async function fetchBixPrice(): Promise<number> {
  const { data } = await supabase.from('app_settings').select('value').eq('key', 'bix_market').maybeSingle();
  const p = Number((data?.value as { priceUsd?: number } | null)?.priceUsd);
  return p > 0 ? p : 0.84291;
}
