import { Bitcoin, ChartNoAxesCombined, Coins, CreditCard, Landmark, ShieldCheck } from 'lucide-react';
import type { Readiness } from '@/lib/readiness';

/** Decorative financial symbols only; never represents balances or transactions. */
export function WalletFinanceMotion({ settings }: { settings?: Readiness }) {
  return <div className="wallet-finance-motion" aria-hidden="true">
    {settings?.animGlow && <div className="finance-coins"><span><Bitcoin/></span><span><Coins/></span></div>}
    {settings?.animShimmer && <div className="finance-network"><Landmark/><i/><CreditCard/><i/><ShieldCheck/></div>}
    {settings?.animFloat && <div className="finance-chart"><ChartNoAxesCombined/><span/><span/><span/><span/><span/></div>}
  </div>;
}