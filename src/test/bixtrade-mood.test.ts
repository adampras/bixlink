import { describe, it, expect } from 'vitest';
import { bixtradeBotMood } from '@/lib/bixtrade';
const now = 1_000_000_000;
describe('bixtrade robot mood', () => {
  it('sleeps without capital even if routes exist', () => { expect(bixtradeBotMood({ capital: 0, routes: 3, now })).toBe('sleep'); });
  it('trades when an execution happened under 90 seconds ago', () => { expect(bixtradeBotMood({ capital: 100, routes: 0, lastExecAt: now - 60_000, now })).toBe('trade'); });
  it('hunts on profitable route once last trade is older than 90s', () => { expect(bixtradeBotMood({ capital: 100, routes: 1, lastExecAt: now - 91_000, now })).toBe('hunt'); });
  it('scans with capital and no routes', () => { expect(bixtradeBotMood({ capital: 100, routes: 0, now })).toBe('scan'); });
});
