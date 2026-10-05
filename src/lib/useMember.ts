import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getMyData } from '@/lib/bixlink.functions';
import { fallbackPackages, type Package } from '@/lib/bixlink';

export function useMember() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const fetchMine = useServerFn(getMyData);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => { setUser(data.user ?? null); setReady(true); }); }, []);
  const query = useQuery({ queryKey: ['my-bixlink', user?.id], queryFn: () => fetchMine(), enabled: !!user });
  return { user, ready, ...query };
}

export function usePublicConfig() {
  return useQuery({
    queryKey: ['bix-public-config'],
    queryFn: async () => {
      const [p, s] = await Promise.all([
        supabase.from('packages').select('*').order('price_usd'),
        supabase.from('app_settings').select('*'),
      ]);
      const settings = Object.fromEntries((s.data ?? []).map(r => [r.key, r.value as Record<string, any>]));
      return {
        packages: (p.data?.length ? p.data : fallbackPackages) as Package[],
        booster: (settings['booster'] ?? { enabled: true, rate: 25 }) as { enabled: boolean; rate: number },
        wallet: (settings['wallet'] ?? { address: '', network: 'USDT BEP20' }) as { address: string; network: string },
        referrals: (settings['referrals'] ?? { direct: 10, levels: [12, 6, 3, 2, 1], rewardPlus: 5, minimumDirect: 3, splitUsdt: 70, splitBix: 30 }) as { direct: number; levels: number[]; rewardPlus: number; minimumDirect: number; splitUsdt: number; splitBix: number },
      };
    },
  });
}
