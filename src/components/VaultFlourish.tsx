import logo from '@/assets/bixlink-logo-gold.webp';

export function VaultStardust() {
  return <div className="vault-stardust" aria-hidden>{Array.from({ length: 18 }, (_, i) => <span key={i} style={{ left: `${(i * 53) % 100}%`, animationDelay: `${(i * 0.7) % 9}s`, animationDuration: `${9 + (i % 5) * 2}s` }} className={i % 3 === 0 ? 'ruby' : ''}/>)}</div>;
}

export function VaultLogo() {
  return <div className="vault-logo" aria-hidden><i/><i/><img src={logo} alt="" width={60} height={60}/></div>;
}

export function VaultNode() {
  return <div className="vault-node"><span/>SHA-256 ENCRYPTED • SECURE NODE</div>;
}
