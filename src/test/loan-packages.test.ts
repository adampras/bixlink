import { describe, expect, it } from 'vitest';
import { loanConfigSchema, LOAN_DAYS, LOAN_MULTIPLE } from '@/lib/loan-packages';

describe('loan packages', () => {
  it('keeps the 360-day 5× rule', () => { expect([LOAN_DAYS, LOAN_MULTIPLE]).toEqual([360, 5]); });
  it('allows the owner to add more than three packages', () => {
    const rows = ['EXPLORER', 'PIONEER', 'BUILDER', 'TITAN'].map((id, i) => ({ id, usd: (i + 1) * 100, enabled: true, quota: 10 }));
    expect(loanConfigSchema.parse({ packages: rows }).packages).toHaveLength(4);
  });
  it('allows removing down to one package but not zero', () => {
    expect(loanConfigSchema.safeParse({ packages: [{ id: 'SOLO', usd: 250, enabled: true, quota: 5 }] }).success).toBe(true);
    expect(loanConfigSchema.safeParse({ packages: [] }).success).toBe(false);
  });
  it('rejects duplicate package names', () => {
    expect(loanConfigSchema.safeParse({ packages: [{ id: 'A1', usd: 1, enabled: true, quota: 1 }, { id: 'A1', usd: 2, enabled: true, quota: 1 }] }).success).toBe(false);
  });
});
