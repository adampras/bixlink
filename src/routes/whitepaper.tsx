import { createFileRoute, Link } from '@tanstack/react-router';
import { BixShell } from '@/components/BixShell';
import { Button } from '@/components/ui/button';
import { tokenomicsPlan } from '@/lib/tokenomics-plan';

const OG = 'https://bixlink.lovable.app/__l5e/assets-v1/c44e33af-5cb2-4bf8-9d9f-ce8af06b3e8b/bix-reactor-poster.jpg';

export const Route = createFileRoute('/whitepaper')({
  head: () => ({ meta: [
    { title: 'Whitepaper — BIXLINK Protocol Documentation' },
    { name: 'description', content: 'BIXLINK tokenomics, presale strategies, non-custodial ledger architecture and pre-TGE security roadmap.' },
    { property: 'og:title', content: 'BIXLINK Whitepaper — Protocol Documentation' },
    { property: 'og:description', content: '21M BIX fixed supply, three-strategy presale, Sovereign allocation and an honest pre-TGE roadmap.' },
    { property: 'og:type', content: 'article' },
    { property: 'og:image', content: OG },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:image', content: OG },
  ] }),
  component: Whitepaper,
});


const chapters: { id: string; title: string; body: string[] }[] = [
  { id: 'abstract', title: '1. Abstract', body: [
    'BIXLINK is a proposed BIXCOIN staking, DeFi and real-world-asset ecosystem currently operating in a prelaunch phase on an internal ledger.',
    'This document describes the intended design. It is not a prospectus, a verified token issuance, or an offer of financial products.',
  ] },
  { id: 'tokenomics', title: '2. Tokenomics — 21M hard cap', body: [
    'Planned standard: BEP-20 on BNB Smart Chain with a fixed supply of 21,000,000 BIX. Minting is intended to be renounced at deployment so supply can never increase.',
    'A 1,000,000 BIX Genesis Reserve is held in an owner-only singleton vault. It is initialized once, is never shown in member balances and cannot be generated again.',
  ] },
  { id: 'presale', title: '3. Three-strategy presale engine', body: [
    'Hybrid (Dual Engine): part of the package becomes locked BIX, the remainder earns a daily USDT rate during the release period.',
    'Dividend (Accumulator): full BIX allocation plus a daily USDT dividend, settled by whole elapsed days only.',
    'Founder (Pure Apex): full BIX allocation plus an annual BIX bonus and a Genesis certificate. Rates are snapshot per order, so later changes never affect existing positions.',
  ] },
  { id: 'sovereign', title: '4. Sovereign Singularity allocation', body: [
    'An institutional $100,000 tier strictly limited to 21 slots worldwide, numbered #SOV-01/21 to #SOV-21/21. The server rejects any purchase after the 21st slot.',
    'Holders receive a digital Omega Genesis plaque; physical plaque delivery and concierge access are arranged manually by the team.',
  ] },
  { id: 'architecture', title: '5. Non-custodial architecture & internal ledger', body: [
    'Balances shown in the app are internal ledger records, not on-chain tokens. Staking projections are display-only and never added to spendable balance without a settlement rule.',
    'Deposits are matched on-chain with one credit per transaction ID. Withdrawals and BIX/USDT conversions are owner-reviewed requests, never automatic exchange execution.',
    'Account data is protected by row-level access rules; administrative actions require server-verified owner identity.',
  ] },
  { id: 'roadmap', title: '6. Pre-TGE security & audit roadmap', body: [
    'Phase 1 Genesis staking & closed seed (active) → Phase 2 security audit & reserve lock → Phase 3 TGE & smart contract deployment → Phase 4 DEX liquidity & listing → Phase 5 card & merchant expansion.',
    'The BIX smart contract is not yet deployed. No contract address is published until deployment, so any address claimed before then is not official.',
  ] },
  { id: 'contract', title: '7. BEP-20 contract blueprint & verification', body: [
    'Planned parameters: name BIXLINK, symbol BIX, BNB Smart Chain (BEP-20), 18 decimals, fixed supply 21,000,000 minted once at deployment, no mint function, no hidden transfer fee, ownership renounced after distribution.',
    'Deployment is performed only from the owner TokenPocket wallet. The official contract address will be published here and inside the app at the same time — verify the address, not the ticker, since other tokens may also use the BIX symbol.',
    'Audit readiness checklist: fixed-supply source published, compiler version and bytecode match verified on BscScan, third-party audit (CertiK/Hacken format) report linked, liquidity lock proof, Genesis reserve wallet disclosed.',
    'Status: not deployed. Every item above is pending until deployment.',
  ] },
  { id: 'risk', title: '8. Legal & risk disclosures', body: [
    'Roadmap items are plans, not guarantees. APY figures are annualized illustrations, not promised returns.',
    'Crypto assets involve substantial risk, including total loss. Check the laws of your jurisdiction before participating.',
  ] },
];

function Whitepaper() {
  return <BixShell><main className="mx-auto max-w-6xl px-5 py-14 md:py-20">
    <div className="eyebrow">PROTOCOL DOCUMENTATION · v1.0 · PRELAUNCH</div>
    <h1 className="section-title">BIXLINK <span>WHITEPAPER</span></h1>
    <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">A transparent overview of supply, presale design, ledger architecture and the path to token generation.</p>
    <div className="mt-10 grid gap-8 lg:grid-cols-[220px_1fr]">
      <nav className="h-fit rounded-2xl border border-chart-3/25 bg-card/60 p-4 lg:sticky lg:top-24">
        <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-chart-3">Contents</div>
        <ol className="space-y-2 text-xs">{chapters.map(c => <li key={c.id}><a className="text-muted-foreground hover:text-chart-3" href={`#${c.id}`}>{c.title}</a></li>)}</ol>
      </nav>
      <div className="min-w-0 space-y-6">
        {chapters.map(c => <section id={c.id} key={c.id} className="scroll-mt-24 rounded-2xl border border-border bg-card/50 p-5 md:p-7">
          <h2 className="font-display text-xl font-bold text-chart-3 md:text-2xl">{c.title}</h2>
          <div className="mt-3 space-y-3">{c.body.map((p, i) => <p key={i} className="text-sm leading-7 text-muted-foreground">{p}</p>)}</div>
          {c.id === 'tokenomics' && <div className="mt-5 space-y-2">{tokenomicsPlan.map(({ title: name, percent: pct, amount }) => <div key={name}>
            <div className="flex justify-between text-xs"><span>{name}</span><b className="text-chart-3">{pct}% · {amount.toLocaleString('en-US')} BIX</b></div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-chart-3" style={{ width: `${pct * 2}%` }} /></div>
          </div>)}<p className="pt-1 text-[10px] text-muted-foreground">Proposed allocation, presentation only.</p></div>}
        </section>)}
        <Button asChild className="rounded-full bg-chart-3 text-background"><Link to="/">Back to BIXLINK</Link></Button>
      </div>
    </div>
  </main></BixShell>;
}
