const RELOAD_KEY = 'bix-page-recovery-attempts';
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 3;

export function isStalePageError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /dynamically imported module|Importing a module script failed|Failed to fetch dynamically imported module|Cannot read properties of undefined \(reading ['"](?:component|options)['"]\)/i.test(message);
}

/** Share a bounded reload budget across router, React boundary and preload errors. */
export function recoverStalePage(error: unknown): boolean {
  if (typeof window === 'undefined' || !isStalePageError(error)) return false;
  // Reloading while disconnected cannot fetch a module and can discard a working shell.
  // Leave the visible boundary available until the member retries with a connection.
  if (window.navigator?.onLine === false) return false;
  try {
    const now = Date.now();
    const stored: unknown = JSON.parse(window.sessionStorage.getItem(RELOAD_KEY) ?? '[]');
    const attempts = Array.isArray(stored)
      ? stored.filter((value): value is number => typeof value === 'number' && now - value < WINDOW_MS)
      : [];
    if (attempts.length >= MAX_ATTEMPTS) return false;
    // Several error handlers may receive the same failure before navigation completes.
    const latest = attempts.at(-1);
    if (latest !== undefined && now - latest < 15_000) return false;
    window.sessionStorage.setItem(RELOAD_KEY, JSON.stringify([...attempts, now]));
    window.location.reload();
    return true;
  } catch {
    // Disabled storage must not cause either a new crash or an unbounded reload loop.
    return false;
  }
}