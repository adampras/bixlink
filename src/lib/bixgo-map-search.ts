import { supabase } from '@/integrations/supabase/client';
import type { Place } from '@/lib/geo';

export type CommunityPlace = Place & { communityId: string; driverNote: string };
export async function searchCommunityPlaces(query: string, near?: { lat: number; lng: number }): Promise<CommunityPlace[]> {
  const { data, error } = await supabase.rpc('bixgo_map_search', { p_query: query.slice(0,100), ...(near ? { p_lat: near.lat, p_lng: near.lng } : {}) });
  if (error) throw new Error('Community points unavailable. Retry.');
  return (data ?? []).map(p => ({ communityId: p.id, name: p.name, lat: p.lat, lng: p.lng, detail: p.detail, driverNote: p.driver_note }));
}