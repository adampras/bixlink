import { describe, it, expect } from 'vitest';
import { simulatedQuote, simulationHistory, movementInputSchema, type InternalMovement } from '@/lib/internal-market';
const config: InternalMovement = { enabled: true, lower: .09, upper: .11, intervalSeconds: 5, intensity: 100, bias: 'balanced', base: .1, startedAt: 0, pausedAt: null };
describe('Admin-controlled display simulation', () => {
  it('stays inside owner bounds and moves both up and down', () => {
    const prices = Array.from({ length: 100 }, (_, n) => simulatedQuote(config, n * 5000));
    expect(prices.every(p => p >= .09 && p <= .11)).toBe(true);
    expect(prices.some((p,i) => i > 0 && p > Number(prices[i-1]))).toBe(true);
    expect(prices.some((p,i) => i > 0 && p < Number(prices[i-1]))).toBe(true);
  });
  it('freezes on pause and returns consistent shared quotes', () => {
    const paused = { ...config, enabled: false, pausedAt: 15000 };
    expect(simulatedQuote(paused, 20000)).toBe(simulatedQuote(paused, 200000));
    expect(simulatedQuote(config, 15100)).toBe(simulatedQuote(config, 15999));
  });
  it('never fabricates samples before simulation starts', () => {
    expect(simulationHistory(config, 0)).toEqual([{ time: 0, price: .1 }]);
    expect(simulationHistory(config, 5000)).toHaveLength(2);
  });
  it('rejects inverted ranges', () => {
    expect(movementInputSchema.safeParse({ enabled:true,lower:.11,upper:.09,intervalSeconds:5,intensity:50,bias:'balanced' }).success).toBe(false);
  });
});