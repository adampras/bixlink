import { supabase } from '@/integrations/supabase/client';

export type BixCard = { user_id: string; name: string; avatar_path: string | null; status_text: string | null; story: 'new' | 'seen' | null };

const cards = new Map<string, { at: number; p: Promise<BixCard | null> }>();
const urls = new Map<string, { at: number; p: Promise<string> }>();
const CARD_TTL = 60_000, URL_TTL = 50 * 60_000;
export const AVATAR_EVENT = 'bix-avatar-changed';

/** Public card for a member: name, photo path, status text and story state (server decides story visibility). */
export function loadCard(userId: string, fresh = false): Promise<BixCard | null> {
  const hit = cards.get(userId);
  if (!fresh && hit && Date.now() - hit.at < CARD_TTL) return hit.p;
  const p = Promise.resolve(supabase.rpc('bix_profile_card' as never, { p_user: userId } as never)).then(({ data }) => (data as BixCard | null) ?? null).catch(() => null);
  cards.set(userId, { at: Date.now(), p });
  return p;
}

/** Short-lived signed URL for a file in a private bucket, cached per path. */
export function signedUrl(bucket: 'bix-avatars' | 'bix-stories', path: string): Promise<string> {
  const key = `${bucket}:${path}`; const hit = urls.get(key);
  if (hit && Date.now() - hit.at < URL_TTL) return hit.p;
  const p = Promise.resolve(supabase.storage.from(bucket).createSignedUrl(path, 3600)).then(({ data }) => data?.signedUrl ?? '').catch(() => '');
  urls.set(key, { at: Date.now(), p });
  return p;
}

export function invalidateCard(userId?: string) {
  if (userId) cards.delete(userId); else cards.clear();
  window.dispatchEvent(new CustomEvent(AVATAR_EVENT, { detail: { userId } }));
}

/** Square-crop and shrink a picked image to a light 512px WebP/JPEG so it loads fast everywhere. */
export async function shrinkImage(file: File, size = 512): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(bmp.width, bmp.height);
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const ctx = c.getContext('2d'); if (!ctx) throw new Error('Canvas tidak tersedia');
  ctx.drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, size, size);
  bmp.close?.();
  const out = await new Promise<Blob | null>(r => c.toBlob(r, 'image/webp', 0.86));
  if (out && out.type === 'image/webp') return out;
  const jpg = await new Promise<Blob | null>(r => c.toBlob(r, 'image/jpeg', 0.86));
  if (!jpg) throw new Error('Failed to process photo');
  return jpg;
}

/** Upload a new profile photo for the signed-in member and remove the previous one. */
export async function uploadAvatar(userId: string, file: File, oldPath?: string | null): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Select a photo file (JPG, PNG, WebP).');
  if (file.size > 15 * 1024 * 1024) throw new Error('Maximum photo size is 15 MB.');
  const blob = await shrinkImage(file);
  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage.from('bix-avatars').upload(path, blob, { contentType: blob.type, upsert: false });
  if (up.error) throw new Error(up.error.message);
  const { error } = await supabase.rpc('bix_profile_set_avatar' as never, { p_path: path } as never);
  if (error) { await supabase.storage.from('bix-avatars').remove([path]); throw new Error(error.message); }
  if (oldPath) void supabase.storage.from('bix-avatars').remove([oldPath]);
  invalidateCard(userId);
  return path;
}

export async function removeAvatar(userId: string, oldPath?: string | null) {
  const { error } = await supabase.rpc('bix_profile_set_avatar' as never, { p_path: null } as never);
  if (error) throw new Error(error.message);
  if (oldPath) void supabase.storage.from('bix-avatars').remove([oldPath]);
  invalidateCard(userId);
}

export async function saveStatus(userId: string, text: string) {
  const { error } = await supabase.rpc('bix_profile_set_status' as never, { p_status: text } as never);
  if (error) throw new Error(error.message);
  invalidateCard(userId);
}
