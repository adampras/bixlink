# Paket Hemat 6 — STAKE Premium

## Hasil yang akan dibuat
- Gunakan font angka khusus dengan bentuk nol bercoret pada saldo, harga, APY, durasi, tabel, dan kolom angka.
- Tingkatkan hierarki delapan paket staking: penanda paket populer dan hasil tertinggi, bar APY, serta harga dan durasi yang lebih mudah dibandingkan.
- Ubah “My requests” menjadi daftar profesional dengan badge status, tanggal pengajuan, dan progres masa lock untuk stake aktif.
- Tambahkan ringkasan estimasi hasil di dialog paket tanpa mengubah alur permintaan atau aturan backend.

## Batas paket hemat
- Fokus pada tampilan angka dan halaman STAKE saja.
- Tidak mengubah perhitungan, data, pembayaran, maupun persetujuan admin.
- Tetap non-custodial; semua hasil ditampilkan sebagai estimasi dan request tetap menunggu review admin.

## Teknis
- Tambahkan JetBrains Mono hanya untuk elemen numerik agar teks biasa tetap memakai font BIXLINK.
- Gunakan data `created_at`, `activated_at`, `lock_days`, dan `status` yang sudah tersedia untuk progres visual.
- Gunakan token warna dan komponen tombol yang sudah ada.
