import { QueryClient, dehydrate, hydrate } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { AuricSkeleton } from "./components/TechSuite";
import { recoverStalePage } from './lib/stale-page-recovery';

// After a new deploy, old page chunks disappear; reload once to fetch fresh ones.
if (typeof window !== "undefined") {
  window.addEventListener('vite:preloadError', (event) => {
    if (recoverStalePage(new Error('Failed to fetch dynamically imported module'))) event.preventDefault();
  });
  window.addEventListener('error', (event) => { recoverStalePage(event.error ?? event.message); });
  window.addEventListener('unhandledrejection', (event) => { recoverStalePage(event.reason); });
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    dehydrate: () => ({ queryState: JSON.stringify(dehydrate(queryClient)) }),
    hydrate: (dehydrated) => {
      if (dehydrated && typeof dehydrated === 'object' && 'queryState' in dehydrated && typeof dehydrated.queryState === 'string') hydrate(queryClient, JSON.parse(dehydrated.queryState));
    },
    scrollRestoration: true,
    defaultPendingComponent: AuricSkeleton,
    defaultPendingMs: 250,
    // Warm the next page (code + loader data) as soon as a nav item is hovered
    // or pressed, so switching menus opens already-loaded content.
    defaultPreload: "intent",
    defaultPreloadDelay: 60,
    defaultPreloadStaleTime: 0,
    defaultOnCatch: (error: unknown) => { recoverStalePage(error); },
  });

  return router;
};
