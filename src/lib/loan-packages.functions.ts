import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { loanConfigSchema } from '@/lib/loan-packages';

export const getLoanPackages = createServerFn({ method: 'GET' }).middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc('bix_loan_package_config');
    if (error) throw new Error(error.message);
    return loanConfigSchema.parse(data);
  });

export const saveLoanPackages = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator(input => loanConfigSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { data: saved, error } = await context.supabase.rpc('bix_loan_package_save', { p_config: data });
    if (error) throw new Error(error.message);
    return loanConfigSchema.parse(saved);
  });