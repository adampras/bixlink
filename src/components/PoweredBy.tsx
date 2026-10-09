import { Cloud, Cpu, ShieldCheck, Wallet } from 'lucide-react';
import { CryptoIcon } from '@/components/CryptoIcon';

const coins = [['BTC', 'Bitcoin'], ['ETH', 'Ethereum'], ['BNB', 'BNB Smart Chain'], ['SOL', 'Solana'], ['USDT', 'Tether USDT · BEP-20']] as const;
const infra = [[Cpu, 'EVM Compatible'], [Wallet, 'Web3 Wallets · TokenPocket'], [Cloud, 'Cloudflare Edge'], [ShieldCheck, 'SHA-256 Encryption']] as const;

export function PoweredBy() {
  return <section className="powered-by mx-auto max-w-6xl px-5 py-10 md:px-8">
    <div className="eyebrow justify-center">POWERED BY &amp; SUPPORTED PROTOCOLS</div>
    <div className="powered-row">{coins.map(([s, n]) => <span key={s} className="powered-badge"><CryptoIcon symbol={s} size={22}/>{n}</span>)}</div>
    <div className="powered-row">{infra.map(([I, n]) => <span key={n} className="powered-badge powered-badge--muted"><I size={16}/>{n}</span>)}</div>
    <p className="mt-4 text-center text-[10px] text-muted-foreground">Supported networks and technology. Logos are trademarks of their owners and do not imply partnership or endorsement.</p>
  </section>;
}
