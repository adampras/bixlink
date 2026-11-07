const origin = 'https://bixlink.com';

export function ecosystemHead(path: string, title: string, description: string) {
  const url = `${origin}${path}`;
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: url },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [{ rel: 'canonical', href: url }],
  };
}

export const ecosystemDescription = 'BIXLINK menghubungkan BIX CALL untuk komunikasi, BIXGO untuk mobilitas, BIXTOK untuk video komunitas, BIX GOLD dan BIX PAY dalam satu ekosistem.';

export const ecosystemSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${origin}/#website`,
  name: 'BIXLINK',
  url: `${origin}/`,
  description: ecosystemDescription,
  about: [
    { '@type': 'Thing', name: 'BIX CALL', description: 'Percakapan, panggilan suara dan video antaranggota.' },
    { '@type': 'Thing', name: 'BIXGO', description: 'Pemesanan perjalanan, pengantaran dan Jastip sesuai ketersediaan mitra.' },
    { '@type': 'Thing', name: 'BIXTOK', description: 'Video pendek dan siaran langsung komunitas untuk anggota.' },
    { '@type': 'Thing', name: 'BIX GOLD', description: 'Referensi harga emas per gram dan pratinjau rencana layanan emas.' },
    { '@type': 'Thing', name: 'BIX PAY', description: 'Transfer BIX antaranggota dalam ledger internal, bukan jaringan pembayaran eksternal.' },
  ],
};