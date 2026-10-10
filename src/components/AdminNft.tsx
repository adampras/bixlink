import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { NftCard } from '@/components/NftCard';
import { getNftCollection, reviewNft } from '@/lib/nft.functions';
import { NFT_TIERS, type NftTier } from '@/lib/nft';
import { money, number } from '@/lib/bixlink';
import { AdminNftCatalog } from '@/components/AdminNftCatalog';
import { AdminShopCatalog } from '@/components/AdminShopCatalog';

export function AdminNft({ onMessage }: { onMessage: (m: string) => void }) {
  const load = useServerFn(getNftCollection); const review = useServerFn(reviewNft); const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-nfts'], queryFn: () => load() });
  const [filter, setFilter] = useState<'ALL' | NftTier>('ALL');
  const [busy, setBusy] = useState('');
  const all = q.data ?? [];
  const pending = all.filter(c => c.status === 'sale_pending');
  const shown = all.filter(c => filter === 'ALL' || c.tier === filter);
  const act = async (id: string, approve: boolean) => { setBusy(id); try { await review({ data: { id, approve } }); onMessage(approve ? 'NFT bought back — BIX credited from owner vault.' : 'Sale rejected — card returned to member.'); await qc.invalidateQueries({ queryKey: ['admin-nfts'] }); } catch (e) { onMessage(e instanceof Error ? e.message : 'Review failed'); } finally { setBusy(''); } };
  return <section className="mt-8">
    <AdminShopCatalog onMessage={onMessage}/>
    <AdminNftCatalog onMessage={onMessage}/>
    <h2 className="font-display text-2xl font-bold">Reactor NFT collection</h2>
    <p className="mt-1 text-sm text-muted-foreground">{all.length} cards minted · {money(all.filter(c => c.status === 'minted' || c.status === 'redeemable').reduce((n, c) => n + Number(c.value_usd), 0))} outstanding value. Buybacks are paid in BIX from the owner vault.</p>
    {q.isPending ? <p className="mt-4">Loading…</p> : q.isError ? <p className="mt-4 text-destructive">Could not load NFTs.</p> : <>
      <h3 className="mt-6 font-bold">Pending sales ({pending.length})</h3>
      <div className="mt-2 space-y-2">{pending.map(c => <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3 text-sm">
        <span><b>#{c.serial}</b> {c.username} · {c.tier} {c.package_id} · {money(Number(c.value_usd))} → <b className="numeric text-chart-3">{number(Number(c.sale_bix), { maximumFractionDigits: 4 })} BIX</b> @ ${Number(c.sale_price_usd)}</span>
        <span className="flex gap-2"><Button size="sm" disabled={busy === c.id} onClick={() => act(c.id, true)}>Buy back</Button><Button size="sm" variant="outline" disabled={busy === c.id} onClick={() => act(c.id, false)}>Reject</Button></span>
      </div>)}{!pending.length && <p className="text-xs text-muted-foreground">No pending sales.</p>}</div>
      <div className="mt-6 flex flex-wrap gap-2">{(['ALL', ...NFT_TIERS] as const).map(t => <Button key={t} size="sm" variant={filter === t ? 'default' : 'outline'} className="rounded-full" onClick={() => setFilter(t)}>{t}</Button>)}</div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">{shown.map(c => <div key={c.id}><NftCard tier={c.tier as NftTier} packageId={c.package_id} valueUsd={Number(c.value_usd)} days={c.lock_days} serial={c.serial} artworkId={c.artwork_id} imagePath={c.artwork_image_path} compact/><p className="mt-1 text-center text-[11px] text-muted-foreground">{c.username} · {c.status}</p></div>)}</div>
    </>}
  </section>;
}
