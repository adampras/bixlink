import { afterEach, describe, expect, it, vi } from 'vitest';
import { isStalePageError, recoverStalePage } from './stale-page-recovery';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function browser() {
  const entries = new Map<string, string>();
  const reload = vi.fn();
  vi.stubGlobal('window', {
    sessionStorage: {
      getItem: (key: string) => entries.get(key) ?? null,
      setItem: (key: string, value: string) => { entries.set(key, value); },
    },
    location: { reload },
  });
  return reload;
}

describe('stale route recovery', () => {
  const routeError = new TypeError("Cannot read properties of undefined (reading 'component')");
  it('recognizes the reported missing component and missing route options', () => {
    expect(isStalePageError(routeError)).toBe(true);
    expect(isStalePageError(new TypeError('Cannot read properties of undefined (reading "options")'))).toBe(true);
    expect(isStalePageError(new Error('Failed to fetch dynamically imported module: /assets/care.js'))).toBe(true);
    expect(isStalePageError(new TypeError("Cannot read properties of undefined (reading 'name')"))).toBe(false);
  });
  it('reloads once when the React boundary catches the missing component', () => {
    const reload = browser();
    expect(recoverStalePage(routeError)).toBe(true);
    expect(recoverStalePage(routeError)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });
  it('limits persistent failures and permits recovery after the time window', () => {
    const reload = browser();
    const clock = vi.spyOn(Date, 'now');
    for (const time of [100_000, 115_000, 130_000]) {
      clock.mockReturnValue(time);
      expect(recoverStalePage(routeError)).toBe(true);
    }
    clock.mockReturnValue(145_000);
    expect(recoverStalePage(routeError)).toBe(false);
    clock.mockReturnValue(161_000);
    expect(recoverStalePage(routeError)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(4);
  });
  it('does not reload for ordinary application errors or unavailable storage', () => {
    const reload = browser();
    expect(recoverStalePage(new Error('Permission denied'))).toBe(false);
    vi.stubGlobal('window', { get sessionStorage() { throw new Error('Blocked'); }, location: { reload } });
    expect(recoverStalePage(routeError)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
  it('recognizes the exact reported split Profile module failure', () => {
    expect(isStalePageError(new TypeError('Failed to fetch dynamically imported module: /src/routes/profile.tsx?tsr-split=component'))).toBe(true);
  });
  it('does not discard the current page or spend retries while offline', () => {
    const reload = browser();
    Object.assign(window, { navigator: { onLine: false } });
    expect(recoverStalePage(new TypeError('Failed to fetch dynamically imported module: /src/routes/profile.tsx?tsr-split=component'))).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    Object.assign(window, { navigator: { onLine: true } });
    expect(recoverStalePage(routeError)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});