/** BIXTOK LIVE face filters + voice changer. Runs locally on the host phone, so viewers
 * receive the already-filtered video/audio with no extra data cost. */
export type FaceFilter = { id: string; name: string; css: string; overlay?: string };
export const FACE_FILTERS: FaceFilter[] = [
  { id: 'none', name: 'Original', css: 'none' },
  { id: 'youth', name: 'Youth Glow', css: 'blur(0.8px) brightness(1.12) contrast(1.04) saturate(1.18)' },
  { id: 'beauty', name: 'Soft Beauty', css: 'blur(1.2px) brightness(1.08) saturate(1.1)' },
  { id: 'porcelain', name: 'Porcelain', css: 'blur(1px) brightness(1.15) contrast(0.95) saturate(0.9)' },
  { id: 'golden', name: 'Golden Hour', css: 'sepia(0.35) saturate(1.4) brightness(1.06)' },
  { id: 'cinema', name: 'Cinema', css: 'contrast(1.2) saturate(0.85) brightness(0.95)' },
  { id: 'noir', name: 'Noir', css: 'grayscale(1) contrast(1.25)' },
  { id: 'neon', name: 'Neon', css: 'saturate(2) hue-rotate(250deg) contrast(1.1)' },
  { id: 'fox', name: 'Fox Ears', css: 'brightness(1.06) saturate(1.1)', overlay: '🦊' },
  { id: 'crown', name: 'VIP Crown', css: 'brightness(1.05) saturate(1.15)', overlay: '👑' },
  { id: 'shades', name: 'Cool Shades', css: 'contrast(1.1)', overlay: '🕶️' },
  { id: 'hearts', name: 'Love', css: 'brightness(1.08) saturate(1.2)', overlay: '💖' },
  { id: 'party', name: 'Party', css: 'saturate(1.3)', overlay: '🎉' },
  { id: 'cat', name: 'Kitty', css: 'brightness(1.08)', overlay: '🐱' },
];
export type VoiceFx = 'none' | 'robot' | 'deep' | 'echo' | 'studio';
export const VOICE_FX: { id: VoiceFx; name: string }[] = [
  { id: 'none', name: 'Normal' }, { id: 'studio', name: 'Studio' }, { id: 'echo', name: 'Echo' }, { id: 'deep', name: 'Deep' }, { id: 'robot', name: 'Robot' },
];

/** Draw the camera through a canvas with the filter; returns the new track and a stop(). */
export function filterVideo(src: MediaStreamTrack, f: FaceFilter, mirror: boolean): { track: MediaStreamTrack; stop: () => void } | null {
  const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.srcObject = new MediaStream([src]); void v.play().catch(() => {});
  const s = src.getSettings(); const c = document.createElement('canvas'); c.width = s.width || 720; c.height = s.height || 1280;
  const ctx = c.getContext('2d'); const cap = (c as HTMLCanvasElement & { captureStream?: (fps?: number) => MediaStream }).captureStream;
  if (!ctx || !cap) return null;
  let raf = 0; let alive = true; let t = 0;
  const draw = () => {
    if (!alive) return;
    if (v.videoWidth && (c.width !== v.videoWidth || c.height !== v.videoHeight)) { c.width = v.videoWidth; c.height = v.videoHeight; }
    ctx.filter = f.css; ctx.drawImage(v, 0, 0, c.width, c.height); ctx.filter = 'none';
    if (f.overlay) {
      t += 0.05; const size = c.width * 0.22; ctx.font = `${size}px serif`; ctx.textAlign = 'center';
      const y = c.height * 0.16 + Math.sin(t) * 6;
      ctx.save(); if (mirror) { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
      ctx.fillText(f.overlay, c.width / 2, y); ctx.globalAlpha = 0.85;
      ctx.font = `${size * 0.45}px serif`; ctx.fillText(f.overlay, c.width * 0.14, c.height * 0.9 + Math.cos(t) * 8); ctx.fillText(f.overlay, c.width * 0.86, c.height * 0.88 + Math.sin(t) * 8);
      ctx.restore();
    }
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
