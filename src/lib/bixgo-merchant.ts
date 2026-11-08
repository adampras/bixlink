import { supabase } from '@/integrations/supabase/client';

export const MERCHANT_BUCKET = 'bixgo-merchant';
export type Merchant = { id: string; owner_id: string; name: string; kind: 'food' | 'mart'; category: string; city: string; address: string; landmark: string; phone: string; logo_path: string | null; banner_path: string | null; open_time: string; close_time: string; is_open: boolean; status: string; review_note: string };
export type MenuItem = { id: string; merchant_id: string; name: string; description: string; category: string; price_idr: number; photo_path: string | null; in_stock: boolean; sort: number };
export type OrderLine = { id: string; name: string; price: number; qty: number };
export type MerchantOrder = { id: string; merchant_id: string; buyer_id: string; items: OrderLine[]; subtotal_idr: number; address: string; note: string; status: string; created_at: string };

export const rupiah = (n: number) => `Rp${Math.round(Number(n) || 0).toLocaleString('id-ID')}`;

/** Cart total from server-shaped lines; the server recomputes it from stored menu prices on order. */
export const cartTotal = (lines: { price: number; qty: number }[]) => lines.reduce((s, l) => s + l.price * Math.max(0, l.qty), 0);

/** Allowed next statuses per role — mirrors bixgo_merchant_order_set. */
export function nextStatuses(status: string, role: 'merchant' | 'buyer'): string[] {
  if (role === 'buyer') return status === 'pending' ? ['cancelled'] : [];
  return ({ pending: ['accepted', 'rejected'], accepted: ['ready'], ready: ['completed'] } as Record<string, string[]>)[status] ?? [];
}

export async function uploadMerchantPhoto(uid: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Pilih file gambar');
  if (file.size > 5 * 1024 * 1024) throw new Error('Maksimal 5 MB');
  const path = `${uid}/${crypto.randomUUID()}.${(file.name.split('.').pop() || 'jpg').toLowerCase()}`;
  const { error } = await supabase.storage.from(MERCHANT_BUCKET).upload(path, file, { contentType: file.type });
  if (error) throw error;
  return path;
}

export async function signPhotos(paths: (string | null | undefined)[]): Promise<Record<string, string>> {
  const list = [...new Set(paths.filter(Boolean) as string[])];
  if (!list.length) return {};
  const { data } = await supabase.storage.from(MERCHANT_BUCKET).createSignedUrls(list, 3600);
  const out: Record<string, string> = {};
  data?.forEach(d => { if (d.path && d.signedUrl) out[d.path] = d.signedUrl; });
  return out;
}

export const STATUS_LABEL: Record<string, string> = { pending: 'Menunggu', accepted: 'Disiapkan', ready: 'Siap diambil', completed: 'Selesai', cancelled: 'Dibatalkan', rejected: 'Ditolak', approved: 'Aktif', suspended: 'Ditangguhkan' };
