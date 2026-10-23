# Staking Institusional Web3 (khusus jaringan Owner terpilih) + Terminal Trade

## Tahap 1 — Desain Staking "Sovereign Institutional"
Tampilan baru halaman STAKE yang hanya muncul untuk Owner yang dipilih Admin 1 beserta seluruh jaringan di bawahnya. Member lain tetap melihat desain sekarang.

- Admin 1: menu baru "Desain Staking per Jaringan" — pilih Owner (2–5 atau leader), nyalakan/matikan desain Institusional.
- Tampilan Institusional:
  - Header ringkas: total staking aktif, profit berjalan (label "proyeksi"), jumlah kontrak.
  - Daftar paket bergaya terminal institusi: kolom Tier, Nilai, Durasi, Rate, tombol Stake — rapi 2 kolom di HP.
  - Panel "Kontrak Saya" dengan progres kunci, tanggal jatuh tempo, dan status.
  - Panel keterbukaan risiko yang selalu tampil.
- Logika staking, harga, dan pembayaran tidak berubah — hanya tampilan.

## Tahap 2 — Terminal Trade BIX/USDT (semi-exchange internal)
Halaman baru TRADE memakai buku order P2P yang sudah ada (ledger internal, bukan bursa sungguhan, tanpa custody eksternal).
- Order book beli/jual, harga referensi owner, riwayat transaksi terakhir, form Buy BIX / Sell BIX.
- Bisa dibuka/ditutup Owner 1 lewat saklar modul.
- Label jelas: "Pasar internal — bukan listing exchange".

## Detail teknis
- Setting `staking_skin` di app_settings: `{ enabled, owners: uuid[] }`, ditulis via RPC owner-only.
- RPC `bix_staking_skin_for_me()` (security definer) mengecek apakah user = owner terpilih atau ada di downline (rekursif referral_codes, aman siklus).
- `stake.tsx` memilih komponen `InstitutionalStake` vs tampilan lama berdasarkan RPC tersebut.
- Route `/trade` membungkus fungsi P2P yang ada (`bix_p2p_post/take/cancel`), dibungkus ModuleGate dengan kunci modul baru `trade`.
- Tes: fungsi pemilih skin (owner terpilih → institusional, lainnya → default).
