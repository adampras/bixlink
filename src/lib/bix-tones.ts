/** BIX CALL tones synthesized with Web Audio (no audio files, tiny and offline). */
let ctx: AudioContext | null = null;
const ac = () => {
  if (typeof window === 'undefined') return null;
  try { ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); } catch { return null; }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  return ctx;
};
const KEY = 'bixcall-ring-vol';
export const getRingVolume = () => { try { const v = Number(localStorage.getItem(KEY)); return Number.isFinite(v) && localStorage.getItem(KEY) !== null ? v : 0.7; } catch { return 0.7; } };
export const setRingVolume = (v: number) => { try { localStorage.setItem(KEY, String(v)); } catch { /* ignore */ } };

function tone(freqs: number[], start: number, dur: number, gain: number, type: OscillatorType = 'sine') {
  const c = ac(); if (!c || gain <= 0) return;
  const g = c.createGain(); g.connect(c.destination);
  const t = c.currentTime + start;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  for (const f of freqs) { const o = c.createOscillator(); o.type = type; o.frequency.value = f; o.connect(g); o.start(t); o.stop(t + dur + 0.05); }
}

/** Repeats a pattern until the returned stop() is called. */
function loop(pattern: () => void, every: number) {
  pattern(); const id = setInterval(pattern, every);
  return () => clearInterval(id);
}

/** Incoming call: luxury BIXLINK chime arpeggio. */
export const startRingtone = () => loop(() => {
  const v = getRingVolume() * 0.35;
  [659.25, 830.61, 987.77, 1318.5].forEach((f, i) => tone([f, f * 2], i * 0.16, 0.5, v, 'triangle'));
  [987.77, 1318.5].forEach((f, i) => tone([f], 1.0 + i * 0.16, 0.6, v * 0.8, 'triangle'));
}, 2600);

/** Caller waiting: soft dual-tone ringback. */
export const startRingback = () => loop(() => tone([440, 480], 0, 1.2, 0.08), 3500);

export const playConnected = () => { [784, 1175].forEach((f, i) => tone([f], i * 0.12, 0.25, 0.15, 'triangle')); };
export const playEnded = () => { [620, 460, 320].forEach((f, i) => tone([f], i * 0.18, 0.22, 0.14)); };

const DTMF: Record<string, [number, number]> = {
  '1': [697, 1209], '2': [697, 1336], '3': [697, 1477], '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
  '7': [852, 1209], '8': [852, 1336], '9': [852, 1477], '*': [941, 1209], '0': [941, 1336], '#': [941, 1477],
};
export const playDtmf = (k: string) => { const p = DTMF[k]; if (p) tone(p, 0, 0.14, 0.12); };
