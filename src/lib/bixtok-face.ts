/** Free on-device face tracking (Google MediaPipe Face Landmarker). Browser-only: load lazily from effects. */
export type FacePt = { x: number; y: number };
export type FaceFx = 'none' | 'smooth' | 'crown' | 'fox' | 'shades' | 'mask';
export const FACE_FX: { key: FaceFx; label: string; icon: string }[] = [
  { key: 'none', label: 'Tanpa', icon: '⊘' }, { key: 'smooth', label: 'Kulit Halus', icon: '✨' },
  { key: 'crown', label: 'Mahkota', icon: '👑' }, { key: 'fox', label: 'Rubah', icon: '🦊' },
  { key: 'shades', label: 'Kacamata', icon: '🕶️' }, { key: 'mask', label: 'Topeng Emas', icon: '🎭' },
];
const VER = '1.2.3';
type Landmarker = { detectForVideo: (v: HTMLVideoElement, t: number) => { faceLandmarks: FacePt[][] }; close: () => void };
let pending: Promise<Landmarker> | null = null;
export function loadFaceLandmarker(): Promise<Landmarker> {
  if (!pending) pending = (async () => {
    const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
    const files = await FilesetResolver.forVisionTasks(`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VER}/wasm`);
    const opts = (delegate: 'GPU' | 'CPU') => ({ baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task', delegate }, runningMode: 'VIDEO' as const, numFaces: 1 });
    try { return await FaceLandmarker.createFromOptions(files, opts('GPU')) as unknown as Landmarker; }
    catch { return await FaceLandmarker.createFromOptions(files, opts('CPU')) as unknown as Landmarker; }
  })().catch(e => { pending = null; throw e; });
  return pending;
}

export const FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
/** Object-fit: cover crop of a video into a W×H target. */
export function coverCrop(vw: number, vh: number, W: number, H: number) {
  const s = Math.max(W / vw, H / vh); const sw = W / s, sh = H / s;
  return { sx: (vw - sw) / 2, sy: (vh - sh) / 2, sw, sh, w: W, h: H };
}
type Crop = ReturnType<typeof coverCrop>;

/** Draws the chosen effect in un-mirrored canvas space (caller applies mirroring). */
export function drawFaceFx(ctx: CanvasRenderingContext2D, v: HTMLVideoElement, lm: FacePt[] | null, fx: FaceFx, cr: Crop, smooth = 60) {
  if (!lm || fx === 'none') return;
  const vw = v.videoWidth, vh = v.videoHeight; if (!vw) return;
  const k = cr.w / cr.sw;
  const P = (i: number) => { const p = lm[i]!; return { x: (p.x * vw - cr.sx) * k, y: (p.y * vh - cr.sy) * k }; };
  const top = P(10), chin = P(152), L = P(234), R = P(454), eL = P(33), eR = P(263);
  const fw = Math.hypot(R.x - L.x, R.y - L.y), fh = Math.hypot(chin.x - top.x, chin.y - top.y);
  const ang = Math.atan2(eR.y - eL.y, eR.x - eL.x);
  ctx.save(); ctx.filter = 'none';
  // Skin smoothing clipped to the face oval (always on lightly with AR effects).
  const sm = fx === 'smooth' ? Math.max(25, smooth) : 25;
  ctx.save(); ctx.beginPath(); FACE_OVAL.forEach((i, n) => { const p = P(i); n ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); }); ctx.closePath(); ctx.clip();
  ctx.globalAlpha = Math.min(0.85, sm / 100); ctx.filter = `blur(${Math.max(1.5, fw / 90)}px) brightness(1.06) saturate(1.05)`;
  ctx.drawImage(v, cr.sx, cr.sy, cr.sw, cr.sh, 0, 0, cr.w, cr.h);
  // keep eyes/mouth sharp by redrawing them crisp
  ctx.filter = 'none'; ctx.globalAlpha = 1;
  for (const [a, b] of [[33, 133], [362, 263], [61, 291]] as const) {
    const p = P(a), q = P(b); const cx = (p.x + q.x) / 2, cy = (p.y + q.y) / 2, rx = Math.hypot(q.x - p.x, q.y - p.y) * 0.75;
    ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, rx, rx * 0.55, ang, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(v, cr.sx, cr.sy, cr.sw, cr.sh, 0, 0, cr.w, cr.h); ctx.restore();
  }
  ctx.restore();
  const gold = (x: number, y: number, r: number) => { const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r); g.addColorStop(0, '#FFF2A8'); g.addColorStop(0.5, '#FFD700'); g.addColorStop(1, '#B8860B'); return g; };
  const ux = Math.sin(ang), uy = -Math.cos(ang); // "up" direction of head
  if (fx === 'crown') {
    const cx = top.x + ux * fh * 0.28, cy = top.y + uy * fh * 0.28, w = fw * 0.75, h = fh * 0.38;
    ctx.translate(cx, cy); ctx.rotate(ang); ctx.fillStyle = gold(0, 0, w / 2); ctx.strokeStyle = '#7a5600'; ctx.lineWidth = Math.max(1.5, w / 80);
    ctx.beginPath(); ctx.moveTo(-w / 2, h / 2); ctx.lineTo(-w / 2, -h / 6); ctx.lineTo(-w / 4, h / 8); ctx.lineTo(0, -h / 2); ctx.lineTo(w / 4, h / 8); ctx.lineTo(w / 2, -h / 6); ctx.lineTo(w / 2, h / 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    for (const [x, c] of [[-w / 4, '#A855F7'], [0, '#ef4444'], [w / 4, '#A855F7']] as const) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, h / 3, w / 22, 0, Math.PI * 2); ctx.fill(); }
  } else if (fx === 'fox') {
    for (const s of [-1, 1]) {
      const bx = top.x + s * Math.cos(ang) * fw * 0.32 + ux * fh * 0.1, by = top.y + s * Math.sin(ang) * fw * 0.32 + uy * fh * 0.1;
      ctx.save(); ctx.translate(bx, by); ctx.rotate(ang + s * 0.35); const w = fw * 0.3, h = fh * 0.45;
      ctx.fillStyle = '#E8761E'; ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(0, -h); ctx.lineTo(w / 2, 0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.moveTo(-w / 4, -h * 0.1); ctx.lineTo(0, -h * 0.75); ctx.lineTo(w / 4, -h * 0.1); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    const n = P(4); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(n.x, n.y, fw * 0.06, fw * 0.045, ang, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(20,20,20,.8)'; ctx.lineWidth = Math.max(1, fw / 140);
    for (const s of [-1, 1]) for (const d of [-0.04, 0, 0.04]) { ctx.beginPath(); ctx.moveTo(n.x + s * fw * 0.08, n.y + fh * d * 0.5); ctx.lineTo(n.x + s * fw * 0.38, n.y + fh * d * 1.6); ctx.stroke(); }
  } else if (fx === 'shades' || fx === 'mask') {
    const c = { x: (eL.x + eR.x) / 2, y: (eL.y + eR.y) / 2 }; const w = fw * (fx === 'mask' ? 1.05 : 0.95), h = fh * (fx === 'mask' ? 0.3 : 0.2);
    ctx.translate(c.x, c.y); ctx.rotate(ang);
    if (fx === 'shades') {
      ctx.shadowColor = '#A855F7'; ctx.shadowBlur = w / 12; ctx.fillStyle = 'rgba(8,8,14,.92)'; ctx.strokeStyle = '#A855F7'; ctx.lineWidth = Math.max(2, w / 60);
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.roundRect(s > 0 ? w * 0.04 : -w * 0.46, -h / 2, w * 0.42, h, h * 0.35); ctx.fill(); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(-w * 0.04, -h * 0.2); ctx.lineTo(w * 0.04, -h * 0.2); ctx.stroke();
    } else {
      ctx.fillStyle = gold(0, 0, w / 2); ctx.beginPath(); ctx.moveTo(-w / 2, -h * 0.3); ctx.quadraticCurveTo(0, -h * 0.9, w / 2, -h * 0.3); ctx.quadraticCurveTo(w * 0.42, h * 0.6, w * 0.1, h * 0.4); ctx.lineTo(0, h * 0.15); ctx.lineTo(-w * 0.1, h * 0.4); ctx.quadraticCurveTo(-w * 0.42, h * 0.6, -w / 2, -h * 0.3); ctx.closePath();
      for (const s of [-1, 1]) { const ex = s * fw * 0.2; ctx.moveTo(ex + w * 0.11, 0); ctx.ellipse(ex, 0, w * 0.11, h * 0.22, 0, 0, Math.PI * 2); }
      ctx.fill('evenodd');
    }
  }
  ctx.restore();
}
