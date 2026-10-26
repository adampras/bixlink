import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Coins, RefreshCw, ShieldCheck } from 'lucide-react';
import { getOwnerBixVault } from '@/lib/bixlink.functions';
import { Button } from '@/components/ui/button';
import { dateTime, number } from '@/lib/bixlink';
import { Link } from '@tanstack/react-router';
import { usePublicConfig } from '@/lib/useMember';
import { ArrowUpRight, Landmark } from 'lucide-react';

type Vault = { balance_bix: number; generated_at: string; updated_at: string };

export function AdminBixVault({ onMessage }: { onMessage: (message: string) => void }) {
  const getVault = useServerFn(getOwnerBixVault);
  const config = usePublicConfig();
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

  return <><section className="owner-vault">
    <div className="owner-vault__head"><div><span className="eyebrow"><ShieldCheck size={14}/> OWNER ONLY</span><h2>BIX reserve vault</h2></div><Coins/></div>
    <p>This internal reserve is generated once for the verified owner. It never appears in member balances and refreshing cannot generate a second reserve.</p>
    <div className="owner-vault__balance"><span>Available reserve</span><strong className="numeric">{loading ? '—' : number(vault?.balance_bix ?? 0, { maximumFractionDigits: 2 })} BIX</strong><small>{vault ? `Created ${dateTime(vault.generated_at)}` : 'Preparing secure reserve…'}</small></div>
    <Button type="button" variant="outline" className="mt-5 rounded-full" onClick={load} disabled={loading}><RefreshCw/>{loading ? 'Checking…' : 'Refresh vault'}</Button>
  </section>
    <section className="owner-consortium-access">
      <div className="flex items-center gap-3"><Landmark size={24} className="shrink-0 text-chart-3"/><div><span className="text-[10px] font-bold text-muted-foreground">PRIVATE · INVITATION ONLY</span><h2 className="font-display text-lg font-bold">Consortium Vault</h2></div></div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">$2,000,000 planned commitment · 5 partners. Not proof of locked funds or a bank guarantee.</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{config.data?.readiness.consortiumVaultEnabled ? 'Open · PIN required' : 'Closed · enable in Overview'}</span><Button asChild variant="outline"><Link to="/consortium-vault">Open vault<ArrowUpRight size={15}/></Link></Button></div>
    </section></>;
}