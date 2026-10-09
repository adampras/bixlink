import { describe, it, expect } from 'vitest';
import { effectiveSettings, isBlockedByMaintenance } from '@/lib/site-control';

describe('site control', () => {
  const live = { readiness: { theme: 'new' } };
  const snap = { readiness: { theme: 'old' } };
  it('members see the snapshot while admin preview is on', () => {
    expect(effectiveSettings(live, { maintenance: false, staging: true }, snap, false).readiness.theme).toBe('old');
  });
  it('admins see live changes while admin preview is on', () => {
    expect(effectiveSettings(live, { maintenance: false, staging: true }, snap, true).readiness.theme).toBe('new');
  });
  it('everyone sees live changes when admin preview is off', () => {
    expect(effectiveSettings(live, { maintenance: false, staging: false }, snap, false).readiness.theme).toBe('new');
  });
  it('maintenance blocks members but not admins or the sign-in page', () => {
    const c = { maintenance: true, staging: false };
    expect(isBlockedByMaintenance(c, false, '/wallet')).toBe(true);
    expect(isBlockedByMaintenance(c, true, '/wallet')).toBe(false);
    expect(isBlockedByMaintenance(c, false, '/auth')).toBe(false);
  });
});
