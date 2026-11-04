/** Shrink a photo in the browser before upload (max 1600px, JPEG ~0.8) so chat photos send in seconds. */
export async function compressImage(f: File, max = 1600, q = 0.8): Promise<Blob> {
  if (!f.type.startsWith('image/') || f.type === 'image/gif' || f.size < 300 * 1024) return f;
  try {
    const bmp = await createImageBitmap(f);
    const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext('2d')?.drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close?.();
    const out = await new Promise<Blob | null>(r => c.toBlob(r, 'image/jpeg', q));
    return out && out.size < f.size ? out : f;
  } catch { return f; }
}
