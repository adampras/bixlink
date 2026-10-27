import { describe, it, expect } from 'vitest';
import { loanConfigSchema, LOAN_DAYS, LOAN_MULTIPLE, loanQuota } from '@/lib/loan-packages';
const rows = [{ id: 'EXPLORER', usd: 100, enabled: true }, { id: 'PIONEER', usd: 500, enabled: true }, { id: 'BUILDER', usd: 1000, enabled: true }];
describe('loan package rules', () => {
  it('allows editing loan values independently', () => {
    expect(loanConfigSchema.parse({ packages: rows.map(p => ({ ...p, usd: 250 })) }).packages[0]?.usd).toBe(250);
  });
  it('keeps the existing 5x loan target', () => { expect(LOAN_MULTIPLE).toBe(5); });
  it('keeps the existing 360-day duration', () => { expect(LOAN_DAYS).toBe(360); });
  it('keeps the direct sponsor quotas at 1, 2 and 10', () => { expect(['BUILDER','PIONEER','EXPLORER'].map(loanQuota)).toEqual([1,2,10]); });
  it('rejects duplicate tiers and invalid amounts', () => {
    expect(loanConfigSchema.safeParse({ packages: [rows[0], rows[0], rows[2]] }).success).toBe(false);
    expect(loanConfigSchema.safeParse({ packages: rows.map(p => ({ ...p, usd: -1 })) }).success).toBe(false);
  });
});