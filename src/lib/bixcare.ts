import { supabase } from '@/integrations/supabase/client';

export const CARE_BUCKET = 'bixcare';
export type Division = 'auto' | 'wash' | 'laundry' | 'rent';
export type Outlet = { id: string; owner_id: string; name: string; division: Division; city: string; address: string; phone: string; description: string; logo_path: string | null; qris_path: string | null; open_time: string; close_time: string; is_open: boolean; status: string; review_note: string; bank_name: string; bank_account: string; bank_holder: string; accept_bix: boolean; accept_usdt: boolean };
export type Service = { id: string; outlet_id: string; name: string; unit: string; price_idr: number; duration_min: number; available: boolean };
export type CareOrder = { id: string; outlet_id: string; merchant_id: string; buyer_id: string; items: { id: string; name: string; price: number; qty: number; unit: string }[]; total_idr: number; pay_method: PayMethod; fare_bix: number; fare_usdt: number; merchant_bix: number; merchant_usdt: number; fee_usdt: number; held_at: string | null; paid_at: string | null; pay_ref: string; schedule_at: string | null; note: string; stage: string; status: string; fee_bix: number; created_at: string };

export type PayMethod = 'bix' | 'usdt' | 'qris' | 'bank' | 'cash';
export const PAY_LABEL: Record<PayMethod, string> = { bix: 'Saldo BIX', usdt: 'Saldo USDT', qris: 'QRIS mitra', bank: 'Transfer bank mitra', cash: 'Tunai di kasir' };
/** In-app wallet methods are held at booking and settled on completion; others are paid straight to the outlet. */
export const isWalletPay = (m: string) => m === 'bix' || m === 'usdt';

export const DEFAULT_RATES: Record<Division, number> = { auto: 0.02, rent: 0.02, wash: 0.03, laundry: 0.03 };
export const MIN_GAS_BIX = 20;
export const IDR_PER_USD = 16000;
export const BIX_USD = 0.5;

/** Platform gas fee in BIX for a completed order — mirrors bixcare_order_set. */
export function gasFeeBix(totalIdr: number, division: Division, rates = DEFAULT_RATES): number {
  return Math.round((totalIdr * (rates[division] ?? 0.03)) / IDR_PER_USD / BIX_USD * 1e6) / 1e6;
}

/** Amount held from the buyer for wallet payments — mirrors bixcare_order_place. */
export function payQuote(totalIdr: number): { bix: number; usdt: number } {
  const usd = totalIdr / IDR_PER_USD;
  return { bix: Math.round(usd / BIX_USD * 1e6) / 1e6, usdt: Math.round(usd * 1e6) / 1e6 };
}

/** Merchant net after platform fee for wallet payments — mirrors bixcare_order_set. */
export function walletNet(amount: number, division: Division, rates = DEFAULT_RATES): number {
  return Math.round((amount - amount * (rates[division] ?? 0.03)) * 1e6) / 1e6;
}

/** Stage presets merchants tap to keep buyers informed. */
export const STAGES: Record<Division, string[]> = {
  auto: ['Diagnosa', 'Pengerjaan', 'Uji jalan', 'Siap diambil'],
  wash: ['Cuci salju', 'Bersih kolong', 'Pengeringan & semir', 'Siap diambil'],
  laundry: ['Penimbangan', 'Pencucian', 'Setrika uap', 'Packing', 'Siap ambil / diantar'],
  rent: ['Verifikasi KTP/SIM', 'Unit disiapkan', 'Unit diserahkan', 'Unit kembali'],
};

/** Allowed next statuses per role — mirrors bixcare_order_set. */
export function careNext(status: string, role: 'merchant' | 'buyer'): string[] {
  if (role === 'buyer') return status === 'pending' ? ['cancelled'] : [];
  return ({ pending: ['accepted', 'rejected'], accepted: ['in_progress', 'completed'], in_progress: ['ready', 'completed'], ready: ['completed'] } as Record<string, string[]>)[status] ?? [];
}

export const CARE_STATUS: Record<string, string> = { pending: 'Menunggu', accepted: 'Diterima', in_progress: 'Dikerjakan', ready: 'Siap', completed: 'Selesai', cancelled: 'Dibatalkan', rejected: 'Ditolak', approved: 'Aktif', suspended: 'Ditangguhkan' };

export const rp = (n: number) => `Rp${Math.round(Number(n) || 0).toLocaleString('id-ID')}`;

export async function uploadCareFile(uid: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Pilih file gambar');
  if (file.size > 5 * 1024 * 1024) throw new Error('Maksimal 5 MB');
  const path = `${uid}/${crypto.randomUUID()}.${(file.name.split('.').pop() || 'jpg').toLowerCase()}`;
  const { error } = await supabase.storage.from(CARE_BUCKET).upload(path, file, { contentType: file.type });
  if (error) throw error;
  return path;
}

export async function signCare(paths: (string | null | undefined)[]): Promise<Record<string, string>> {
  const list = [...new Set(paths.filter(Boolean) as string[])];
  if (!list.length) return {};
  const { data } = await supabase.storage.from(CARE_BUCKET).createSignedUrls(list, 3600);
  const out: Record<string, string> = {};
  data?.forEach(d => { if (d.path && d.signedUrl) out[d.path] = d.signedUrl; });
  return out;
}
