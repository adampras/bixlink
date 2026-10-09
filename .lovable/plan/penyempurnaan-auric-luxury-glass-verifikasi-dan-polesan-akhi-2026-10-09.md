# Penyempurnaan "Auric Luxury Glass" — verifikasi dan polesan akhir

## Latar belakang
Tiga bagian sudah masuk ke kode pada giliran sebelumnya:
1. Mode terang mesin mining: latar gelap lembut di belakang video (`.mining-engine` light override) supaya pinggiran tidak bercak.
2. Garis tepi emas bening: kelas `.auric-card` (tepi champagne + bayangan emas halus).
3. Watermark logo transparan: `.auric-card::after` memakai `--brand-watermark` dari BixShell.

Ketiganya BELUM pernah dilihat hasilnya di layar. Plan ini memverifikasi lalu merapikan yang belum pas.

## Langkah kerja

### 1. Verifikasi visual (Playwright, mode terang + gelap, 384px dan 1280px)
- Beranda (mesin mining), Dompet, Staking, BOOST.
- Cek: tepian emas terlihat halus (tidak kuning tebal), watermark samar tidak mengganggu teks, mesin mining tidak ada bercak di mode terang, tanpa overflow, tanpa error runtime.

### 2. Polesan berdasarkan hasil verifikasi (CSS saja, tanpa mengubah logika keuangan)
- Intensitas watermark: naik/turunkan opasitas (sekarang 0.07 gelap / 0.06 terang) agar terlihat namun tidak menutup angka.
- Tepi emas di mode terang: sesuaikan kontras agar terbaca di latar terang tanpa jadi norak.
- Ukuran watermark proporsional per kartu (150px saat ini; kecilkan jika menabrak konten).
- Konsistensi: pastikan semua kartu yang memakai `.auric-card` terlihat satu keluarga visual, dan tema yang dipilih pengguna (Future Glass) tetap dihormati.

### 3. Ulangi verifikasi
- Screenshot sebelum/sesudah di `/tmp/browser/auric-glass/`.
- Laporan singkat ke pengguna dengan hasil yang terlihat.

## Batasan
- Tidak ada perubahan saldo, staking, konversi, atau RPC — murni presentasi.
- Semua warna lewat token semantik/styles.css, tanpa kelas warna hardcoded.
- Uji visual dan tsgo; tidak mengubah file autogen.
