import { AdminP2PFleet } from "@/components/AdminP2PFleet";
import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getAdminWallet, reviewWalletTx, reviewSwap, addReward, updateSetting } from '@/lib/bixlink.functions';
import { dateTime, money, number } from '@/lib/bixlink';
import { OwnerRevenueTable } from '@/components/OwnerRevenueTable';
import { AdminDepositWallets } from '@/components/AdminDepositWallets';
import { DepositRecovery } from '@/components/DepositRecovery';
import type { DepositWallet } from '@/lib/deposit.functions';
import { Button } from '@/components/ui/button';
import { Check, X, Save, ArrowLeftRight } from 'lucide-react';

export function AdminWallet({ members, depositWallets, swapEnabled = false, onMessage }: { members: { id: string; email: string }[]; depositWallets?: DepositWallet[] | undefined; swapEnabled?: boolean; onMessage: (m: string) => void }) {
  const fetchData = useServerFn(getAdminWallet); const review = useServerFn(reviewWalletTx); const reviewExchange = useServerFn(reviewSwap); const reward = useServerFn(addReward); const save = useServerFn(updateSetting);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['admin-wallet'], queryFn: () => fetchData() });
  const txs = data?.transactions ?? []; const swaps = data?.swaps ?? [];
  const [filter, setFilter] = useState('pending');
  const [isSwapOpen, setIsSwapOpen] = useState(swapEnabled);
  const email = (id: string) => members.find(m => m.id === id)?.email ?? id.slice(0, 8);
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-wallet'] });
  const list = txs.filter(t => filter === 'all' || t.status === filter);
  const swapList = swaps.filter(t => filter === 'all' || t.status === filter);
  return <div className="mt-8 space-y-10">
    <section className="max-w-2xl rounded-[20px] border border-primary bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><h3 className="font-display text-lg font-black">BIX/USDT swap availability</h3><p className="mt-1 text-xs text-muted-foreground">Closed mode shows Coming soon and blocks requests in the backend.</p></div><label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={isSwapOpen} onChange={async e=>{const next=e.target.checked;setIsSwapOpen(next);try{await save({data:{key:'swap',value:{enabled:next}}});await qc.invalidateQueries({queryKey:['bix-public-config']});onMessage(next?'Swap is now open.':'Swap is now closed.');}catch{setIsSwapOpen(!next);onMessage('Could not update swap availability.');}}}/>{isSwapOpen?'OPEN':'CLOSED'}</label></div></section>
    <AdminDepositWallets initial={depositWallets} onMessage={onMessage}/>
    <AdminP2PFleet />
    <DepositRecovery onMessage={(m) => { onMessage(m); void refresh(); }}/>
    <OwnerRevenueTable/>
    <div><div className="flex flex-wrap gap-2">{['pending','approved','rejected','all'].map(s => <Button key={s} size="sm" variant={filter===s?'default':'outline'} className="rounded-full capitalize" onClick={()=>setFilter(s)}>{s}</Button>)}</div>
      <h3 className="mt-6 font-display text-lg font-black">Deposit, withdrawal & reward records</h3><div className="mt-3 space-y-2">{list.map(t => <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-border bg-card p-4 text-xs"><div className="min-w-0"><b className="text-sm capitalize">{t.type}</b> · {email(t.user_id)}<div className="text-muted-foreground">{dateTime(t.created_at)}</div><div className="break-all font-mono text-muted-foreground">{t.tx_hash ?? t.address ?? t.note}</div>{t.wallet_code&&<div className="font-bold text-chart-2">Auto-verified → {t.wallet_code} · {t.network}</div>}</div><div className="flex items-center gap-3"><div className="text-right"><div className="text-chart-3">{money(Number(t.amount_usd))}</div>{Number(t.fee_usd)>0&&<div className="text-muted-foreground">send {money(Number(t.net_usd))}</div>}<div className="capitalize">{t.status}</div></div>{t.status==='pending'&&<><Button size="icon" className="rounded-full" title="Approve" onClick={async()=>{try{await review({data:{id:t.id,status:'approved'}});await refresh();}catch{onMessage('Could not approve.');}}}><Check/></Button><Button size="icon" variant="destructive" className="rounded-full" title="Reject" onClick={async()=>{try{await review({data:{id:t.id,status:'rejected'}});await refresh();}catch{onMessage('Could not reject.');}}}><X/></Button></>}</div></div>)}{!list.length&&<p className="text-sm text-muted-foreground">No transactions.</p>}</div>
      <h3 className="mt-8 flex items-center gap-2 font-display text-lg font-black"><ArrowLeftRight/> BIX/USDT swap requests</h3><div className="mt-3 space-y-2">{swapList.map(s=><div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-primary/50 bg-card p-4 text-xs"><div><b className="text-sm">{s.direction==='USDT_TO_BIX'?'USDT → BIX':'BIX → USDT'}</b> · {email(s.user_id)}<div className="text-muted-foreground">{dateTime(s.created_at)} · recorded ${Number(s.price_usd).toFixed(6)} reference</div></div><div className="flex items-center gap-3"><div className="text-right"><div>{number(Number(s.amount_in), { maximumFractionDigits: 8 })} → <b className="text-chart-3">{number(Number(s.amount_out), { maximumFractionDigits: 8 })}</b></div><span className="capitalize">{s.status}</span></div>{s.status==='pending'&&<><Button size="icon" className="rounded-full" title="Approve swap" onClick={async()=>{try{await reviewExchange({data:{id:s.id,status:'approved'}});await refresh();}catch{onMessage('Could not approve swap.');}}}><Check/></Button><Button size="icon" variant="destructive" className="rounded-full" title="Reject swap" onClick={async()=>{try{await reviewExchange({data:{id:s.id,status:'rejected'}});await refresh();}catch{onMessage('Could not reject swap.');}}}><X/></Button></>}</div></div>)}{!swapList.length&&<p className="text-sm text-muted-foreground">No swap requests.</p>}</div>
    </div>
    <form className="grid max-w-2xl gap-3 sm:grid-cols-4" onSubmit={async e=>{e.preventDefault();const form=e.currentTarget;const f=new FormData(form);try{await reward({data:{userId:String(f.get('user')),amount:Number(f.get('amount')),note:String(f.get('note'))}});await refresh();onMessage('Reward credited.');form.reset();}catch{onMessage('Could not credit reward.');}}}><select name="user" className="form-input" required>{members.map(m=><option key={m.id} value={m.id}>{m.email}</option>)}</select><input name="amount" type="number" min="0.01" step="0.01" className="form-input" placeholder="Amount USD" required/><input name="note" className="form-input" placeholder="e.g. Matching LV1" required/><Button className="rounded-full">Credit reward</Button></form>
  </div>;
}