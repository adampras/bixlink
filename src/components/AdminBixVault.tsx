import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Coins, RefreshCw, ShieldCheck } from 'lucide-react';
import { getOwnerBixVault } from '@/lib/bixlink.functions';
import { Button } from '@/components/ui/button';
import { dateTime, number } from '@/lib/bixlink';

type Vault = { balance_bix: number; generated_at: string; updated_at: string };

export function AdminBixVault({ onMessage }: { onMessage: (message: string) => void }) {
  const getVault = useServerFn(getOwnerBixVault);
  const [vault, setVault] = useState<Vault | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const result = await getVault();
      setVault({ balance_bix: Number(result.balance_bix), generated_at: result.generated_at, updated_at: result.updated_at });
    } catch {
      onMessage('Could not load the owner BIX reserve.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  return <section className="owner-vault">
    <div className="owner-vault__head"><div><span className="eyebrow"><ShieldCheck size={14}/> OWNER ONLY</span><h2>BIX reserve vault</h2></div><Coins/></div>
    <p>This internal reserve is generated once for the verified owner. It never appears in member balances and refreshing cannot generate a second reserve.</p>
    <div className="owner-vault__balance"><span>Available reserve</span><strong className="numeric">{loading ? '—' : number(vault?.balance_bix ?? 0, { maximumFractionDigits: 2 })} BIX</strong><small>{vault ? `Created ${dateTime(vault.generated_at)}` : 'Preparing secure reserve…'}</small></div>
    <Button type="button" variant="outline" className="mt-5 rounded-full" onClick={load} disabled={loading}><RefreshCw/>{loading ? 'Checking…' : 'Refresh vault'}</Button>
  </section>;
}