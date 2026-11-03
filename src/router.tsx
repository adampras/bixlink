import { QueryClient, dehydrate, hydrate } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { AuricSkeleton } from "./components/TechSuite";

// After a new deploy, old page chunks disappear; reload once to fetch fresh ones.
if (typeof window !== "undefined") {
  // Time-based guard: allow a fresh reload if the last one was >15s ago,
  // so a stale flag can never leave the page stuck on a blank screen.
  const reloadOnce = () => {
    const last = Number(sessionStorage.getItem("bix-chunk-reload") || 0);
    if (Date.now() - last < 15000) return;
    sessionStorage.setItem("bix-chunk-reload", String(Date.now()));
    window.location.reload();
  };
  // An old cached app bundle can receive page data from a newer deploy and fail
  // to find a page definition ("reading 'component'"), leaving a blank screen.
  const isStaleBundle = (msg: string) =>
    /dynamically imported module|Importing a module script failed|reading '(component|options)'/.test(msg);
  window.addEventListener("vite:preloadError", (e) => { e.preventDefault(); reloadOnce(); });
  window.addEventListener("error", (e) => {
    if (isStaleBundle(String(e.message ?? e.error?.message ?? ""))) reloadOnce();
  });
  window.addEventListener("unhandledrejection", (e) => {
    if (isStaleBundle(String(e.reason?.message ?? ""))) reloadOnce();
  });
  window.addEventListener("load", () => setTimeout(() => sessionStorage.removeItem("bix-chunk-reload"), 10000));
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
    defaultOnCatch: (err: unknown) => { const error = err as Error;
      if (typeof window !== "undefined" && /dynamically imported module|Importing a module script failed/.test(error?.message ?? "")) {
        const last = Number(sessionStorage.getItem("bix-chunk-reload") || 0);
        if (Date.now() - last < 15000) return;
        sessionStorage.setItem("bix-chunk-reload", String(Date.now()));
        window.location.reload();
      }
    },
  });

  return router;
};
