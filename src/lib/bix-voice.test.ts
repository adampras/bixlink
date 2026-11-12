import { describe, expect, it } from 'vitest';
import { GATE_DB, GATE_TUNE, HOWL_BANDS, gateStep } from './bix-voice';
import { callerPhase, OFFLINE_MS, RING_TIMEOUT_MS } from '@/components/BixCall';

/** Run a level sequence (dBFS per 50 ms tick) through the gate; returns gains. */
function run(levels: number[]) {
  let hold = 0; const out: number[] = [];
  for (const db of levels) { const r = gateStep(db, hold); hold = r.hold; out.push(r.gain); }
  return out;
}
/** Pseudo-random crowd babble between lo and hi dB (deterministic). */
function crowd(n: number, lo: number, hi: number) {
  let x = 7; return Array.from({ length: n }, () => { x = (x * 1103515245 + 12345) % 2147483648; return lo + (x / 2147483648) * (hi - lo); });
}

describe('BIX CALL anti-storing and call phases', () => {
  it('shield gate passes a soft voice (-40 dB) but cuts a nearby phone speaker (-44 dB)', () => {
    expect(GATE_DB.shield).toBe(-42);
    expect(-40 > GATE_DB.shield).toBe(true);
    expect(-22 > GATE_DB.shield).toBe(true);
    expect(-44 > GATE_DB.shield).toBe(false);
  });
  it('busy room: crowd babble alone (-60..-45 dB) stays at the soft floor', () => {
    const g = run(crowd(200, -60, -45));
    expect(g.every(v => v === GATE_TUNE.floor)).toBe(true);
  });
  it('busy room: a soft spoken phrase over the crowd opens the gate for every word', () => {
    const levels = [...crowd(20, -58, -46), ...Array(30).fill(-39), ...crowd(4, -58, -46), ...Array(20).fill(-37)];
    const g = run(levels);
    expect(g.slice(20).every(v => v === 1)).toBe(true); // short pauses between words are held, no chopping
  });
  it('word endings are held ~600 ms before the gate closes', () => {
    const g = run([...Array(10).fill(-30), ...Array(20).fill(-55)]);
    expect(g.slice(10, 10 + GATE_TUNE.holdTicks - 1).every(v => v === 1)).toBe(true);
    expect(g[g.length - 1]).toBe(GATE_TUNE.floor);
  });
  it('notches the four phone-to-phone howl bands', () => {
    expect([...HOWL_BANDS]).toEqual([1800, 2400, 3200, 4100]);
  });
  it('caller sees Memanggil until the device acks, then Berdering; offline after 45 s', () => {
    expect(callerPhase({})).toBe('calling');
    expect(callerPhase({ rang: true })).toBe('ringing');
    expect(callerPhase({ offline: true })).toBe('offline');
    expect(OFFLINE_MS).toBe(45000);
    expect(RING_TIMEOUT_MS).toBe(75000);
  });
});
