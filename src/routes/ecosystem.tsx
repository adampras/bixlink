import { createFileRoute, Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { ecosystemDescription, ecosystemHead, ecosystemSchema } from '@/lib/ecosystem-seo';
import callImage from '@/assets/eco/call.png';
import goImage from '@/assets/eco/go.png';
import tokImage from '@/assets/eco/tok.png';
import goldImage from '@/assets/eco/gold.png';
import payImage from '@/assets/eco/pay.png';

export const Route = createFileRoute('/ecosystem')({
  head: () => ({
    ...ecosystemHead('/ecosystem', 'Ekosistem BIXLINK — BIX CALL, BIXGO, BIXTOK, BIX GOLD & BIX PAY', ecosystemDescription),
    scripts: [{ type: 'application/ld+json', children: JSON.stringify(ecosystemSchema) }],
  }),
  component: EcosystemOverview,
});

function EcosystemOverview() {
  return <main className="min-h-screen bg-background text-foreground">
    <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-6"><Link to="/" className="font-display text-xl font-bold">BIXLINK</Link><Button asChild variant="outline"><Link to="/call">BIX CALL</Link></Button></header>
    <section className="mx-auto max-w-5xl px-5 py-10">
      <p className="text-sm text-primary">Komunikasi · Mobilitas · Komunitas</p>
      <h1 className="mt-4 font-display text-3xl font-bold md:text-5xl">Ekosistem BIXLINK</h1>
      <p className="mt-6 max-w-3xl text-base leading-8 text-muted-foreground">BIXLINK menghubungkan komunikasi, perjalanan dan konten komunitas dalam satu akun. Anda dapat mengenal layanan sehari-hari terlebih dahulu; membuka informasi ekosistem tidak mengharuskan pembelian paket staking.</p>
    </section>
    <div className="mx-auto max-w-5xl px-5">
      {[
        { name: 'BIX CALL', image: callImage, path: '/call' as const, body: 'Chat, panggilan suara, video call dan grup untuk berkomunikasi antaranggota BIXLINK. Percakapan membutuhkan akun; akses fitur mengikuti ketentuan layanan. Kualitas panggilan bergantung pada perangkat dan koneksi kedua pihak.' },
        { name: 'BIXGO', image: goImage, path: '/bixgo' as const, body: 'Perjalanan motor dan mobil, pengantaran serta Jastip. Lihat perkiraan tarif dan pilih layanan sesuai kebutuhan. Pemesanan membutuhkan akun; ketersediaan perjalanan bergantung pada mitra yang disetujui, online dan beroperasi di kota yang sama.' },
        { name: 'BIXTOK', image: tokImage, path: '/bixtok' as const, body: 'Ruang video pendek dan siaran langsung komunitas BIXLINK. Menonton, berinteraksi dan menjadi host mengikuti akses anggota serta pengaturan layanan. Aktivitas video tidak menjamin pendapatan atau imbal hasil.' },
        { name: 'BIX GOLD', image: goldImage, path: '/gold' as const, body: 'Informasi harga spot emas per gram dalam USD, IDR dan MYR, kalkulator serta pratinjau rencana layanan emas. Harga referensi dapat berbeda dari harga jual-beli dealer. Halaman ini bukan bukti kepemilikan emas, penitipan, sertifikasi atau tersedianya pencetakan fisik.' },
        { name: 'BIX PAY', image: payImage, path: '/pay' as const, body: 'Transfer BIX antaranggota melalui kode anggota atau QR ketika layanan diaktifkan. BIX PAY bekerja dalam ledger internal BIXLINK, bukan pembayaran kartu, transfer bank atau bukti aset on-chain. Login dan konfirmasi diperlukan untuk transfer.' },
      ].map(item => <section key={item.name} className="grid items-center gap-5 border-t border-border py-8 sm:grid-cols-[120px_1fr]">
        <img src={item.image} alt={item.name} width={120} height={120} className="size-24 object-contain sm:size-28" loading="lazy"/>
        <div><h2 className="font-display text-2xl font-bold">{item.name}</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{item.body}</p><Button asChild variant="link" className="mt-2 px-0"><Link to={item.path}>Buka {item.name} →</Link></Button></div>
      </section>)}
    </div>
    <footer className="mx-auto max-w-5xl space-y-4 border-t border-border px-5 py-8 text-sm leading-7 text-muted-foreground">
      <p>BIXLINK juga memiliki fitur staking internal yang terpisah dari kegunaan komunikasi dan mobilitas. Model finansial bersifat prelaunch/non-custodial; proyeksi bukan jaminan keuntungan. Ketersediaan layanan dan ketentuan dapat berubah sesuai pengaturan resmi.</p>
      <nav className="flex flex-wrap gap-5"><Link to="/about">Tentang & dukungan</Link><Link to="/terms">Ketentuan</Link><Link to="/privacy">Privasi</Link><Link to="/risk">Risiko</Link></nav>
    </footer>
  </main>;
}