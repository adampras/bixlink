# BIXLINK — Saldo ringkas, kendali admin, Market & Updates

## Preview
Preview interaktif terlampir menyediakan tiga tampilan: **Market & Updates**, **Wallet**, dan **Admin**. Semua angka harga, saldo, serta berita pada preview adalah contoh desain, bukan data aktual.

## Perubahan
1. Kecilkan angka saldo utama WALLET menjadi 28px di ponsel dan 32px di layar lebih besar, dengan penanganan angka panjang. Hapus kalimat penjelasan kecil tepat di bawahnya; saldo dan perhitungan tidak berubah.
2. Simpan fitur pekerjaan 1–3 sebelumnya: halaman legal/about, pemeriksaan identitas opsional, dan informasi kesiapan tambahan. Tambahkan kendali OPEN/CLOSED terpisah di admin; awalnya CLOSED bagi member. Konten dan pengajuan yang sudah ada tidak dihapus. Halaman tertutup tidak dapat dibuka melalui tautan langsung oleh member.
3. Pernyataan penting mengenai risiko, proyeksi keuntungan, aset internal tanpa smart contract, dan konsekuensi transaksi tetap benar dan tersedia; kendali tampilan bukan pengganti kepatuhan hukum. Ini tidak mengubah proses staking atau keputusan withdraw.
4. Buat halaman **Market & Updates** bergaya terminal obsidian dengan aksen gold: BTC, ETH, BNB, SOL, DOGE, perubahan 24 jam, waktu pembaruan terakhir, serta pembaruan harga setiap 60 detik selama halaman terbuka. Pisahkan referensi harga BIX internal dari pasar global. Tampilkan status jujur saat sumber gagal, tanpa angka pengganti palsu.
5. Tambahkan pengumuman yang dikelola admin: judul, isi, kategori, waktu publikasi, draft/publish/unpublish. Member hanya melihat pengumuman terpublikasi. Buka halaman melalui ikon di header dan tautan dari notifikasi, tanpa menambah kepadatan navigasi bawah.
6. Uji saldo panjang, halaman tertutup, kendali admin, harga, dan publikasi pengumuman pada ponsel serta desktop.

## Detail teknis
- Kendali terpusat disimpan di app settings dan perubahan memerlukan owner terverifikasi melalui fungsi server terautentikasi.
- Data pengumuman memakai kebijakan baca untuk konten terpublikasi; penulisan hanya owner. Gunakan sumber harga yang sudah ada, bukan layanan berbayar baru.
- Halaman baru `/market` memiliki metadata tersendiri. Kondisi closed diterapkan pada halaman dan jalur data yang relevan, bukan sekadar menyembunyikan tautan.
- Tidak ada perubahan pembayaran, saldo, profit settlement, atau kewenangan withdraw.
