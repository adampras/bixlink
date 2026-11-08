import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { HUB_ITEMS } from '@/lib/dock-hub';

/** Server-decided design track + ecosystem locks (Owner 2 branch). Client only presents it. */
export type DesignAccess = { next_gen: boolean; owner2: boolean; owner1?: boolean; chrono?: boolean; locked: string[] };

export function useDesignAccess(userId: string | undefined) {
  return useQuery({
    queryKey: ['bix-design-access', userId ?? 'anon'],
    queryFn: async (): Promise<DesignAccess> => {
      const { data, error } = await supabase.rpc('bix_design_access' as never);
      if (error) return { next_gen: false, owner2: false, locked: [] };
      const d = (data ?? {}) as Partial<DesignAccess>;
      return { next_gen: !!d.next_gen, owner2: !!d.owner2, owner1: !!d.owner1, chrono: !!d.chrono, locked: Array.isArray(d.locked) ? d.locked.map(String) : [] };
    },
    staleTime: 60_000,
  });
}

/** Which locked ecosystem (if any) owns this path. */
export function lockedEcosystem(path: string, locked: string[]) {
  return HUB_ITEMS.find(i => i.to !== '/' && locked.includes(i.id) && (path === i.to || path.startsWith(i.to + '/'))) ?? null;
}
