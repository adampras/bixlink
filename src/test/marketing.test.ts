import { describe, it, expect } from 'vitest';
import { defaultMarketing, marketingSchema, poolAvailability } from '@/lib/marketing';
describe('marketing materials',()=>{
  it('supports every app language',()=>{const plan=defaultMarketing();expect(Object.keys(plan.locales).sort()).toEqual(['en','id','ja','ko','ms','th','vi','zh']);expect(marketingSchema.safeParse(plan).success).toBe(true);});
  it('shows recorded remaining pool',()=>{expect(poolAvailability(2100000,500000)).toEqual({remaining:1600000,percent:500000/2100000*100});expect(poolAvailability(10,12)).toEqual({remaining:0,percent:100});});
  it('rejects oversized owner copy',()=>{const plan=defaultMarketing();plan.locales.en.intro='x'.repeat(501);expect(marketingSchema.safeParse(plan).success).toBe(false);});
});
