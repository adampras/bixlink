import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** Server-checked VIP HOST status (active staking ≥ owner threshold) for a set of user ids. */
export function useVipHosts(ids: (string | null | undefined)[]) {
  const list = [...new Set(ids.filter((x): x is string => !!x))].sort().slice(0, 200);
  const q = useQuery({
    queryKey: ['bixtok-vip-hosts', list.join(',')],
    enabled: list.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('bixtok_vip_hosts', { p_uids: list });
      if (error) throw error;
      return new Set<string>((data as string[] | null) ?? []);
    },
  });
  return q.data ?? new Set<string>();
}

export function VipBadge({ small }: { small?: boolean }) {
  return <span className={`bxt-vip${small ? ' sm' : ''}`} title="VIP HOST">👑 VIP HOST</span>;
}
