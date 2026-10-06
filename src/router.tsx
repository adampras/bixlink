import { QueryClient, dehydrate, hydrate } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

// After a new deploy, old page chunks disappear; reload once to fetch fresh ones.
if (typeof window !== "undefined") {
  const reloadOnce = () => {
    if (sessionStorage.getItem("bix-chunk-reload")) return;
    sessionStorage.setItem("bix-chunk-reload", "1");
    window.location.reload();
  };
  window.addEventListener("vite:preloadError", (e) => { e.preventDefault(); reloadOnce(); });
  window.addEventListener("unhandledrejection", (e) => {
    if (String(e.reason?.message ?? "").includes("dynamically imported module")) reloadOnce();
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
    // Warm the next page (code + loader data) as soon as a nav item is hovered
    // or pressed, so switching menus opens already-loaded content.
    defaultPreload: "intent",
    defaultPreloadDelay: 60,
    defaultPreloadStaleTime: 0,
    defaultOnCatch: (err: unknown) => { const error = err as Error;
      if (typeof window !== "undefined" && /dynamically imported module|Importing a module script failed/.test(error?.message ?? "") && !sessionStorage.getItem("bix-chunk-reload")) {
        sessionStorage.setItem("bix-chunk-reload", "1");
        window.location.reload();
      }
    },
  });

  return router;
};
