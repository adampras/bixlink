# BIXCARE: lengkapi mockup Sovereign Lux

Beranda (lokasi, saldo, pencarian, 6 kategori, Top Rated Merchants) sudah dibangun. Sisa yang belum sesuai mockup:

## 1. Gambar 3D kategori yang masih ikon
- Buat 3 gambar baru gaya emas-ungu obsidian: kursi salon emas-ungu, tongkat caduceus emas bersayap, tudung saji (cloche) emas.
- Ganti juga gambar Auto Garage, Laundry, Car Rental bila perlu agar senada (mobil emas di garasi, mesin cuci emas, mobil ungu di showroom).

## 2. Menu bawah 5 tombol seperti mockup
- Home (Jelajah), Bookings (Pesanan), tombol tengah kubus emas 3D (Daftar Gerai / Mitra), Inbox, Profile.
- Inbox: daftar percakapan dengan gerai yang pernah dipesan, membuka BIX CALL / chat yang sudah ada.
- Profile: data akun + Dasbor Mitra (omzet dari pesanan tercatat) untuk pemilik gerai.
- Menu menempel di bawah, sejajar tombol bawaan HP, latar obsidian.

## 3. Header mockup
- Ikon menu kiri (buka filter/kategori), logo BIXCARE emas tengah, lonceng notifikasi kanan (status pesanan).
- Badge filter aktif (angka) di tombol filter.

## 4. Kartu merchant
- Foto gerai dengan perisai verifikasi di sudut, centang ungu, sub-kategori, bintang + jumlah ulasan riil, badge Open hijau, tombol favorit tersimpan di perangkat.

## Batasan
- Tidak ada nama/rating contoh; hanya gerai disetujui. Tidak mengubah database, pembayaran, atau RLS. Tampilan mewah hanya untuk akun yang ditunjuk seperti BIXGO.

## Teknis
- `src/routes/care.tsx` (tab: explore/orders/inbox/partner/profile), `BixcareLuxHome.tsx`, `bixcare-lux.css`, gambar baru di `src/assets`.
