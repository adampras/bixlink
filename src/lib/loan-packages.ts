import { z } from 'zod';

export const LOAN_DAYS = 360;
export const LOAN_MULTIPLE = 5;
export const loanPackageSchema = z.object({
  id: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{2,24}$/, 'Package name: 2–24 letters/numbers'),
  usd: z.number().finite().positive().max(1_000_000).refine(v => Math.abs(v * 100 - Math.round(v * 100)) < 1e-7, 'Use at most two decimals'),
  enabled: z.boolean(),
  quota: z.number().int().min(1).max(1000).default(10),
});
export const loanConfigSchema = z.object({ packages: z.array(loanPackageSchema).min(1).max(20).refine(rows => new Set(rows.map(r => r.id)).size === rows.length, 'Each loan package name must be unique') });
export type LoanConfig = z.infer<typeof loanConfigSchema>;
export type LoanPackage = z.infer<typeof loanPackageSchema>;
