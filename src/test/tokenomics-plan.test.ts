import { describe, expect, it } from 'vitest';
import { tokenomicsPlan, tokenomicsSupply } from '../lib/tokenomics-plan';
describe('proposed BIXCOIN tokenomics', () => {
 it('totals 21,000,000 BIX and 100%', () => {
  expect(tokenomicsSupply).toBe(21_000_000);
  expect(tokenomicsPlan.reduce((s,r) => s+r.amount,0)).toBe(21_000_000);
  expect(tokenomicsPlan.reduce((s,r) => s+r.percent,0)).toBe(100);
 });
 it.each([[0,50,10_500_000],[1,15,3_150_000],[2,10,2_100_000],[3,10,2_100_000],[4,10,2_100_000],[5,5,1_050_000]])('allocation %i matches its requested terms', (i,p,a) => {
  expect(tokenomicsPlan[i]?.percent).toBe(p); expect(tokenomicsPlan[i]?.amount).toBe(a);
  expect(a).toBe(tokenomicsSupply*p/100);
 });
 it('plans 10-year rewards and 2-year halvings', () => { expect(tokenomicsPlan[0].releaseYears).toBe(10); expect(tokenomicsPlan[0].halvingYears).toBe(2); });
 it('plans a 12-month liquidity lock', () => { expect(tokenomicsPlan[1].lockMonths).toBe(12); });
 it('plans 24-month marketing release', () => { expect(tokenomicsPlan[2].releaseMonths).toBe(24); });
 it('plans a 6-month cliff then 24-month team vesting', () => { expect(tokenomicsPlan[4].cliffMonths).toBe(6); expect(tokenomicsPlan[4].vestingMonths).toBe(24); });
});
