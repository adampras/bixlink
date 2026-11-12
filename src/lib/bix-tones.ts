/** BIX CALL tones synthesized with Web Audio (no audio files, tiny and offline). */
let ctx: AudioContext | null = null;
export const CALL_AUDIO_EVENT = 'bix-call-audio-state';
let retryDeviceAudio: (() => void) | null = null;
const activeOscillators = new Set<OscillatorNode>();
let toneGeneration = 0;
const reportAudioState = (ready: boolean) => window.dispatchEvent(new CustomEvent(CALL_AUDIO_EVENT, { detail: ready }));
const ac = () => {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx || ctx.state === 'closed') {
      ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      ctx.onstatechange = () => reportAudioState(ctx?.state === 'running');
    }
  } catch { return null; }
  return ctx;
};
/** Call synchronously from a real tap, before any network request. Retry on later gestures if blocked. */
export function unlockCallAudio(retryDevice = true): Promise<boolean> {
  const c = ac();
  if (retryDevice) retryDeviceAudio?.();
  if (!c) return Promise.resolve(false);
  const ready = () => { const ok = c.state === 'running'; reportAudioState(ok); return ok; };
  if (c.state === 'running') return Promise.resolve(ready());
  return c.resume().then(ready).catch(() => { reportAudioState(false); return false; });
}
export const isCallAudioReady = () => ctx?.state === 'running';
export function installCallAudioUnlock() {
  const unlock = () => { void unlockCallAudio(); };
  window.addEventListener('pointerdown', unlock, { capture: true, passive: true });
  window.addEventListener('keydown', unlock, { capture: true });
  return () => { window.removeEventListener('pointerdown', unlock, true); window.removeEventListener('keydown', unlock, true); };
}
const KEY = 'bixcall-ring-vol';
export const getRingVolume = () => { try { const v = Number(localStorage.getItem(KEY)); return Number.isFinite(v) && localStorage.getItem(KEY) !== null ? Math.max(0, Math.min(1, v)) : 0.7; } catch { return 0.7; } };
export const setRingVolume = (v: number) => { try { localStorage.setItem(KEY, String(Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.7)); } catch { /* ignore */ } };

function tone(freqs: number[], start: number, dur: number, gain: number, type: OscillatorType = 'sine') {
  const c = ac(); if (!c || gain <= 0) return;
  const generation = toneGeneration;
  void unlockCallAudio(false).then(ready => {
  if (!ready || generation !== toneGeneration) return;
  const g = c.createGain(); g.connect(c.destination);
  const t = c.currentTime + start;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let remaining = freqs.length;
  for (const f of freqs) { const o = c.createOscillator(); o.type = type; o.frequency.value = f; o.connect(g); activeOscillators.add(o); o.onended = () => { activeOscillators.delete(o); o.disconnect(); if (--remaining === 0) g.disconnect(); }; o.start(t); o.stop(t + dur + 0.05); }
  });
}

/** Repeats a pattern until the returned stop() is called. */
let activeStop: (() => void) | null = null;
function loop(pattern: () => void, every: number) {
  activeStop?.(); // only one ringtone/ringback loop may play at a time
  pattern(); const id = setInterval(pattern, every);
  const stop = () => { clearInterval(id); if (activeStop === stop) { activeStop = null; toneGeneration++; activeOscillators.forEach(o => { try { o.stop(); } catch { /* already stopped */ } }); activeOscillators.clear(); } };
  activeStop = stop; return stop;
}

/** Incoming call: luxury BIXLINK chime arpeggio. */
export const startRingtone = () => loop(() => {
  const v = getRingVolume() * 0.45;
  [659.25, 830.61, 987.77, 1318.5].forEach((f, i) => tone([f, f * 2], i * 0.16, 0.5, v, 'triangle'));
  [987.77, 1318.5].forEach((f, i) => tone([f], 1.0 + i * 0.16, 0.6, v * 0.8, 'triangle'));
}, 2600);

/** Caller waiting: soft dual-tone ringback. */
/** Standard ringback, identical on every phone: 425 Hz, 1 s on / 3 s off, fixed level (ignores ringtone choice/volume). */
export const RINGBACK = { hz: 425, onSec: 1, everyMs: 4000, gain: 0.32 } as const;
export const startRingback = () => loop(() => tone([RINGBACK.hz], 0, RINGBACK.onSec, RINGBACK.gain, 'sine'), RINGBACK.everyMs);

export const playConnected = () => { [784, 1175].forEach((f, i) => tone([f], i * 0.12, 0.25, 0.15, 'triangle')); };
export const playEnded = () => { [620, 460, 320].forEach((f, i) => tone([f], i * 0.18, 0.22, 0.14)); };

const DTMF: Record<string, [number, number]> = {
  '1': [697, 1209], '2': [697, 1336], '3': [697, 1477], '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
  '7': [852, 1209], '8': [852, 1336], '9': [852, 1477], '*': [941, 1209], '0': [941, 1336], '#': [941, 1477],
};
export const playDtmf = (k: string) => { const p = DTMF[k]; if (p) tone(p, 0, 0.14, 0.24); };

/* ---- Ringtone choices + member's own device ringtone (stored only on this phone) ---- */
export const RINGTONES = [
  { id: 'wa', name: 'Modern Chime (gaya WA)' },
  { id: 'cyber', name: 'BIX Cyber Pulse' },
  { id: 'crystal', name: 'Crystal Minimalist' },
  { id: 'titanium', name: 'Titanium Ring' },
  { id: 'lux', name: 'BIXLINK Luxury Arpeggio' },
  { id: 'fox', name: 'Fox Genesis Chime' },
  { id: 'obsidian', name: 'Obsidian Titanium' },
  { id: 'harp', name: 'Elegance Harp' },
  { id: 'classic', name: 'Digital Classic VIP' },
  { id: 'neon', name: 'Neon Future Pulse' },
  { id: 'device', name: 'Ringtone from my device' },
] as const;
const RKEY = 'bixcall-ring-id';
export const getRingId = () => { try { return localStorage.getItem(RKEY) || 'lux'; } catch { return 'lux'; } };
export const setRingId = (id: string) => { try { localStorage.setItem(RKEY, id); } catch { /* ignore */ } };

const DB = 'bixcall-ring', ST = 'files';
const db = () => new Promise<IDBDatabase>((res, rej) => { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(ST); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
export async function saveDeviceRingtone(f: File) { const d = await db(); await new Promise((res, rej) => { const t = d.transaction(ST, 'readwrite'); t.objectStore(ST).put({ blob: f, name: f.name }, 'custom'); t.oncomplete = res; t.onerror = () => rej(t.error); }); }
export async function loadDeviceRingtone(): Promise<{ blob: Blob; name: string } | null> {
  try { const d = await db(); return await new Promise(res => { const r = d.transaction(ST).objectStore(ST).get('custom'); r.onsuccess = () => res(r.result ?? null); r.onerror = () => res(null); }); } catch { return null; }
}
export async function clearDeviceRingtone() { try { const d = await db(); d.transaction(ST, 'readwrite').objectStore(ST).delete('custom'); } catch { /* ignore */ } }

const PATTERNS: Record<string, [() => void, number]> = {
  wa: [() => { const v = getRingVolume() * 0.4; ([[880, 0], [1108.7, 0.12], [1318.5, 0.24], [1108.7, 0.6], [1318.5, 0.72], [1760, 0.84]] as const).forEach(([f, t]) => tone([f], t, 0.32, v, 'sine')); }, 2400],
  cyber: [() => { const v = getRingVolume() * 0.22; [330, 495, 660, 990, 660, 990].forEach((f, i) => tone([f, f * 1.01], i * 0.11, 0.1, v, 'square')); tone([1320], 0.8, 0.35, v, 'triangle'); }, 2000],
  crystal: [() => { const v = getRingVolume() * 0.35; [1567.98, 2093, 2637].forEach((f, i) => tone([f], i * 0.22, 1.1, v, 'sine')); }, 3000],
  titanium: [() => { const v = getRingVolume() * 0.3; for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) tone([440, 480], r * 0.9 + i * 0.07, 0.06, v, 'triangle'); }, 3200],
  fox: [() => { const v = getRingVolume() * 0.33; [523.25, 587.33, 783.99, 880, 1046.5].forEach((f, i) => tone([f], i * 0.14, 0.45, v, 'sine')); }, 2400],
  obsidian: [() => { const v = getRingVolume() * 0.3; tone([392, 587.33], 0, 0.9, v, 'triangle'); tone([440, 659.25], 1.0, 0.9, v, 'triangle'); }, 2800],
  harp: [() => { const v = getRingVolume() * 0.32; [392, 493.88, 587.33, 783.99, 987.77, 1174.7].forEach((f, i) => tone([f], i * 0.1, 0.9, v, 'sine')); }, 2600],
  classic: [() => { const v = getRingVolume() * 0.22; for (let i = 0; i < 8; i++) tone([1300, 1700], i * 0.09, 0.07, v, 'square'); for (let i = 0; i < 8; i++) tone([1300, 1700], 1 + i * 0.09, 0.07, v, 'square'); }, 3000],
  neon: [() => { const v = getRingVolume() * 0.25; [220, 330, 440, 660].forEach((f, i) => tone([f, f * 1.5], i * 0.2, 0.18, v, 'sawtooth')); }, 2000],
};

/** Plays the member's chosen ringtone (built-in or from their device) until stop() is called. */
export function startChosenRingtone(id = getRingId()): () => void {
  if (id === 'device') {
    let el: HTMLAudioElement | null = null; let url = ''; let stopped = false; let fallback: (() => void) | null = null;
    void loadDeviceRingtone().then(f => {
      if (stopped) return;
      if (!f) { fallback = startRingtone(); return; }
      url = URL.createObjectURL(f.blob); el = new Audio(url); el.loop = true; el.volume = getRingVolume();
      const play = () => { if (!el || stopped) return; void el.play().then(() => { fallback?.(); fallback = null; reportAudioState(true); }).catch(() => { if (!stopped && !fallback) fallback = startRingtone(); reportAudioState(false); }); };
      retryDeviceAudio = play; play();
    });
    return () => { stopped = true; retryDeviceAudio = null; el?.pause(); if (url) URL.revokeObjectURL(url); fallback?.(); };
  }
  const p = PATTERNS[id]; return p ? loop(p[0], p[1]) : startRingtone();
}
