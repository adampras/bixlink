import { BixtokMiniHost } from '@/components/BixtokMiniHost';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import installIcon from '@/assets/fox-icon-180.png.asset.json';
import splashArtwork from '@/assets/bixcoin-reactor-splash.jpg.asset.json';
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppSplash } from "../components/AppSplash";
import { InstallPrompt } from "../components/InstallPrompt";
import { InteractionComfort } from '../components/InteractionComfort';
import { FoxChat } from "../components/FoxChat";
import { I18nProvider } from "../lib/i18n";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  const chunk = /dynamically imported module|Importing a module script failed/.test(String((error as Error)?.message ?? ""));
  useEffect(() => {
    if (chunk) {
      // Stale page file after an update: the browser caches the failed import, so only a full reload helps.
      // Allow up to 3 automatic reloads per minute, then leave the reload button to the member.
      const now = Date.now();
      const hits = JSON.parse(sessionStorage.getItem("bix-chunk-reloads") ?? "[]").filter((t: number) => now - t < 60000) as number[];
      if (hits.length < 3) {
        sessionStorage.setItem("bix-chunk-reloads", JSON.stringify([...hits, now]));
        window.location.reload();
        return;
      }
    }
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error, chunk]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              if (chunk) { window.location.reload(); return; }
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover" },
      { name: "theme-color", content: "#020203" },
      
      
      { name: "author", content: "Lovable" },
      
      
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preload", as: "image", href: splashArtwork.url },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cinzel:wght@700;800;900&family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@500;600;700&family=Manrope:wght@400;500;600;700;800&family=Sora:wght@600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  const wallet = useRouterState({ select: state => state.location.pathname === '/sovereign-wallet' });
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "try{var d=document.documentElement,m=localStorage.getItem('bixlink-color-mode'),t=localStorage.getItem('bixlink-theme');d.dataset.colorMode=m==='light'?'light':'dark';if(t)d.dataset.presentationTheme=t}catch(e){}" }} />
        <HeadContent />
        <link rel="manifest" href={wallet ? '/sovereign.webmanifest' : '/manifest.webmanifest'} />
        <link rel="icon" type="image/png" href={wallet ? '/wallet-icons/wallet-192.png' : '/favicon.png'} />
        <link rel="apple-touch-icon" href={wallet ? '/wallet-icons/wallet-180.png' : installIcon.url} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AppSplash />
        <InstallPrompt />
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <PageTransition />
        <Outlet />
        <BixtokMiniHost />
        <FoxChat />
        <InteractionComfort />
      </I18nProvider>
    </QueryClientProvider>
  );
}

function PageTransition() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return <div key={path} className="page-top-line" aria-hidden />;
}
