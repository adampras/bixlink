import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/** AIX FutureDao look: server-decided (off / Owner 1 + selected IDs / public). Presentation only. */
export function useAixAccess(userId: string | undefined) {
  return useQuery({
    queryKey: ['bix-aix', userId ?? 'anon'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('bix_aix_access' as never);
      const d = (data ?? {}) as { on?: boolean; mode?: string | null };
      return error ? { on: false, mode: null as string | null } : { on: !!d.on, mode: d.mode ?? null };
    },
  });
}
