# Bonus 100 BIXP otomatis untuk member baru

## Penyebab
Saat ini bonus selamat datang 100 BIXP hanya masuk jika member **menekan klaim sendiri** di Fox Arena, dan itu pun ditolak bila Fox Arena masih tertutup. Jadi member yang baru daftar tidak melihat 100 BIXP.

## Yang akan diubah
1. **Otomatis saat akun aktif** — begitu email member terverifikasi (atau akun dibuat Owner 2–5 yang langsung aktif), 100 BIXP langsung tercatat sebagai bonus selamat datang. Tidak perlu tekan klaim, tidak bergantung Fox Arena dibuka.
2. **Member lama yang belum dapat** — semua member terverifikasi yang belum pernah menerima bonus selamat datang diberi 100 BIXP sekali.
3. **Aturan tetap aman**:
   - Hanya sekali per akun (tidak bisa dobel walau klaim manual ditekan).
   - Akun clone tidak mendapat bonus.
   - Nominal mengikuti angka "Welcome bonus" di Admin Fox Arena (bawaan 100).
   - Tetap BIXP promo (belum bisa ditukar ke BIX sampai Admin 1 menetapkan harga).
4. Kartu misi "Welcome bonus" di Arena otomatis tampil sebagai **sudah diterima**.

## Detail teknis
- Migration: fungsi security definer `bix_grant_welcome(p_user)` menyisipkan baris `bix_quest_claims` (`quest_key='welcome'`, `period_key='once'`) dengan `ON CONFLICT DO NOTHING`/cek exists; skip clone & email belum terverifikasi; nominal dari `bix_arena_config()->rewards->welcome`.
- Trigger `AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users` memanggil fungsi tersebut (dibungkus EXCEPTION agar tidak pernah memblokir signup).
- Backfill dalam migration yang sama untuk member terverifikasi tanpa klaim welcome.
- Pastikan saldo BIXP yang tampil membaca `bix_quest_claims` (verifikasi tampilan Arena/Wallet setelahnya).
