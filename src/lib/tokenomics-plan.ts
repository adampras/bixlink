export const tokenomicsSupply = 21_000_000;
export const tokenomicsPlan = [
  { title: 'Mining & Staking Rewards', percent: 50, amount: 10_500_000, releaseYears: 10, halvingYears: 2, schedule: '10 tahun · halving setiap 2 tahun', description: 'Rencana cadangan reward staking BIXCOIN dengan distribusi bertahap dan pengurangan emisi berkala.' },
  { title: 'Liquidity Pool', percent: 15, amount: 3_150_000, lockMonths: 12, schedule: 'Rencana penguncian 12 bulan', description: 'Alokasi untuk rencana likuiditas DEX dan CEX. Perdagangan dan listing belum dinyatakan aktif.' },
  { title: 'Marketing & Community', percent: 10, amount: 2_100_000, releaseMonths: 24, schedule: 'Distribusi bertahap 24 bulan', description: 'Rencana airdrop, bounty, kegiatan referral, kolaborasi kreator, dan iklan untuk pertumbuhan komunitas.' },
  { title: 'Treasury DAO Reserve', percent: 10, amount: 2_100_000, schedule: 'Menuju persetujuan voting DAO', description: 'Rencana cadangan untuk kebutuhan darurat dan usulan buyback melalui tata kelola DAO mendatang.' },
  { title: 'Team & Founders', percent: 10, amount: 2_100_000, cliffMonths: 6, vestingMonths: 24, schedule: 'Cliff 6 bulan + vesting linear 24 bulan', description: 'Rencana tanpa distribusi selama enam bulan pertama, kemudian pelepasan linear selama 24 bulan berikutnya.' },
  { title: 'Ecosystem & Development', percent: 5, amount: 1_050_000, schedule: 'Pengembangan ekosistem', description: 'Rencana biaya pengembangan BIXLINK, audit kontrak, proses listing, dan kemitraan ekosistem.' },
] as const;
export const tokenomicsVision = 'Membangun ekosistem BIXCOIN berbasis komunitas dengan pasokan terbatas, transparansi, dan arah tata kelola menuju DAO.';
export const tokenomicsMissions = ['Mengembangkan utilitas BIXLINK dan partisipasi komunitas.', 'Menyajikan alokasi serta jadwal distribusi secara terbuka.', 'Membangun tata kelola komunitas secara bertahap menuju DAO.'];
