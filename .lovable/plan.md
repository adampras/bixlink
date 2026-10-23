# Staking Lux + Live Market Ticker (sekaligus)

## 1. Pita Live Market Ticker
- Pita berjalan tipis di atas halaman STAKE (dan HOME): BTC, ETH, BNB, SOL, DOGE dari feed pasar yang sudah ada + BIX (harga referensi owner, berlabel "Ref. internal").
- Harga, perubahan 24 jam hijau/merah, sparkline mini; berhenti bergerak bila pengguna memilih kurangi animasi.

## 2. Staking Sovereign Obsidian Vault (untuk jaringan terpilih)
Mengganti tabel institusional yang kaku:
- Header "Sovereign Institutional Desk": angka besar emas berputar (kontrak aktif, principal, profit proyeksi), garis cahaya emas halus, lencana Non-Custodial.
- Kartu paket kaca obsidian berbingkai emas tipis, lencana tier (Genesis, Prime, Sovereign, Consortium, ...), nilai besar, durasi & rate rapi, kilau emas saat disentuh, tombol Stake penuh. 2 kolom di HP.
- Paket teratas diberi sorotan "Flagship".
- Panel risiko tetap tampil.

## Tidak berubah
Logika staking, harga, pembayaran, dan siapa yang melihat desain (tetap diatur Admin 1).

## Detail teknis
- Komponen baru `MarketTicker` memakai `getHomeMarketData` (react-query, refresh 60 dtk), dipasang di `stake.tsx` dan `index.tsx`.
- Tulis ulang `InstitutionalStake.tsx` (header + kartu vault), gaya baru di `src/styles.css` dengan token semantik.
- Verifikasi typecheck, tes, dan tangkapan layar Playwright.
