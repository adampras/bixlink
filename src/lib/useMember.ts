import { useEffect, useSyncExternalStore } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { getMyData, assignReferral, ensureProfile } from '@/lib/bixlink.functions';
import { fallbackPackages, type Package } from '@/lib/bixlink';

// The member session is resolved once per app load and shared by every route, so
// switching menus reuses the known session instead of re-asking the auth service
// on each page mount (that re-ask is what used to flash a loader on every tab).
type AuthSnapshot = { user: User | null; ready: boolean };

const PENDING: AuthSnapshot = { user: null, ready: false };
let snapshot: AuthSnapshot = PENDING;
let watching = false;
const listeners = new Set<() => void>();

function publish(user: User | null) {
  const unchanged =
    snapshot.ready &&
    snapshot.user?.id === user?.id &&
    snapshot.user?.updated_at === user?.updated_at;
  if (unchanged) return;
  snapshot = { user, ready: true };
  listeners.forEach(listener => listener());
}

function watchSession(listener: () => void) {
  if (!watching) {
    watching = true;
    supabase.auth
      .getUser()
      .then(({ data }) => publish(data.user ?? null))
      .catch(() => publish(null));
    supabase.auth.onAuthStateChange((_event, session) => publish(session?.user ?? null));
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function useSession() {
  return useSyncExternalStore(
    watchSession,
    () => snapshot,
    () => PENDING,
  );
}

export function useMember() {
  const { user, ready } = useSession();
  const fetchMine = useServerFn(getMyData);
  const link = useServerFn(assignReferral);
  const profile = useServerFn(ensureProfile);
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['my-bixlink', user?.id],
    queryFn: () => fetchMine(),
    enabled: !!user,
    staleTime: 15_000,
  });

  // A disabled query (no session yet) stays "pending" forever, so only count
  // data loading when there actually is a signed-in member to load for.
  const dataPending = !!user && query.isPending;

  useEffect(() => { if (ready && user) profile().catch(() => {}); }, [ready, user?.id]);

  useEffect(() => {
    if (ready && user && query.data && !query.data.referral?.referred_by) {
      const storedRef = window.localStorage.getItem('bixlink-ref');
      if (storedRef && /^BIX-\d{6}$/i.test(storedRef)) {
        link({ data: { code: storedRef.toUpperCase() } })
          .then(r => {
            if (r.linked) {
              window.localStorage.removeItem('bixlink-ref');
              qc.invalidateQueries({ queryKey: ['my-bixlink', user.id] });
            }
          })
          .catch(() => {
            // Silently skip if invalid or failed
          });
      }
    }
  }, [ready, user, query.data, link, qc]);

  return { user, ready: ready && !dataPending, ...query };
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
        boosterVisual: (settings['booster_visual'] ?? { visual: 'fox' }) as { visual: 'fox' | 'reactor' | 'emblem' },
        wallet: (settings['wallet'] ?? { address: '', network: 'USDT BEP20' }) as { address: string; network: string },
        swap: (settings['swap'] ?? { enabled: false }) as { enabled: boolean },
        bixPay: (settings['bix_pay'] ?? { enabled: false }) as { enabled: boolean },
        bixMarket: (settings['bix_market'] ?? { priceUsd: 0.84291 }) as { priceUsd: number },
        referrals: (settings['referrals'] ?? { direct: 10, levels: [12, 6, 3, 2, 1], rewardPlus: 5, minimumDirect: 3, splitUsdt: 70, splitBix: 30 }) as { direct: number; levels: number[]; rewardPlus: number; minimumDirect: number; splitUsdt: number; splitBix: number },
      };
    },
  });
}
