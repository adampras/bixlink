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

/** Gate thresholds (dBFS). Shield on: a voice at the mouth (~-22..-15 dB) passes; a nearby phone speaker (~-44..-48 dB) is cut. */
export const GATE_DB = { shield: -40, normal: -50 } as const;
/** Resonance bands where phone-to-phone howling builds up. */
export const HOWL_BANDS = [1800, 2400, 3200, 4100] as const;

export async function openVoiceShield(onHowl?: (howling: boolean) => void): Promise<VoiceShield> {
  const raw = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false, channelCount: 1, sampleRate: 48000, voiceIsolation: true } as MediaTrackConstraints,
  });
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return { track: raw.getAudioTracks()[0]!, raw, setShield: () => {}, setDuck: () => {}, stop: () => raw.getTracks().forEach(t => t.stop()) };
  const ctx = new AC({ sampleRate: 48000 });
  const wake = () => { if (ctx.state !== 'running') void ctx.resume().catch(() => {}); };
  wake(); const wakeT = setInterval(wake, 1000);
  const src = ctx.createMediaStreamSource(raw);
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 130; hp.Q.value = 0.7;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6500; lp.Q.value = 0.7;
  const notches = HOWL_BANDS.map(f => { const n = ctx.createBiquadFilter(); n.type = 'peaking'; n.frequency.value = f; n.Q.value = 2; n.gain.value = 0; return n; });
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -26; comp.knee.value = 12; comp.ratio.value = 6; comp.attack.value = 0.004; comp.release.value = 0.2;
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
    if (db > (shield ? GATE_DB.shield : GATE_DB.normal)) open = 7; else if (open > 0) open--;
    // Howl detector: one narrow tone far above the average spectrum for ~300 ms.
    an.getFloatFrequencyData(spec);
    let peak = -Infinity, sum = 0, cnt = 0;
    for (let i = 8; i < spec.length * 0.4; i++) { const v = spec[i] ?? -140; if (v > peak) peak = v; sum += v; cnt++; }
    const tonal = peak > -45 && peak - sum / Math.max(1, cnt) > 38;
    howlTicks = tonal ? howlTicks + 1 : Math.max(0, howlTicks - 1);
    const h = shield && howlTicks >= 6;
    if (h !== howling) { howling = h; onHowl?.(h); }
    const base = !shield || open > 0 ? 1 : 0.06;
    const target = base * (duck ? 0.18 : 1) * (howling ? 0.35 : 1);
    gate.gain.setTargetAtTime(target, ctx.currentTime, open > 0 ? 0.01 : 0.12);
  }, 50);

  const setShield = (on: boolean) => {
    shield = on;
    for (const n of notches) n.gain.setTargetAtTime(on ? -9 : 0, ctx.currentTime, 0.05);
    if (!on && howling) { howling = false; howlTicks = 0; onHowl?.(false); }
  };
  setShield(true);
  const track = dst.stream.getAudioTracks()[0]!;
  return {
    track, raw, setShield, setDuck: (on: boolean) => { duck = on; },
    stop: () => { clearInterval(tick); raw.getTracks().forEach(t => t.stop()); track.stop(); void ctx.close().catch(() => {}); },
  };
}
