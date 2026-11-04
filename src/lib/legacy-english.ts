/** English replacements for older owner-saved Indonesian copy, applied when content is read so the English UI stays consistent until the owner re-saves. */
const MAP: Record<string, string> = {
  'Menyiapkan identitas BIXLINK dan akses akun.': 'Establishing the BIXLINK identity and account access.',
  'Menguji staking dan catatan internal.': 'Testing staking and internal records.',
  'Menyusun kerangka verifikasi aset.': 'Building the asset verification framework.',
  'Mengembangkan utilitas dan komunitas.': 'Expanding utilities and the community.',
  'Merancang tata kelola komunitas.': 'Designing community governance.',
  'Meninjau perkembangan ekosistem dengan rencana suplai 21 juta BIX, bukan target harga.': 'Reviewing ecosystem progress against the planned 21 million BIX supply — not a price target.',
  '21 JUTA MILESTONE': '21M MILESTONE',
  'Rencana kajian valuta asing untuk diversifikasi BIXLINK. Hasil hanya ditampilkan setelah tercatat dan ditinjau.': 'Planned foreign-exchange research to diversify BIXLINK. Results are shown only after they are recorded and reviewed.',
  'Pengembangan utilitas digital dan kajian kripto. Catatan internal BIX terpisah dari perdagangan dan token on-chain.': 'Digital utility development and crypto research. Internal BIX records are separate from trading and on-chain tokens.',
  'Rencana pelaporan aset nyata yang transparan. Verifikasi aset dan aspek hukum diperlukan sebelum integrasi.': 'Planned transparent real-world asset reporting. Asset verification and legal review are required before integration.',
  'Rencana ruang promosi di aplikasi, situs dan komunitas. Pendapatan ditampilkan setelah tercatat dan ditinjau.': 'Planned promotional space across the app, website and community. Revenue is shown only after it is recorded and reviewed.',
};
const PARTS: Array<[string, string]> = [['Merchandise lengkap untuk koleksi loyalitas anda menjadi bagian BIXLINK', 'Complete merchandise for your loyalty collection as part of BIXLINK']];

export function toEnglish<T>(value: T): T {
  if (typeof value === 'string') {
    let s: string = MAP[value.trim()] ?? value;
    for (const [a, b] of PARTS) s = s.split(a).join(b);
    return s as T;
  }
  if (Array.isArray(value)) return value.map(toEnglish) as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toEnglish(v)])) as T;
  return value;
}
