import { QueryClient } from "@tanstack/react-query";
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
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
