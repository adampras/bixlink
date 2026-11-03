/** BIX CALL Voice Shield: cleans the microphone before it is sent.
 * Browser echo cancel + noise suppression, then a vocal band filter, four feedback notches,
 * a compressor/limiter, a noise gate tuned so only the nearby caller's voice passes,
 * a howl detector and an optional half-duplex "Ruang Dekat" duck. */
export type VoiceShield = {
  track: MediaStreamTrack; raw: MediaStream;
  setShield: (on: boolean) => void;
  /** Half-duplex: while the remote side talks, the local mic is lowered so the other phone's speaker cannot loop back. */
  setDuck: (on: boolean) => void;
  stop: () => void;
};

/** Gate thresholds (dBFS). Shield on: a soft voice at the mouth (~-40 dB) and normal speech (~-22..-15 dB) pass; crowd babble / a nearby speaker (~-45 dB and below, after OS noise suppression) is cut. */
export const GATE_DB = { shield: -42, normal: -50 } as const;
/** Gate tuning: hold ~600 ms after the last word so soft word endings are not chopped; a soft floor keeps breaths/quiet tails natural instead of dead silence. */
export const GATE_TUNE = { holdTicks: 12, hysteresisDb: 5, floor: 0.07 } as const;

/** One 50 ms gate step: returns the next hold counter and the gain target (before duck/howl). Pure so it can be tested with simulated noisy rooms. */
export function gateStep(db: number, hold: number, shield = true): { hold: number; gain: number } {
  const th = shield ? GATE_DB.shield : GATE_DB.normal;
  let h = hold;
  if (db > th) h = GATE_TUNE.holdTicks; else if (h > 0 && db < th - GATE_TUNE.hysteresisDb) h--;
  const gain = !shield || h > 0 ? 1 : GATE_TUNE.floor;
  return { hold: h, gain };
}
/** Resonance bands where phone-to-phone howling builds up. */
export const HOWL_BANDS = [1800, 2400, 3200, 4100] as const;

export async function openVoiceShield(onHowl?: (howling: boolean) => void): Promise<VoiceShield> {
  const raw = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: { ideal: true }, noiseSuppression: { ideal: true }, autoGainControl: { ideal: true }, channelCount: 1, sampleRate: 48000, voiceIsolation: true, googEchoCancellation: true, googNoiseSuppression: true, googHighpassFilter: true, googTypingNoiseDetection: true } as MediaTrackConstraints,
  });
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return { track: raw.getAudioTracks()[0]!, raw, setShield: () => {}, setDuck: () => {}, stop: () => raw.getTracks().forEach(t => t.stop()) };
  const ctx = new AC({ sampleRate: 48000 });
  const wake = () => { if (ctx.state !== 'running') void ctx.resume().catch(() => {}); };
  wake(); const wakeT = setInterval(wake, 1000);
  const src = ctx.createMediaStreamSource(raw);
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 110; hp.Q.value = 0.7;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7800; lp.Q.value = 0.7;
  const notches = HOWL_BANDS.map(f => { const n = ctx.createBiquadFilter(); n.type = 'peaking'; n.frequency.value = f; n.Q.value = 6; n.gain.value = 0; return n; });
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -26; comp.knee.value = 14; comp.ratio.value = 2.8; comp.attack.value = 0.004; comp.release.value = 0.2;
  const gate = ctx.createGain(); gate.gain.value = 1;
  const an = ctx.createAnalyser(); an.fftSize = 1024; an.smoothingTimeConstant = 0.2;
  const dst = ctx.createMediaStreamDestination();
  let node: AudioNode = lp; src.connect(hp); hp.connect(lp);
  for (const n of notches) { node.connect(n); node = n; }
  node.connect(comp); comp.connect(an); comp.connect(gate); gate.connect(dst);

  let shield = true, duck = false, howlTicks = 0, howling = false;
  const buf = new Float32Array(an.fftSize);
  const spec = new Float32Array(an.frequencyBinCount);
  let open = 0;
  const tick = setInterval(() => {
    an.getFloatTimeDomainData(buf);
    let s = 0; for (let i = 0; i < buf.length; i++) { const v = buf[i] ?? 0; s += v * v; }
    const db = 20 * Math.log10(Math.sqrt(s / buf.length) + 1e-8);
    const g = gateStep(db, open, shield); open = g.hold;
    // Howl detector: one narrow tone far above the average spectrum for ~300 ms.
    an.getFloatFrequencyData(spec);
    let peak = -Infinity, sum = 0, cnt = 0;
    for (let i = 8; i < spec.length * 0.4; i++) { const v = spec[i] ?? -140; if (v > peak) peak = v; sum += v; cnt++; }
    const tonal = peak > -45 && peak - sum / Math.max(1, cnt) > 38;
    howlTicks = tonal ? howlTicks + 1 : Math.max(0, howlTicks - 1);
    const h = shield && howlTicks >= 6;
    if (h !== howling) { howling = h; onHowl?.(h); }
    const base = g.gain;
    const target = base * (duck ? 0.18 : 1) * (howling ? 0.35 : 1);
    gate.gain.setTargetAtTime(target, ctx.currentTime, open > 0 ? 0.006 : 0.14);
  }, 50);

  const setShield = (on: boolean) => {
    shield = on;
    for (const n of notches) n.gain.setTargetAtTime(on ? -6 : 0, ctx.currentTime, 0.05);
    if (!on && howling) { howling = false; howlTicks = 0; onHowl?.(false); }
  };
  setShield(true);
  const track = dst.stream.getAudioTracks()[0]!;
  return {
    track, raw, setShield, setDuck: (on: boolean) => { duck = on; },
    stop: () => { clearInterval(tick); clearInterval(wakeT); raw.getTracks().forEach(t => t.stop()); track.stop(); void ctx.close().catch(() => {}); },
  };
}
