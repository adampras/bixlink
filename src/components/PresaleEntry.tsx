import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { getPresaleStatus } from '@/lib/presale.functions';

/** Shared presale status — cached under the same key PresaleWelcome uses. */
export function usePresaleStatus(userId?: string) {
  const load = useServerFn(getPresaleStatus);
  return useQuery({ queryKey: ['presale', userId], queryFn: () => load(), enabled: Boolean(userId), staleTime: 60_000 });
}

export const presaleOpen = (data?: unknown) =>
  Boolean(data && (data as { config?: { enabled?: boolean } }).config?.enabled === true);
