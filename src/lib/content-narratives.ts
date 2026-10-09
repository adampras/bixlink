import type { ContentItem } from '@/lib/landing-content';

/** Bundled long-form narratives used when the owner has not written a custom detail. */
export const spaceNarratives: Record<string, string> = {
  FOREX: `BIXLINK mempelajari pasar valuta asing sebagai salah satu pilar diversifikasi ekosistem. Fokus kajian mencakup pasangan mata uang utama, pengelolaan risiko lintas mata uang, serta model lindung nilai (hedging) yang disiplin.

Setiap aktivitas yang berkaitan dengan kategori ini hanya ditampilkan setelah benar-benar tercatat dan ditinjau oleh pengelola. Tidak ada hasil yang dijanjikan; data historis tidak menjamin kinerja di masa depan.

Pilar utama:
• Kajian pasar global dan analisis pasangan mata uang utama
• Kerangka manajemen risiko dan batas eksposur yang jelas
• Pelaporan berkala yang dapat ditinjau komunitas`,
  CRYPTO: `Kategori CRYPTO mengembangkan utilitas BIX di dalam ekosistem BIXLINK: staking, BIX PAY, booster, dan konversi internal yang tercatat rapi pada ledger aplikasi.

BIXLINK memisahkan tegas antara catatan internal BIX dan token on-chain. Rencana penerbitan token BIX dengan suplai tetap 21.000.000 di BNB Chain merupakan langkah terpisah yang ditandatangani langsung dari dompet pemilik, tanpa aplikasi pernah menyimpan kunci pribadi.

Pilar utama:
• Utilitas BIX untuk staking, transfer, dan booster
• Model non-kustodial dan catatan transaksi transparan
• Persiapan smart contract suplai tetap di BNB Chain`,
  RWA: `Real-World Asset (RWA) adalah visi BIXLINK untuk menghubungkan nilai ekonomi nyata dengan ekosistem digital. Kajian mencakup properti, komoditas, dan usaha produktif yang dapat diverifikasi.

Sebelum aset apa pun diintegrasikan, diperlukan verifikasi kepemilikan, penilaian independen, dan kepatuhan hukum yang berlaku. Selama tahap ini, RWA adalah rencana pengembangan, bukan aset yang sudah dimiliki atau dijaminkan.

Pilar utama:
• Kurasi dan verifikasi aset nyata secara bertahap
• Kerangka legal dan kepatuhan sebelum integrasi
• Pelaporan terbuka atas status setiap aset`,
  ADVERTISING: `BIXLINK menyiapkan ruang promosi di aplikasi, situs, dan kanal komunitas sebagai sumber nilai ekosistem. Mitra Web3, merchant, dan proyek komunitas dapat menjangkau anggota BIXLINK secara tepat sasaran.

Pendapatan dari kategori ini hanya ditampilkan setelah tercatat dan ditinjau. Rencana ke depan adalah mengalokasikan sebagian nilai iklan untuk penguatan ekosistem dan program komunitas.

Pilar utama:
• Ruang iklan di aplikasi, situs, dan komunitas
• Kemitraan sponsor dan merchant Web3
• Pencatatan pendapatan yang transparan dan dapat ditinjau`,
  MARKETPLACE: `Marketplace BIXLINK dirancang sebagai pusat pertukaran utilitas di dalam ekosistem: produk digital, voucher jasa, layanan merchant, dan penawaran komunitas yang dapat dibayar menggunakan BIX PAY.

Transaksi direncanakan tercatat instan di ledger internal tanpa biaya gas, dengan verifikasi penjual dan perlindungan pembeli. Marketplace masih dalam tahap perencanaan; fitur akan dirilis bertahap setelah pengujian dan peninjauan.

Pilar utama:
• Pembayaran BIX PAY untuk merchant dan anggota
• Verifikasi penjual serta sistem ulasan yang jujur
• Katalog produk digital, voucher, dan layanan komunitas`,
};

export const roadmapNarratives: Record<string, string> = {
  PELUNCURAN: `Fase awal membangun fondasi BIXLINK: identitas merek, sistem akun dengan verifikasi email, keamanan login, dan ledger internal non-kustodial.

Target fase:
• Peluncuran landing page dan aplikasi member
• Registrasi, verifikasi akun, dan kode referral otomatis
• Fondasi ledger internal BIX dan USDT yang dapat ditinjau`,
  'STAKING BETA': `Fase uji staking menghadirkan delapan paket USDT dan BIX BOOST dengan proyeksi imbal hasil yang ditampilkan secara langsung.

Target fase:
• Pengujian paket staking dan kalkulasi proyeksi harian
• Persetujuan deposit dan penarikan yang ditinjau pengelola
• Riwayat transaksi lengkap untuk setiap anggota
Proyeksi bukan jaminan hasil.`,
  'DAFTAR RWA': `Fase ini menyusun kerangka verifikasi aset dunia nyata sebelum integrasi apa pun dilakukan.

Target fase:
• Standar kurasi dan penilaian aset
• Kajian aspek hukum dan kepatuhan
• Format pelaporan terbuka untuk status setiap aset`,
  EKOSISTEM: `Fase ekspansi memperkuat utilitas BIX dan komunitas: BIX PAY, market internal, mining vBIX, serta persiapan Marketplace.

Target fase:
• Transfer BIX antar-anggota secara instan
• Program komunitas dan kemitraan merchant
• Persiapan Marketplace berbasis BIX PAY`,
  DAO: `Fase tata kelola merancang peran komunitas dalam keputusan ekosistem melalui Treasury DAO Reserve.

Target fase:
• Rancangan mekanisme proposal dan pemungutan suara
• Aturan pengelolaan treasury yang transparan
• Transisi bertahap menuju keputusan berbasis komunitas`,
  '21 JUTA MILESTONE': `Fase peninjauan menyeluruh atas perkembangan ekosistem dengan rencana suplai tetap 21.000.000 BIX dan jadwal halving.

Target fase:
• Evaluasi distribusi alokasi tokenomics
• Peninjauan jadwal rilis dan halving
• Laporan perkembangan terbuka untuk komunitas
Ini adalah tonggak pengembangan, bukan target harga.`,
};

Object.assign(roadmapNarratives, { LAUNCH: roadmapNarratives.PELUNCURAN, 'STAKING APP BETA': roadmapNarratives['STAKING BETA'], 'RWA LISTING': roadmapNarratives['DAFTAR RWA'], ECOSYSTEM: roadmapNarratives.EKOSISTEM });

const key = (title: string) => title.trim().toUpperCase();

/** Fill missing long details from bundled narratives; append bundled defaults absent from saved content. */
export function withNarratives(items: ContentItem[], defaults: ContentItem[], narratives: Record<string, string>): ContentItem[] {
  const titles = new Set(items.map(item => key(item.title)));
  const merged = [...items, ...defaults.filter(item => !titles.has(key(item.title)) && key(item.title) === 'MARKETPLACE')];
  return merged.map(item => item.detail?.trim() ? item : { ...item, detail: narratives[key(item.title)] ?? item.description });
}
