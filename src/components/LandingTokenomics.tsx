import { Download, Eye, Target, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import poster from '@/assets/bixcoin-tokenomics-poster.jpg.asset.json';
import { tokenomicsPlan, tokenomicsSupply, tokenomicsVision, tokenomicsMissions } from '@/lib/tokenomics-plan';
import type { LandingContent } from '@/lib/landing-content';

export function LandingTokenomics({ content }: { content?: LandingContent }) {
  if (content?.tokenomicsEnabled === false) return null;
  return <section className="landing-tokenomics border-y border-border" aria-labelledby="landing-tokenomics-title">
    <div className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
      <header className="tokenomics-heading"><div><span className="eyebrow">FROM LAUNCH TO DAO</span><h2 id="landing-tokenomics-title" className="font-display text-3xl font-bold leading-tight md:text-4xl">BIXCOIN <span>TOKENOMICS</span></h2></div><span className="tokenomics-status">RANCANGAN TOKENOMICS</span></header>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">Pasokan terbatas, distribusi bertahap, dan partisipasi komunitas menjadi arah pengembangan BIXCOIN. Alokasi berikut merupakan rancangan, bukan bukti penguncian token di smart contract.</p>
      <div className="tokenomics-main">
        <figure className="tokenomics-supply"><figcaption><small>TOTAL SUPPLY</small><strong>{tokenomicsSupply.toLocaleString('en-US')} <span>BIX</span></strong></figcaption><div className="tokenomics-donut" role="img" aria-label="Alokasi BIX: reward 50 persen, likuiditas 15 persen, marketing 10 persen, treasury 10 persen, team 10 persen, pengembangan 5 persen"><div><strong>21M</strong><span>BIXCOIN</span><small>PROPOSED FIXED SUPPLY</small></div></div><p className="mt-4 text-center text-xs leading-5 text-muted-foreground">Rencana tanpa minting tambahan.<br/>Mekanisme deflasi memerlukan aturan terpisah.</p></figure>
        <div className="tokenomics-allocations">{tokenomicsPlan.map((row, index) => <article className={`tokenomics-allocation tokenomics-category-${index}`} key={row.title}><div className="tokenomics-allocation-head"><span className="tokenomics-number">{String(index + 1).padStart(2, '0')}</span><h3>{row.title}</h3><strong>{row.percent}%</strong></div><div className="tokenomics-allocation-amount">{row.amount.toLocaleString('en-US')} BIX</div><p>{row.description}</p><span className="tokenomics-schedule">{row.schedule}</span></article>)}</div>
      </div>
      <div className="tokenomics-purpose"><div><h3><Eye size={20}/> VISI</h3><p>{tokenomicsVision}</p></div><div><h3><Target size={20}/> MISI</h3><ol>{tokenomicsMissions.map((mission, index) => <li key={mission}><span>0{index + 1}</span>{mission}</li>)}</ol></div></div>
      <div className="tokenomics-poster-band"><a href={poster.url} target="_blank" rel="noreferrer" aria-label="Lihat poster BIXCOIN tokenomics"><img src={poster.url} alt="Poster diagram lingkaran kaca BIXCOIN dengan enam alokasi tokenomics" width={1024} height={1536} loading="lazy"/></a><div><span className="eyebrow">BIXCOIN · SUPPLY DESIGN</span><h3 className="mt-2 font-display text-2xl font-bold">FROM LAUNCH TO DAO</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">Enam alokasi dalam satu poster: supply, rencana distribusi, serta visi dan misi BIXCOIN.</p><div className="mt-5 flex flex-wrap gap-2"><Button asChild variant="outline" size="sm"><a href={poster.url} target="_blank" rel="noreferrer"><ArrowUpRight/> Lihat poster</a></Button><Button asChild size="sm"><a href={poster.url} download="bixcoin_tokenomics_poster.jpg"><Download/> Unduh poster</a></Button></div></div></div>
      <p className="tokenomics-disclosure"><ShieldCheck size={18}/><span>Rancangan tokenomics. Penguncian kontrak, audit, wallet publik, likuiditas, dan DAO belum dinyatakan aktif. Bukan jaminan harga, imbal hasil, atau keamanan investasi. Halving tidak menjamin kenaikan harga; jadwal ini tidak mengubah kontrak staking yang ada.</span></p>
    </div>
  </section>;
}