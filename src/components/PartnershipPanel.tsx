import type { CSSProperties } from 'react';

const PARTNERS = [['Binance Pay', 'Crypto payments', 'diamond', '#F3BA2F', '#F3BA2F'], ['Mastercard', 'Card rails', 'rings', '#EB001B', '#F79E1B'], ['Visa', 'Global settlement', 'word', '#1A1F71', '#F7B600'], ['Tether', 'USDT liquidity', 'circle', '#26A17B', '#26A17B'], ['BNB Chain', 'BEP-20 network', 'diamond', '#F0B90B', '#F0B90B'], ['Alchemy Pay', 'Fiat gateway', 'circle', '#1E5BFF', '#00C2FF'], ['MoonPay', 'On-ramp', 'circle', '#7D00FF', '#B56BFF'], ['Chainlink', 'Price oracle', 'hex', '#375BD2', '#375BD2']] as const;

function Mark({ shape, name }: { shape: string; name: string }) {
  return <span className={`wp-mark wp-${shape}`} aria-hidden>{shape === 'rings' ? <><i/><i/></> : shape === 'word' ? 'VISA' : shape === 'circle' && name === 'Tether' ? '₮' : null}</span>;
}

export function PartnershipPanel({ variant = 'wallet' }: { variant?: 'wallet' | 'landing' }) {
  return <section className={`hub-partners hub-partners--${variant}`} aria-label="Partnership ecosystem">
    <div className="hub-partners-panel">
      <div className="hub-partners-bg" aria-hidden>{PARTNERS.map(([n, , shape, c1, c2], i) => <span key={n} className="hub-partners-ghost" style={{ '--c1': c1, '--c2': c2, left: `${(i % 4) * 26 + 2}%`, top: `${i < 4 ? 8 : 58}%`, animationDelay: `${i * -1.3}s` } as CSSProperties}><Mark shape={shape} name={n}/></span>)}</div>
      <header className="hub-partners-head"><small>ECOSYSTEM RAILS</small><h3>PARTNERSHIP</h3></header>
      <div className="hub-partners-grid">{PARTNERS.map(([n, s, shape, c1, c2], i) => <div key={n} className="hub-partner" style={{ '--c1': c1, '--c2': c2, animationDelay: `${i * -0.6}s` } as CSSProperties}><Mark shape={shape} name={n}/><b>{n}</b><span>{s}</span></div>)}</div>
      <p className="hub-partners-note">Supported networks & payment rails in the ecosystem. Trademarks belong to their owners; no official partnership or endorsement implied.</p>
    </div>
  </section>;
}
