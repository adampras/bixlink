/** Prospect funnel (from invite links ?entry=call|tok|go|care|presale). Presentation only — never affects referral, bonus or roles. */
export const ENTRY_KEY = 'bix-entry';
export const ENTRY_SEEN = 'bix-entry-hub-seen';
export type Entry = 'call' | 'tok' | 'go' | 'care' | 'presale';
export const ENTRIES: Entry[] = ['call', 'tok', 'go', 'care', 'presale'];
export const asEntry = (v: unknown): Entry | undefined => (typeof v === 'string' && (ENTRIES as string[]).includes(v) ? v as Entry : undefined);
export function saveEntry(v: unknown) { const e = asEntry(v); if (!e) return; try { localStorage.setItem(ENTRY_KEY, e); } catch { /* blocked */ } }
export function readEntry(): Entry | undefined { try { return asEntry(localStorage.getItem(ENTRY_KEY)); } catch { return undefined; } }
export const GATEWAY: Record<Entry, { id: string; to: string; kicker: string; title: string; line: string; cta: string }> = {
  call: { id: 'call', to: '/call', kicker: 'BIX CALL · SECURE CHANNEL', title: 'Saluran Komunikasi Sponsor', line: 'Panggilan suara, video & grup langsung dengan sponsor Anda.', cta: 'Masuk BIX CALL' },
  tok: { id: 'bixtok', to: '/bixtok', kicker: 'BIXTOK · CREATOR STAGE', title: 'Panggung Kreator BIXLINK', line: 'Tonton, unggah video dan bangun komunitas Anda.', cta: 'Masuk BIXTOK' },
  go: { id: 'bixgo', to: '/bixgo', kicker: 'BIXGO · MOBILITY GRID', title: 'Mobilitas Kota Anda', line: 'Ojek, mobil, food & kirim barang dalam satu aplikasi.', cta: 'Masuk BIXGO' },
  care: { id: 'care', to: '/care', kicker: 'BIXCARE · SERVICE NETWORK', title: 'Jaringan Layanan & Bisnis', line: 'Bengkel, laundry, rental hingga jasa profesional.', cta: 'Masuk BIXCARE' },
  presale: { id: 'presale', to: '/presale', kicker: 'PRESALE · PHASE 1', title: 'Alokasi Presale BIX', line: '$0.25/BIX · paket $100–$1.000 · vesting 1%/hari.', cta: 'Lihat Presale' },
};
