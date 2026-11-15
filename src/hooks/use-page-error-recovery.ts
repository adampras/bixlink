import { useEffect } from 'react';
import { useRouter } from '@tanstack/react-router';
import { isStalePageError, recoverStalePage } from '@/lib/stale-page-recovery';

/** Leaf error boundaries must recover too: they do not render the root boundary. */
export function usePageErrorRecovery(error: unknown, reset: () => void) {
  const router = useRouter();
  useEffect(() => { recoverStalePage(error); }, [error]);
  return async () => {
    if (isStalePageError(error)) {
      window.location.reload();
      return;
    }
    await router.invalidate();
    reset();
  };
}