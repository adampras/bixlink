import bixLogo from '@/assets/bixlink-logo-gold.webp';

// Brand colours are the coins' own identity colours, intentionally not theme tokens.
const BRAND: Record<string, string> = {
  BTC: '#F7931A', ETH: '#627EEA', BNB: '#F3BA2F', SOL: '#9945FF', USDT: '#26A17B', XRP: '#23292F', DOGE: '#C2A633', ADA: '#0033AD', TRX: '#EB0029', TON: '#0098EA', AVAX: '#E84142',
};

function Glyph({ symbol }: { symbol: string }) {
  switch (symbol) {
    case 'BTC': return <path fill="#fff" d="M22.6 14.2c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.6-.4-.7 2.6-1.3-.3.7-2.6-1.6-.4-.7 2.7-1-.3-2.2-.5-.4 1.7s1.2.3 1.2.3c.7.2.8.6.8 1l-.8 3.1.2.1-.2-.1-1.1 4.4c-.1.2-.3.5-.8.4 0 0-1.2-.3-1.2-.3l-.8 1.9 2.1.5 1.1.3-.7 2.8 1.6.4.7-2.7 1.3.3-.7 2.7 1.6.4.7-2.8c2.8.5 4.9.3 5.8-2.2.7-2-.1-3.2-1.5-3.9 1.1-.3 1.9-1 2.1-2.5zm-3.7 5.2c-.5 2-3.9.9-5 .6l.9-3.6c1.1.3 4.6.8 4.1 3zm.5-5.2c-.5 1.8-3.3.9-4.2.7l.8-3.2c.9.2 3.9.7 3.4 2.5z"/>;
    case 'ETH': return <g fill="#fff"><path fillOpacity=".6" d="M16 4v8.9l7.5 3.3z"/><path d="M16 4 8.5 16.2l7.5-3.3z"/><path fillOpacity=".6" d="M16 22v6l7.5-10.4z"/><path d="M16 28v-6l-7.5-4.4z"/><path fillOpacity=".2" d="m16 20.6 7.5-4.4-7.5-3.3z"/><path fillOpacity=".6" d="m8.5 16.2 7.5 4.4v-7.7z"/></g>;
    case 'BNB': return <path fill="#fff" d="m12.1 14.5 3.9-3.9 3.9 3.9 2.3-2.3L16 6l-6.2 6.2zM6 16l2.3-2.3 2.3 2.3-2.3 2.3zm6.1 1.5 3.9 3.9 3.9-3.9 2.3 2.3L16 26l-6.2-6.2zm9.3-1.5 2.3-2.3L26 16l-2.3 2.3zm-3.1 0L16 13.7 14.3 15.4l-.2.2-.4.4L16 18.3z"/>;
    case 'SOL': return <g fill="#fff"><path d="M10.4 19.9a.6.6 0 0 1 .4-.2h12.6c.3 0 .4.3.2.5l-2.5 2.5a.6.6 0 0 1-.4.2H8.1c-.3 0-.4-.3-.2-.5z"/><path d="M10.4 9.2a.6.6 0 0 1 .4-.2h12.6c.3 0 .4.3.2.5l-2.5 2.5a.6.6 0 0 1-.4.2H8.1c-.3 0-.4-.3-.2-.5z"/><path d="M21.1 14.5a.6.6 0 0 0-.4-.2H8.1c-.3 0-.4.3-.2.5l2.5 2.5c.1.1.3.2.4.2h12.6c.3 0 .4-.3.2-.5z"/></g>;
    case 'USDT': return <path fill="#fff" d="M17.9 17.3v0c-.1 0-.7.1-1.9.1-1 0-1.7 0-1.9-.1v0c-3.7-.2-6.5-.8-6.5-1.6s2.8-1.4 6.5-1.6v2.5c.2 0 .9.1 1.9.1 1.2 0 1.8-.1 1.9-.1v-2.5c3.7.2 6.4.8 6.4 1.6s-2.7 1.4-6.4 1.6zm0-3.4v-2.3h5.2V8.2H8.9v3.4h5.2v2.3c-4.2.2-7.4 1-7.4 2s3.2 1.8 7.4 2v7.3h3.8v-7.3c4.2-.2 7.3-1 7.3-2s-3.1-1.8-7.3-2z"/>;
    default: return <text x="16" y="21" textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff">{symbol.slice(0, 1)}</text>;
  }
}

export function CryptoIcon({ symbol, size = 28 }: { symbol: string; size?: number }) {
  const s = symbol.toUpperCase().replace(/USDT$/, '') || 'USDT';
  if (s === 'BIX') return <img src={bixLogo} alt="" width={size} height={size} className="crypto-icon crypto-icon--bix" style={{ width: size, height: size }}/>;
  const fill = s === 'SOL' ? 'url(#sol-g)' : BRAND[s] ?? '#2a2f45';
  return <svg className="crypto-icon" width={size} height={size} viewBox="0 0 32 32" aria-hidden>
    {s === 'SOL' && <defs><linearGradient id="sol-g" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#9945FF"/><stop offset="1" stopColor="#14F195"/></linearGradient></defs>}
    <circle cx="16" cy="16" r="16" fill={fill}/><Glyph symbol={s}/>
  </svg>;
}
