import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ invalidate: vi.fn(), recover: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({ useRouter: () => ({ invalidate: mocks.invalidate }) }));
vi.mock('@/lib/stale-page-recovery', () => ({
  recoverStalePage: mocks.recover,
  isStalePageError: (error: unknown) => error instanceof Error && error.message.includes("reading 'component'"),
}));
import { usePageErrorRecovery } from './use-page-error-recovery';

afterEach(() => { vi.clearAllMocks(); });

describe('leaf page error recovery', () => {
  it.each(['HOME', 'Market', 'shared root'])('recovers stale errors even inside the %s boundary', async () => {
    const error = new TypeError("Cannot read properties of undefined (reading 'component')");
    renderHook(() => usePageErrorRecovery(error, vi.fn()));
    await waitFor(() => expect(mocks.recover).toHaveBeenCalledWith(error));
  });
  it('reloads loader data before resetting an ordinary error', async () => {
    const order: string[] = [];
    mocks.invalidate.mockImplementation(async () => { order.push('invalidate'); });
    const reset = vi.fn(() => { order.push('reset'); });
    const { result } = renderHook(() => usePageErrorRecovery(new Error('Feed unavailable'), reset));
    await act(async () => { await result.current(); });
    expect(order).toEqual(['invalidate', 'reset']);
    expect(reset).toHaveBeenCalledTimes(1);
  });
  it('keeps the boundary until asynchronous loader invalidation finishes', async () => {
    let finish: (() => void) | undefined;
    mocks.invalidate.mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
    const reset = vi.fn();
    const { result } = renderHook(() => usePageErrorRecovery(new Error('Feed unavailable'), reset));
    const pending = result.current();
    expect(reset).not.toHaveBeenCalled();
    await act(async () => { finish?.(); await pending; });
    expect(reset).toHaveBeenCalledTimes(1);
  });
  it('refreshes the document rather than resetting a cached failed module', async () => {
    const reload = vi.fn();
    vi.stubGlobal('window', { location: { reload } });
    try {
      const reset = vi.fn();
      const { result } = renderHook(() => usePageErrorRecovery(new TypeError("Cannot read properties of undefined (reading 'component')"), reset));
      await act(async () => { await result.current(); });
      expect(reload).toHaveBeenCalledTimes(1);
      expect(mocks.invalidate).not.toHaveBeenCalled();
      expect(reset).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});