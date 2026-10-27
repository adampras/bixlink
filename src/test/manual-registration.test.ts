import { describe, it, expect, vi } from 'vitest';
import { createManualAccount } from '@/lib/manual-registration';

describe('manual registration', () => {
  it('revokes the automatic signup session and never returns login tokens', async () => {
    const revoke = vi.fn(async () => ({ error: null }));
    const result = await createManualAccount(async () => ({ data: { session: { access_token: 'test-only' } }, error: null }), revoke);
    expect(revoke).toHaveBeenCalledOnce();
    expect(result).toEqual({ created: true, confirmationRequired: false });
  });
  it('does not treat an unconfirmed signup as signed in', async () => {
    const revoke = vi.fn();
    expect(await createManualAccount(async () => ({ data: { session: null }, error: null }), revoke)).toEqual({ created: true, confirmationRequired: true });
    expect(revoke).not.toHaveBeenCalled();
  });
});