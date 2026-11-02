/** BIX CALL Voice Shield: cleans the microphone before it is sent.
 * Browser echo cancel + noise suppression, then a vocal band filter, a feedback notch,
 * a compressor/limiter and a soft noise gate so only the caller's voice passes. */
export type VoiceShield = { track: MediaStreamTrack; raw: MediaStream; setShield: (on: boolean) => void; stop: () => void };

export async function openVoiceShield(): Promise<VoiceShield> {
  const raw = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1, sampleRate: 48000, voiceIsolation: true } as MediaTrackConstraints,
  });
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return { track: raw.getAudioTracks()[0]!, raw, setShield: () => {}, stop: () => raw.getTracks().forEach(t => t.stop()) };
  const ctx = new AC({ sampleRate: 48000 });
  void ctx.resume().catch(() => {});
  const src = ctx.createMediaStreamSource(raw);
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 110; hp.Q.value = 0.7;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7200; lp.Q.value = 0.7;
  const notch = ctx.createBiquadFilter(); notch.type = 'peaking'; notch.frequency.value = 3200; notch.Q.value = 1.4; notch.gain.value = 0;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -26; comp.knee.value = 12; comp.ratio.value = 6; comp.attack.value = 0.004; comp.release.value = 0.2;
  const gate = ctx.createGain(); gate.gain.value = 1;
  const an = ctx.createAnalyser(); an.fftSize = 512;
  const dst = ctx.createMediaStreamDestination();
  src.connect(hp); hp.connect(lp); lp.connect(notch); notch.connect(comp); comp.connect(an); comp.connect(gate); gate.connect(dst);

  let shield = true;
  const buf = new Float32Array(an.fftSize);
  let open = 0;
  const tick = setInterval(() => {
    an.getFloatTimeDomainData(buf);
    let s = 0; for (let i = 0; i < buf.length; i++) { const v = buf[i] ?? 0; s += v * v; };
    const db = 20 * Math.log10(Math.sqrt(s / buf.length) + 1e-8);
    // Voice above ~-50 dB keeps the gate open for 350 ms; background below fades to 8%.
    if (db > -50) open = 7; else if (open > 0) open--;
    const target = !shield || open > 0 ? 1 : 0.08;
    gate.gain.setTargetAtTime(target, ctx.currentTime, open > 0 ? 0.01 : 0.12);
  }, 50);

  const setShield = (on: boolean) => {
    shield = on;
    // Shield also cuts the 3.2 kHz band where phone-to-phone howling builds up.
    notch.gain.setTargetAtTime(on ? -9 : 0, ctx.currentTime, 0.05);
  };
  setShield(true);
  const track = dst.stream.getAudioTracks()[0]!;
  return {
    track, raw, setShield,
    stop: () => { clearInterval(tick); raw.getTracks().forEach(t => t.stop()); track.stop(); void ctx.close().catch(() => {}); },
  };
}
