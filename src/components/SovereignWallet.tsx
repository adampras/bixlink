import { useState, type CSSProperties } from 'react';
import { Fingerprint, ShieldCheck, Zap, Network, Sparkles, ArrowUpRight, ArrowDownLeft, Repeat, History, ExternalLink, X, Copy, Fuel } from 'lucide-react';
import walletArt from '@/assets/bix-lux-wallet.png';

/** Brand-colored token badges (symbol glyphs, not official artwork). */
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
const BINANCE: Record<string, string> = { BTC: 'BTCUSDT', ETH: 'ETHUSDT', BNB: 'BNBUSDT', SOL: 'SOLUSDT', XRP: 'XRPUSDT', TRX: 'TRXUSDT', DOGE: 'DOGEUSDT', ADA: 'ADAUSDT', TON: 'TONUSDT', USDC: 'USDCUSDT' };
const CHAINS: [string, string][] = [['BNB Chain', 'https://bscscan.com'], ['Arbitrum', 'https://arbiscan.io'], ['Solana', 'https://solscan.io'], ['Polygon', 'https://polygonscan.com']];
const FEATURES = [
  { Icon: ShieldCheck, t: 'MPC Shield', d: 'Seedless recovery', body: 'Planned: your signing key is split into 3 encrypted shards (device, cloud backup, recovery). Any 2 can restore access, so no single seed phrase can be stolen. Today, keep your own wallet recovery phrase offline.' },
  { Icon: Fingerprint, t: 'Fox Biometric', d: 'Face & fingerprint sign', body: 'Planned: approve transfers with Face ID or fingerprint through your phone’s secure passkey. Today, approvals happen inside your own wallet app (TokenPocket, Trust Wallet, MetaMask).' },
  { Icon: Zap, t: 'Gasless BIX', d: 'Member transfers', body: 'BIX PAY member transfers inside BIXLINK need no BNB gas. Open WALLET → BIX PAY to send BIX instantly to another member code.', link: '/wallet' },
  { Icon: Network, t: 'Multi-chain', d: 'Bridge & swap', body: 'Internal BIX ⇄ USDT swaps are available now in the app. Cross-chain bridging is planned and not yet deployed.', link: '/wallet' },
];
const QUICK = [
  { Icon: ArrowUpRight, t: 'Send', href: '/sovereign-wallet' },
  { Icon: ArrowDownLeft, t: 'Receive', href: '/sovereign-wallet' },
  { Icon: Repeat, t: 'Swap', href: '/wallet' },
  { Icon: History, t: 'History', href: '/wallet' },
];

type Sheet = { kind: 'token'; i: number } | { kind: 'feat'; i: number } | null;

export function SovereignWallet() {
  const [chain, setChain] = useState(0);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [price, setPrice] = useState<{ p: number; c: number } | null>(null);

  const openToken = (i: number) => {
    setSheet({ kind: 'token', i }); setPrice(null);
    const s = TOKENS[i][0];
    if (s === 'USDT') { setPrice({ p: 1, c: 0 }); return; }
    const pair = BINANCE[s]; if (!pair) return;
    fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${pair}`).then(r => r.json()).then((d: { lastPrice?: string; priceChangePercent?: string }) => { if (d.lastPrice) setPrice({ p: Number(d.lastPrice), c: Number(d.priceChangePercent) }); }).catch(() => {});
  };

  return <section className="sov-wallet" aria-label="BIX Sovereign Wallet">
    <div className="flex items-center justify-between gap-2"><span className="sov-kicker"><Sparkles size={12}/> BIX SOVEREIGN WALLET</span><a href="/sovereign-wallet" className="sov-soon">OPEN APP ↗</a></div>

    <div className="sov-emblem mt-3">
      <img src={walletArt} alt="BIXLINK luxury wallet emblem" width={816} height={816} className="sov-emblem-img"/>
      <div className="text-center"><b className="font-display sov-emblem-title">WALLET BIXLINK</b><small className="block">Sovereign self-custody · BNB Smart Chain</small></div>
    </div>

    <div className="sov-card mt-3">
      <div className="flex items-start justify-between"><div><small>ON-CHAIN PREVIEW</small><b className="font-display">BIXLINK Sovereign</b></div><span className="sov-fox" aria-hidden>🦊</span></div>
      <button type="button" className="sov-addr font-mono" onClick={() => void navigator.clipboard?.writeText('0xB1X…F0X7')} aria-label="Copy preview address">0xB1X…F0X7 · {CHAINS[chain][0]} <Copy size={12} className="ml-1 inline"/></button>
      <div className="sov-chains" role="group" aria-label="Network">{CHAINS.map(([c], i) => <button key={c} type="button" aria-pressed={i === chain} onClick={() => setChain(i)}>{c}</button>)}</div>
      <div className="mt-2 flex items-center justify-between text-xs"><span className="flex items-center gap-1"><Fuel size={12}/> {chain === 0 ? '≈1 Gwei · Fast' : 'Preview network'}</span><a href={CHAINS[chain][1]} target="_blank" rel="noreferrer" className="flex items-center gap-1 underline">Explorer <ExternalLink size={11}/></a></div>
    </div>

    <div className="sov-quick mt-3">{QUICK.map(({ Icon, t, href }) => <a key={t} href={href}><Icon size={16}/><span>{t}</span></a>)}</div>

    <div className="sov-tokens mt-4">{TOKENS.map(([s, n, g, c1, c2], i) => <button type="button" key={s} onClick={() => openToken(i)} className="sov-token" style={{ '--c1': c1, '--c2': c2, animationDelay: `${i * -0.45}s` } as CSSProperties}><span className="sov-coin" aria-hidden>{g}</span><b>{s}</b><small>{n}</small></button>)}</div>
    <div className="sov-feats mt-4">{FEATURES.map(({ Icon, t, d }, i) => <button type="button" key={t} onClick={() => setSheet({ kind: 'feat', i })}><Icon size={16}/><b>{t}</b><small>{d}</small></button>)}</div>
    <p className="sov-note">On-chain balances for BIX, USDT and BNB are in OPEN APP. Other token symbols are shown for illustration; no balances or listings are implied. Prices from Binance may be delayed.</p>

    {sheet && <div className="fixed inset-0 z-[70] flex items-end justify-center bg-background/80 p-3" role="dialog" aria-modal="true" onClick={() => setSheet(null)}>
      <div className="sov-card w-full max-w-md space-y-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-end"><button type="button" aria-label="Close" onClick={() => setSheet(null)}><X size={18}/></button></div>
        {sheet.kind === 'token' ? (() => { const [s, n, g, c1, c2] = TOKENS[sheet.i]; const onchain = ['BIX', 'USDT', 'BNB'].includes(s); return <>
          <div className="flex items-center gap-3" style={{ '--c1': c1, '--c2': c2 } as CSSProperties}><span className="sov-coin" aria-hidden>{g}</span><div><b className="font-display text-lg">{s}</b><small className="block">{n}</small></div></div>
          <div className="numeric text-2xl font-bold">{s === 'BIX' ? 'Internal reference' : price ? `$${price.p.toLocaleString('en-US', { maximumFractionDigits: 6 })}` : '…'}{price && s !== 'USDT' && <span className={`ml-2 text-sm ${price.c >= 0 ? 'text-chart-2' : 'text-destructive'}`}>{price.c >= 0 ? '+' : ''}{price.c.toFixed(2)}% 24h</span>}</div>
          <small className="block">{onchain ? 'Live balance, Send and Receive on BNB Smart Chain are available in OPEN APP.' : 'Preview asset — wallet support for this network is planned.'}</small>
          <div className="grid grid-cols-2 gap-2">
            <a className="sov-onchain-btn justify-center" href="/sovereign-wallet"><ArrowUpRight size={14}/> Send</a>
            <a className="sov-onchain-btn justify-center" href="/sovereign-wallet"><ArrowDownLeft size={14}/> Receive</a>
            <a className="sov-onchain-btn justify-center" href="/wallet"><Repeat size={14}/> Swap</a>
            <a className="sov-onchain-btn justify-center" href={`https://www.coingecko.com/en/search?query=${s}`} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Info</a>
          </div>
        </>; })() : (() => { const f = FEATURES[sheet.i]; return <>
          <div className="flex items-center gap-2"><f.Icon size={20}/><b className="font-display text-lg">{f.t}</b></div>
          <p className="text-sm">{f.body}</p>
          {f.link && <a className="sov-onchain-btn w-full justify-center" href={f.link}>Open</a>}
        </>; })()}
      </div>
    </div>}
  </section>;
}
