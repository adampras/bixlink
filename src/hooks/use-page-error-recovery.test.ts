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
  it.each(['HOME', 'Market'])('recovers stale errors even inside the %s leaf boundary', async () => {
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
});