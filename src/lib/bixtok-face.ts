/** Center-crop source video to fill a W×H frame (object-fit: cover). */
export function coverCrop(vw: number, vh: number, W: number, H: number) {
  const s = Math.max(W / vw, H / vh); const sw = W / s, sh = H / s;
  return { sx: (vw - sw) / 2, sy: (vh - sh) / 2, sw, sh, w: W, h: H };
}
