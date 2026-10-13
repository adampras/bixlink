export const tokenomicsSupply = 21_000_000;
export const tokenomicsPlan = [
  { title: 'Staking Rewards', percent: 35, amount: 7_350_000, releaseYears: 10, halvingYears: 2, schedule: '10 tahun · halving setiap 2 tahun', description: 'Rencana cadangan reward staking BIXCOIN dengan distribusi bertahap dan pengurangan emisi berkala.' },
  { title: 'Presale Allocation', percent: 15, amount: 3_150_000, schedule: 'Rilis bertahap 180–365 hari per paket', description: 'Alokasi khusus paket presale Genesis. BIX terkunci dan dilepas linear sesuai durasi paket; pool cap 3.150.000 BIX.' },
  { title: 'Liquidity Pool', percent: 15, amount: 3_150_000, lockMonths: 12, schedule: 'Rencana penguncian 12 bulan', description: 'Alokasi untuk rencana likuiditas DEX dan CEX. Perdagangan dan listing belum dinyatakan aktif.' },
  { title: 'Treasury DAO Reserve', percent: 10, amount: 2_100_000, schedule: 'Menuju persetujuan voting DAO', description: 'Rencana cadangan untuk kebutuhan darurat dan usulan buyback melalui tata kelola DAO mendatang.' },
  { title: 'Network & Leader Rewards', percent: 10, amount: 2_100_000, schedule: 'Reward berbasis omzet jaringan', description: 'Rencana bonus jaringan dalam BIX: reward ranking leader, modal virtual leader, dan insentif pengembangan komunitas.' },
  { title: 'Team & Founders', percent: 10, amount: 2_100_000, cliffMonths: 12, vestingMonths: 24, schedule: 'Cliff 12 bulan + vesting linear 24 bulan', description: 'Rencana tanpa distribusi selama dua belas bulan pertama, kemudian pelepasan linear selama 24 bulan berikutnya.' },
  { title: 'Marketing & Community', percent: 5, amount: 1_050_000, releaseMonths: 24, schedule: 'Distribusi bertahap 24 bulan', description: 'Rencana airdrop, bounty, kegiatan referral, kolaborasi kreator, dan iklan untuk pertumbuhan komunitas.' },
] as const;
export const tokenomicsVision = 'Membangun ekosistem BIXCOIN berbasis komunitas dengan pasokan terbatas, transparansi, dan arah tata kelola menuju DAO.';
export const tokenomicsMissions = ['Mengembangkan utilitas BIXLINK dan partisipasi komunitas.', 'Menyajikan alokasi serta jadwal distribusi secara terbuka.', 'Membangun tata kelola komunitas secara bertahap menuju DAO.'];
