import { Download, Eye, Target, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import poster from '@/assets/bixcoin-tokenomics-poster.jpg.asset.json';
import { tokenomicsPlan, tokenomicsSupply, tokenomicsVision, tokenomicsMissions } from '@/lib/tokenomics-plan';
import { SwipeDeck } from '@/components/SwipeDeck';
import type { LandingContent } from '@/lib/landing-content';

export function LandingTokenomics({ content, member = false }: { content?: LandingContent | undefined; member?: boolean }) {
  if (content?.tokenomicsEnabled === false) return null;
  return <section className={`landing-tokenomics border-y border-border${member ? ' member-tokenomics' : ''}`} aria-labelledby="landing-tokenomics-title">
    <div className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
      <header className="tokenomics-heading"><div><span className="eyebrow">FROM LAUNCH TO DAO</span><h2 id="landing-tokenomics-title" className="font-display text-3xl font-bold leading-tight md:text-4xl">BIXCOIN <span>TOKENOMICS</span></h2></div><span className="tokenomics-status">TOKENOMICS FRAMEWORK</span></header>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">Fixed supply, phased distribution, and community governance guide the development of BIXCOIN. The following allocation represents a proposed design, not on-chain smart contract lock verification.</p>
      <div className="tokenomics-main">
        <figure className="tokenomics-supply"><figcaption><small>TOTAL SUPPLY</small><strong>{tokenomicsSupply.toLocaleString('en-US')} <span>BIX</span></strong></figcaption><div className="tokenomics-donut" role="img" aria-label="BIX Allocation: rewards 50 percent, liquidity 15 percent, marketing 10 percent, treasury 10 percent, team 10 percent, development 5 percent"><div><strong>21M</strong><span>BIXCOIN</span><small>PROPOSED FIXED SUPPLY</small></div></div><p className="mt-4 text-center text-xs leading-5 text-muted-foreground">No additional minting planned.<br/>Deflationary mechanics require separate implementation.</p></figure>
        <div className="tokenomics-allocations-swipe"><SwipeDeck label="BIXCOIN allocations" autoPlayMs={4200} alwaysSwipe>{tokenomicsPlan.map((row, index) => <article className={`tokenomics-allocation tokenomics-category-${index}`} key={row.title}><div className="tokenomics-allocation-head"><span className="tokenomics-number">{String(index + 1).padStart(2, '0')}</span><h3>{row.title}</h3><strong>{row.percent}%</strong></div><div className="tokenomics-allocation-amount">{row.amount.toLocaleString('en-US')} BIX</div><p>{row.description}</p><span className="tokenomics-schedule">{row.schedule}</span></article>)}</SwipeDeck></div>
      </div>
      <div className="tokenomics-purpose"><div><h3><Eye size={20}/> VISION</h3><p>{tokenomicsVision}</p></div><div><h3><Target size={20}/> MISSION</h3><ol>{tokenomicsMissions.map((mission, index) => <li key={mission}><span>0{index + 1}</span>{mission}</li>)}</ol></div></div>
      <div className="tokenomics-poster-band"><a href={poster.url} target="_blank" rel="noreferrer" aria-label="View BIXCOIN tokenomics poster"><img src={poster.url} alt="BIXCOIN glass donut chart poster showing seven tokenomics allocations of 21 million BIX" width={1024} height={1536} loading="lazy"/></a><div><span className="eyebrow">BIXCOIN · SUPPLY DESIGN</span><h3 className="mt-2 font-display text-2xl font-bold">FROM LAUNCH TO DAO</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">Seven allocations of the 21M BIX supply in one poster: supply mechanics, distribution schedule, and the BIXCOIN vision and mission.</p><div className="mt-5 flex flex-wrap gap-2"><Button asChild variant="outline" size="sm"><a href={poster.url} target="_blank" rel="noreferrer"><ArrowUpRight/> View poster</a></Button><Button asChild size="sm"><a href={poster.url} download="bixcoin_tokenomics_poster.jpg"><Download/> Download poster</a></Button></div></div></div>
      <p className="tokenomics-disclosure"><ShieldCheck size={18}/><span>Proposed tokenomics design. Smart contract locks, audits, public wallets, liquidity pools, and DAO governance are not yet declared active. This does not constitute a guarantee of token price, yields, or investment security. Halving events do not guarantee price appreciation; this schedule does not alter existing staking contracts.</span></p>
    </div>
  </section>;
}
