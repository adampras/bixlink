/** BIXTOK LIVE beauty filters + voice changer. Runs locally on the host phone, so viewers
 * receive the already-filtered video/audio with no extra data cost. */
export type FxLevels = { smooth: number; bright: number; clarity: number; glow: number; warm: number };
export type FaceFilter = { id: string; name: string; levels: FxLevels };
const L = (smooth: number, bright: number, clarity: number, glow: number, warm: number): FxLevels => ({ smooth, bright, clarity, glow, warm });
export const FACE_FILTERS: FaceFilter[] = [
  { id: 'none', name: 'Original', levels: L(0, 0, 0, 0, 0) },
  { id: 'youth', name: 'Youth Glow', levels: L(65, 35, 30, 45, 15) },
  { id: 'porcelain', name: 'Porcelain', levels: L(80, 45, 20, 20, 0) },
  { id: 'handsome', name: 'Clean Handsome', levels: L(40, 25, 55, 20, 5) },
  { id: 'bright', name: 'Bright Daylight', levels: L(35, 60, 30, 30, 5) },
  { id: 'golden', name: 'Golden Warmth', levels: L(45, 30, 30, 35, 55) },
  { id: 'cinema', name: 'Studio Cinema', levels: L(30, 10, 70, 15, 20) },
];
export const FX_SLIDERS: { key: keyof FxLevels; label: string }[] = [
  { key: 'smooth', label: 'Smooth skin' }, { key: 'bright', label: 'Brightness' },
  { key: 'clarity', label: 'Clarity' }, { key: 'glow', label: 'Fresh glow' }, { key: 'warm', label: 'Warmth' },
];
export const isNeutral = (l: FxLevels) => !l.smooth && !l.bright && !l.clarity && !l.glow && !l.warm;
export type VoiceFx = 'none' | 'robot' | 'deep' | 'echo' | 'studio';
export const VOICE_FX: { id: VoiceFx; name: string }[] = [
  { id: 'none', name: 'Normal' }, { id: 'studio', name: 'Studio' }, { id: 'echo', name: 'Echo' }, { id: 'deep', name: 'Deep' }, { id: 'robot', name: 'Robot' },
];

/** CSS filter for the sharp base layer (0–100 levels). */
export function baseCss(l: FxLevels): string {
  // Gentle, capped ranges so presets never wash out or darken faces.
  const b = 1 + l.bright * 0.0012 + l.glow * 0.0004, c = 1 + l.clarity * 0.0012 - l.smooth * 0.0008, s = 1 + l.glow * 0.0015;
  return `brightness(${b.toFixed(3)}) contrast(${c.toFixed(3)}) saturate(${s.toFixed(3)}) sepia(${(l.warm * 0.0012).toFixed(3)})`;
}

/** Draw the camera through a canvas: sharp layer + soft blurred skin layer blended on top.
 * Levels are read every frame so sliders update instantly without restarting the broadcast. */
export function filterVideo(src: MediaStreamTrack, get: () => FxLevels): { track: MediaStreamTrack; stop: () => void } | null {
  const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.srcObject = new MediaStream([src]); void v.play().catch(() => {});
  const s = src.getSettings(); const c = document.createElement('canvas'); c.width = s.width || 720; c.height = s.height || 1280;
  const ctx = c.getContext('2d'); const cap = (c as HTMLCanvasElement & { captureStream?: (fps?: number) => MediaStream }).captureStream;
  if (!ctx || !cap) return null;
  let raf = 0; let alive = true;
  const draw = () => {
    if (!alive) return;
    if (v.videoWidth && (c.width !== v.videoWidth || c.height !== v.videoHeight)) { c.width = v.videoWidth; c.height = v.videoHeight; }
    // Single light pass only: the old blur + overlay passes overloaded phones and smeared the video.
    const l = get(); ctx.globalAlpha = 1; ctx.filter = baseCss(l); ctx.drawImage(v, 0, 0, c.width, c.height);
    ctx.filter = 'none';
    raf = requestAnimationFrame(draw);
  };
  draw();
  const track = cap.call(c, 24).getVideoTracks()[0]; if (!track) { alive = false; return null; }
  return { track, stop: () => { alive = false; cancelAnimationFrame(raf); track.stop(); v.srcObject = null; } };
}

/** Web Audio voice effect on the microphone track. */
export function filterVoice(src: MediaStreamTrack, fx: VoiceFx): { track: MediaStreamTrack; stop: () => void } | null {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!AC) return null;
  const ac = new AC(); void ac.resume().catch(() => {});
  const input = ac.createMediaStreamSource(new MediaStream([src])); const out = ac.createMediaStreamDestination();
  if (fx === 'robot') {
    const mod = ac.createGain(); mod.gain.value = 0; const osc = ac.createOscillator(); osc.frequency.value = 55; osc.connect(mod.gain); osc.start();
    input.connect(mod); mod.connect(out);
  } else if (fx === 'deep') {
    const lp = ac.createBiquadFilter(); lp.type = 'lowshelf'; lp.frequency.value = 250; lp.gain.value = 12;
    const hp = ac.createBiquadFilter(); hp.type = 'lowpass'; hp.frequency.value = 2200; input.connect(lp).connect(hp).connect(out);
  } else if (fx === 'echo' || fx === 'studio') {
    const d = ac.createDelay(1); d.delayTime.value = fx === 'echo' ? 0.28 : 0.06; const fb = ac.createGain(); fb.gain.value = fx === 'echo' ? 0.4 : 0.18;
    const comp = ac.createDynamicsCompressor(); input.connect(comp); comp.connect(out); comp.connect(d); d.connect(fb); fb.connect(d); d.connect(out);
  } else input.connect(out);
  const track = out.stream.getAudioTracks()[0]; if (!track) { void ac.close(); return null; }
  return { track, stop: () => { track.stop(); void ac.close().catch(() => {}); } };
}
