import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { confirmPin, txFeedback } from '@/components/TxFeedback';
import { NftCard } from '@/components/NftCard';
import { getMyNfts, sellNft } from '@/lib/nft.functions';
import { nftBuybackBix, type NftTier } from '@/lib/nft';
import { number } from '@/lib/bixlink';

const LABEL: Record<string, string> = { minted: 'Contract running', redeemable: 'Ready to sell', sale_pending: 'Sale pending owner review', sold: 'Sold for BIX', burned: 'Burned (early unstake)' };

export function MyNftCollection({ userId, bixPrice }: { userId?: string | undefined; bixPrice: number }) {
  const load = useServerFn(getMyNfts); const sell = useServerFn(sellNft); const qc = useQueryClient();
  const [busy, setBusy] = useState('');
  const q = useQuery({ queryKey: ['my-nfts', userId], enabled: !!userId, queryFn: () => load() });
  if (!q.data?.length) return null;
  return <section className="mt-12">
    <div className="eyebrow">REACTOR NFT</div><h2 className="mt-2 font-display text-2xl font-black">My NFT collection</h2>
    <p className="mt-1 text-xs text-muted-foreground">In-app certificates, not on-chain tokens. When a contract completes, the card holds your package value; sell it to the owner for BIX at the current price (owner review).</p>
    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{q.data.map(c => <div key={c.id} className="space-y-2">
      <NftCard tier={c.tier as NftTier} packageId={c.package_id} valueUsd={Number(c.value_usd)} days={c.lock_days} serial={c.serial}/>
      <p className="text-center text-[11px] font-bold text-muted-foreground">{LABEL[c.status] ?? c.status}{c.sale_bix ? ` · ${number(Number(c.sale_bix), { maximumFractionDigits: 2 })} BIX` : ''}</p>
      {c.status === 'redeemable' && <Button size="sm" className="w-full rounded-full bg-chart-3 text-background" disabled={busy === c.id} onClick={async () => {
        if (!(await confirmPin())) return; setBusy(c.id);
        try { const r = await sell({ data: { id: c.id } }); txFeedback.success('Sale requested', `${number(Number(r.bix), { maximumFractionDigits: 2 })} BIX after owner approval`); await qc.invalidateQueries({ queryKey: ['my-nfts'] }); }
        catch (e) { txFeedback.fail('Sale failed', e); } finally { setBusy(''); }
      }}>Sell ≈ {number(nftBuybackBix(Number(c.value_usd), bixPrice), { maximumFractionDigits: 2 })} BIX</Button>}
    </div>)}</div>
  </section>;
}
