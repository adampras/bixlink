import { describe, expect, it } from 'vitest';
import { GATE_DB, HOWL_BANDS } from './bix-voice';
import { callerPhase, OFFLINE_MS } from '@/components/BixCall';

describe('BIX CALL anti-storing and call phases', () => {
  it('shield gate cuts a nearby phone speaker (-44 dB) but passes a voice at the mouth (-22 dB)', () => {
    expect(GATE_DB.shield).toBe(-36);
    expect(-38 > GATE_DB.shield).toBe(false);
    expect(-44 > GATE_DB.shield).toBe(false);
    expect(-22 > GATE_DB.shield).toBe(true);
  });
  it('notches the four phone-to-phone howl bands', () => {
    expect([...HOWL_BANDS]).toEqual([1800, 2400, 3200, 4100]);
  });
  it('caller sees Memanggil until the device acks, then Berdering; offline after 25 s', () => {
    expect(callerPhase({})).toBe('calling');
    expect(callerPhase({ rang: true })).toBe('ringing');
    expect(callerPhase({ offline: true })).toBe('offline');
    expect(OFFLINE_MS).toBe(25000);
  });
});
