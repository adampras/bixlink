import { useState, type CSSProperties } from 'react';
import { Fingerprint, ShieldCheck, Zap, Network, Sparkles } from 'lucide-react';

/** Brand-colored token badges (symbol glyphs, not official artwork) for the on-chain wallet preview. */
const TOKENS: [string, string, string, string, string][] = [
  ['BIX', 'BIXCOIN', '🦊', '#FFD700', '#A855F7'],
  ['BTC', 'Bitcoin', '₿', '#F7931A', '#FFB84D'],
  ['ETH', 'Ethereum', 'Ξ', '#627EEA', '#A3B5FF'],
  ['BNB', 'BNB', '◆', '#F3BA2F', '#FFE08A'],
  ['USDT', 'Tether', '₮', '#26A17B', '#6FE3BE'],
  ['SOL', 'Solana', '◎', '#9945FF', '#14F195'],
  ['XRP', 'XRP', '✕', '#23292F', '#8A9BA8'],
  ['USDC', 'USD Coin', '$', '#2775CA', '#8DC1FF'],
  ['TRX', 'TRON', '▲', '#EF0027', '#FF7A8A'],
  ['DOGE', 'Dogecoin', 'Ð', '#C2A633', '#F0DC8A'],
  ['ADA', 'Cardano', '₳', '#0033AD', '#5C8DFF'],
  ['TON', 'Toncoin', '◇', '#0098EA', '#7FD4FF'],
];
const CHAINS = ['BNB Chain', 'Arbitrum', 'Solana', 'Polygon'];
const FEATURES = [
  { Icon: ShieldCheck, t: 'MPC Shield', d: 'Seedless recovery' },
  { Icon: Fingerprint, t: 'Fox Biometric', d: 'Face & fingerprint sign' },
  { Icon: Zap, t: 'Gasless BIX', d: 'Member transfers' },
  { Icon: Network, t: 'Multi-chain', d: 'Bridge & swap' },
];

export function SovereignWallet() {
  const [chain, setChain] = useState(0);
  return <section className="sov-wallet" aria-label="BIX Sovereign Wallet preview">
    <div className="flex items-center justify-between gap-2"><span className="sov-kicker"><Sparkles size={12}/> BIX SOVEREIGN WALLET</span><span className="sov-soon">COMING SOON</span></div>
    <div className="sov-card mt-3">
      <div className="flex items-start justify-between"><div><small>ON-CHAIN PREVIEW</small><b className="font-display">BIXLINK Sovereign</b></div><span className="sov-fox" aria-hidden>🦊</span></div>
      <div className="sov-addr font-mono">0xB1X…F0X7 · {CHAINS[chain]}</div>
      <div className="sov-chains" role="group" aria-label="Network preview">{CHAINS.map((c, i) => <button key={c} type="button" aria-pressed={i === chain} onClick={() => setChain(i)}>{c}</button>)}</div>
    </div>
    <div className="sov-tokens mt-4">{TOKENS.map(([s, n, g, c1, c2], i) => <div key={s} className="sov-token" style={{ '--c1': c1, '--c2': c2, animationDelay: `${i * -0.45}s` } as CSSProperties}><span className="sov-coin" aria-hidden>{g}</span><b>{s}</b><small>{n}</small></div>)}</div>
    <div className="sov-feats mt-4">{FEATURES.map(({ Icon, t, d }) => <div key={t}><Icon size={16}/><b>{t}</b><small>{d}</small></div>)}</div>
    <p className="sov-note">Phase 1 Genesis ledger is active in this app. Phase 2 on-chain wallet, bridge and smart contract are planned and not yet deployed. Token symbols are shown for illustration; no balances or listings are implied.</p>
  </section>;
}
