/** BIX CALL camera looks: canvas filter applied to the outgoing camera, so the other side sees it too. Stored only on this phone. */
export const BEAUTY = [
  { id: 'off', name: 'Asli', css: 'none' },
  { id: 'glow', name: 'Glowing', css: 'brightness(1.14) contrast(0.96) saturate(1.06) blur(0.4px)' },
  { id: 'smooth', name: 'Kulit Halus', css: 'brightness(1.08) contrast(0.92) blur(0.8px)' },
  { id: 'fresh', name: 'Segar & Muda', css: 'brightness(1.1) contrast(1.04) saturate(1.18) blur(0.5px)' },
  { id: 'bright', name: 'Cerah Bersih', css: 'brightness(1.2) contrast(0.95) saturate(0.92) blur(0.5px)' },
  { id: 'warm', name: 'Warm Lux', css: 'brightness(1.08) sepia(0.12) saturate(1.1) blur(0.4px)' },
] as const;
const K = 'bixcall-beauty';
export const getBeauty = () => { try { return localStorage.getItem(K) || 'off'; } catch { return 'off'; } };
export const setBeauty = (id: string) => { try { localStorage.setItem(K, id); window.dispatchEvent(new Event('bix-beauty')); } catch { /* ignore */ } };
export const beautyCss = (id = getBeauty()) => BEAUTY.find(b => b.id === id)?.css ?? 'none';

/** LiveKit track processor: draws each camera frame through a CSS filter onto a canvas and sends the canvas stream. */
export function makeBeautyProcessor(id: string) {
  let raf = 0; let video: HTMLVideoElement | null = null; let canvas: HTMLCanvasElement | null = null;
  const proc = {
    name: 'bix-beauty',
    processedTrack: undefined as MediaStreamTrack | undefined,
    async init(opts: { track: MediaStreamTrack }) {
      const s = opts.track.getSettings();
      canvas = document.createElement('canvas'); canvas.width = s.width ?? 1280; canvas.height = s.height ?? 720;
      const ctx = canvas.getContext('2d'); if (!ctx) return;
      video = document.createElement('video'); video.muted = true; video.playsInline = true;
      video.srcObject = new MediaStream([opts.track]); await video.play().catch(() => {});
      const css = beautyCss(id);
      const draw = () => {
        if (video && canvas && video.videoWidth) {
          if (canvas.width !== video.videoWidth) { canvas.width = video.videoWidth; canvas.height = video.videoHeight; }
          ctx.filter = css; ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
        raf = requestAnimationFrame(draw);
      };
      draw();
      proc.processedTrack = canvas.captureStream(s.frameRate ?? 30).getVideoTracks()[0];
    },
    async restart(opts: { track: MediaStreamTrack }) { await proc.destroy(); await proc.init(opts); },
    async destroy() { cancelAnimationFrame(raf); proc.processedTrack?.stop(); if (video) video.srcObject = null; video = null; canvas = null; },
  };
  return proc;
}
