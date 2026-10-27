import { z } from 'zod';

export const LOAN_DAYS = 360;
export const LOAN_MULTIPLE = 5;
export const loanPackageSchema = z.object({
  id: z.enum(['EXPLORER', 'PIONEER', 'BUILDER']),
  usd: z.number().finite().positive().max(1_000_000).refine(v => Math.abs(v * 100 - Math.round(v * 100)) < 1e-7, 'Use at most two decimals'),
  enabled: z.boolean(),
}).strict();
export const loanConfigSchema = z.object({ packages: z.array(loanPackageSchema).length(3).refine(rows => new Set(rows.map(r => r.id)).size === 3, 'Each loan package must appear once') }).strict();
export type LoanConfig = z.infer<typeof loanConfigSchema>;
export const loanQuota = (id: string) => id === 'BUILDER' ? 1 : id === 'PIONEER' ? 2 : 10;