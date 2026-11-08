import { supabase } from '@/integrations/supabase/client';

export const CARE_BUCKET = 'bixcare';
export type Division = 'auto' | 'wash' | 'laundry' | 'rent';
export type Outlet = { id: string; owner_id: string; name: string; division: Division; city: string; address: string; phone: string; description: string; logo_path: string | null; qris_path: string | null; open_time: string; close_time: string; is_open: boolean; status: string; review_note: string; bank_name: string; bank_account: string; bank_holder: string; accept_bix: boolean; accept_usdt: boolean; break_until?: string | null };
export type Service = { id: string; outlet_id: string; name: string; unit: string; price_idr: number; duration_min: number; available: boolean };
export type CareOrder = { id: string; outlet_id: string; merchant_id: string; buyer_id: string; items: { id: string; name: string; price: number; qty: number; unit: string }[]; total_idr: number; pay_method: PayMethod; fare_bix: number; fare_usdt: number; merchant_bix: number; merchant_usdt: number; fee_usdt: number; held_at: string | null; paid_at: string | null; pay_ref: string; schedule_at: string | null; note: string; stage: string; status: string; fee_bix: number; created_at: string; completed_at?: string | null; proof_path?: string | null; rating?: number | null; review?: string; rated_at?: string | null; service_note?: string; next_service_at?: string | null };

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

/** Accept image or PDF proof of a direct QRIS/bank payment. */
export async function uploadCareProof(uid: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/') && file.type !== 'application/pdf') throw new Error('Pilih gambar atau PDF');
  if (file.size > 5 * 1024 * 1024) throw new Error('Maksimal 5 MB');
  const path = `${uid}/proof-${crypto.randomUUID()}.${(file.name.split('.').pop() || 'jpg').toLowerCase()}`;
  const { error } = await supabase.storage.from(CARE_BUCKET).upload(path, file, { contentType: file.type });
  if (error) throw error;
  return path;
}

/** Short human order code shown on receipts. */
export const careCode = (id: string) => `BXC-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;

/** Display-only IDR conversions at the internal references (not a market quote). */
export function rateLine(totalIdr: number): string {
  const q = payQuote(totalIdr);
  return `${rp(totalIdr)} ≈ $${q.usdt.toFixed(2)} ≈ ${q.usdt.toFixed(2)} USDT ≈ ${q.bix.toFixed(2)} BIX`;
}

/** Short two-tone chime for new merchant orders (Web Audio, no asset). */
export function careChime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [880, 1320, 1760].forEach((f, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = f; o.type = 'sine';
      const t = ctx.currentTime + i * 0.18;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.4);
    });
    navigator.vibrate?.([200, 100, 200]);
    setTimeout(() => void ctx.close(), 1500);
  } catch { /* audio unavailable */ }
}

const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

/** Opens a printable BIXLINK e-receipt (user can Save as PDF). */
export function openCareReceipt(o: CareOrder, outlet?: Outlet) {
  const w = window.open('', '_blank'); if (!w) return;
  const rows = o.items.map(i => `<tr><td>${i.qty}× ${esc(i.name)}</td><td style="text-align:right">${rp(i.price * i.qty)}</td></tr>`).join('');
  const paid = o.pay_method === 'bix' ? `${o.fare_bix} BIX` : o.pay_method === 'usdt' ? `${o.fare_usdt} USDT` : rp(o.total_idr);
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Struk ${careCode(o.id)}</title><style>body{font-family:system-ui,sans-serif;max-width:420px;margin:24px auto;padding:20px;color:#111}h1{margin:0;font-size:22px;letter-spacing:2px}.gold{color:#b8860b}table{width:100%;border-collapse:collapse;font-size:14px}td{padding:6px 0;border-bottom:1px solid #eee}.tot td{font-weight:800;font-size:16px;border:0}.m{color:#666;font-size:12px}button{margin-top:16px;width:100%;padding:12px;border:0;border-radius:10px;background:#111;color:#ffd700;font-weight:700}@media print{button{display:none}}</style></head><body>
<h1>BIX<span class="gold">CARE</span></h1><p class="m">Struk digital resmi BIXLINK</p>
<p><b>${esc(outlet?.name ?? 'Outlet')}</b><br><span class="m">${esc(outlet ? `${outlet.address}, ${outlet.city}` : '')}</span></p>
<p class="m">No. order: <b>${careCode(o.id)}</b><br>Dipesan: ${new Date(o.created_at).toLocaleString('id-ID')}${o.completed_at ? `<br>Selesai: ${new Date(o.completed_at).toLocaleString('id-ID')}` : ''}<br>Status: ${esc(CARE_STATUS[o.status] ?? o.status)}</p>
<table>${rows}<tr class="tot"><td>Total</td><td style="text-align:right">${rp(o.total_idr)}</td></tr></table>
<p class="m">Metode: <b>${esc(PAY_LABEL[o.pay_method] ?? o.pay_method)}</b> · Dibayar: <b>${paid}</b>${o.pay_ref ? `<br>Ref: ${esc(o.pay_ref)}` : ''}</p>
<p class="m">Konversi BIX/USDT memakai acuan internal BIXLINK, bukan harga pasar.</p>
<button onclick="print()">Cetak / Simpan PDF</button></body></html>`);
  w.document.close();
}

export type CareStats = { orders: number; omzet: number; byMethod: Record<string, number>; bix: number; usdt: number; gas: number };
/** Completed-order totals since a date (default: all time). */
export function careStats(orders: CareOrder[], since?: Date): CareStats {
  const s: CareStats = { orders: 0, omzet: 0, byMethod: {}, bix: 0, usdt: 0, gas: 0 };
  for (const o of orders) {
    if (o.status !== 'completed') continue;
    const t = new Date(o.completed_at ?? o.created_at);
    if (since && t < since) continue;
    s.orders++; s.omzet += Number(o.total_idr);
    s.byMethod[o.pay_method] = (s.byMethod[o.pay_method] ?? 0) + Number(o.total_idr);
    s.bix += Number(o.merchant_bix); s.usdt += Number(o.merchant_usdt); s.gas += Number(o.fee_bix);
  }
  return s;
}
/** How many average direct-pay orders the current BIX gas balance still covers above the minimum. */
export function gasRunway(balance: number, avgFeeBix: number): number {
  if (avgFeeBix <= 0) return 0;
  return Math.max(0, Math.floor((balance - MIN_GAS_BIX) / avgFeeBix));
}
/** Two-hour booking slots between open and close (HH:MM), for the next `days` days. */
export function timeSlots(open: string, close: string, from: Date, days = 3, stepH = 2): Date[] {
  const [oh, om] = open.split(':').map(Number); const [ch] = close.split(':').map(Number);
  const out: Date[] = [];
  for (let d = 0; d < days; d++) {
    for (let h = oh ?? 8; h + stepH <= (ch ?? 17); h += stepH) {
      const t = new Date(from); t.setDate(t.getDate() + d); t.setHours(h, om ?? 0, 0, 0);
      if (t.getTime() > from.getTime() + 30 * 60000) out.push(t);
    }
  }
  return out;
}
export function careCsv(orders: CareOrder[]): string {
  const head = ['Kode', 'Tanggal', 'Status', 'Item', 'Total IDR', 'Metode', 'Diterima BIX', 'Diterima USDT', 'Gas BIX', 'Rating'];
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = orders.map(o => [careCode(o.id), new Date(o.created_at).toISOString().slice(0, 16).replace('T', ' '), o.status, o.items.map(i => `${i.qty}x ${i.name}`).join('; '), o.total_idr, o.pay_method, o.merchant_bix, o.merchant_usdt, o.fee_bix, (o as CareOrder & { rating?: number | null }).rating ?? ''].map(esc).join(','));
  return [head.join(','), ...rows].join('\n');
}
