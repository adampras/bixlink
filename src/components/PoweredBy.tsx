import { Cloud, Cpu, ShieldCheck, Wallet } from 'lucide-react';
import { CryptoIcon } from '@/components/CryptoIcon';

const coins = [['BTC', 'Bitcoin'], ['ETH', 'Ethereum'], ['BNB', 'BNB Smart Chain'], ['SOL', 'Solana'], ['USDT', 'Tether USDT · BEP-20']] as const;
const infra = [[Cpu, 'EVM Compatible'], [Wallet, 'Web3 Wallets · TokenPocket'], [Cloud, 'Cloudflare Edge'], [ShieldCheck, 'SHA-256 Encryption']] as const;

export function PoweredBy({ slim = false }: { slim?: boolean }) {
  if (slim) return <section className="powered-strip" title="Logos are trademarks of their owners and do not imply partnership or endorsement.">
    <div className="powered-strip-row"><span className="powered-strip-label">POWERED BY</span>{coins.map(([s]) => <span key={s} className="powered-strip-chip"><CryptoIcon symbol={s} size={14}/>{s}</span>)}</div>
    <p className="powered-strip-note">Trademarks of their owners · no partnership implied</p>
  </section>;
  return <section className="powered-by mx-auto max-w-6xl px-5 py-10 md:px-8">
    <div className="eyebrow justify-center">POWERED BY &amp; SUPPORTED PROTOCOLS</div>
    <div className="powered-row">{coins.map(([s, n]) => <span key={s} className="powered-badge"><CryptoIcon symbol={s} size={22}/>{n}</span>)}</div>
    <div className="powered-row">{infra.map(([I, n]) => <span key={n} className="powered-badge powered-badge--muted"><I size={16}/>{n}</span>)}</div>
    <p className="mt-3 text-center text-[10px] text-muted-foreground">Logos are trademarks of their owners and do not imply partnership or endorsement.</p>
  </section>;
}
