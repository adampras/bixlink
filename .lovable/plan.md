# Dark Ledger Premium untuk Internal Market BIX

## Yang akan dibangun
- Ganti kartu BIX/USDT yang datar dengan model **Dark Ledger Premium** pilihan Anda.
- Tampilkan harga referensi besar, grafik premium, suplai tetap 21 juta BIX, dan valuasi penuh yang dihitung otomatis.
- Pertahankan label jelas bahwa ini harga referensi ledger internal dan setiap permintaan ditinjau admin.
- Tambahkan pengaturan **Internal Market** di panel owner untuk mengubah harga referensi BIX.

## Tampilan dan perilaku
- Tema tricolor tetap: ungu, hijau neon, dan gold pada latar obsidian.
- Harga awal mengikuti referensi yang dipilih pada gambar: **$0.842910**.
- Valuasi otomatis: harga × 21.000.000 BIX, sehingga angka selalu ikut berubah saat owner mengganti harga.
- Tidak menampilkan volume transaksi, kenaikan harian, atau likuiditas palsu.
- Tombol tetap menuju permintaan swap internal yang sudah ada.

## Detail teknis
- Simpan harga sebagai pengaturan publik yang hanya dapat diubah owner melalui fungsi tervalidasi.
- HOME membaca pengaturan harga bersama data market yang sudah ada.
- Ubah aturan lama dari “fixed $0.10” menjadi “owner-managed internal reference”; ini tetap bukan eksekusi exchange atau harga pasar global.
- Verifikasi panel owner, HOME desktop/ponsel, perhitungan valuasi, dan status build.
