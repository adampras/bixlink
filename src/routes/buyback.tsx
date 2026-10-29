import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Check, Mail, MessageCircle, Send, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getBuyback, requestBuyback, reviewBuyback } from '@/lib/buyback.functions';
import { dateTime, money, number } from '@/lib/bixlink';
import { useMember } from '@/lib/useMember';
import { buybackAmountSchema, DEV_BUYBACK_MINIMUM_BIX } from '@/lib/transaction-limits';

export const Route = createFileRoute('/buyback')({
  head: () => ({ meta: [
    { title: 'Dev Buyback $0.25 · BIXLINK' },
    { name: 'description', content: 'Sell BIX directly to the BIXLINK developer buyback desk at $0.25, reviewed by the owner.' },
    { property: 'og:title', content: 'Dev Buyback $0.25 · BIXLINK' },
    { property: 'og:description', content: 'Sell BIX to the developer buyback desk with owner review and source verification.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  component: BuybackPage,
});

const METHODS = [
  { id: 'email', label: 'Email', icon: Mail, ph: 'you@email.com' },
  { id: 'telegram', label: 'Telegram', icon: Send, ph: '@username' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, ph: '+628123456789' },
] as const;
const SRC: [string, string][] = [['staking_profit', 'Profit staking'], ['network_bonus', 'Bonus jaringan'], ['vip_reward', 'VIP'], ['swap_bought', 'Beli swap'], ['allocation', 'Alokasi admin'], ['transfer_in', 'Transfer masuk'], ['p2p_net', 'P2P net']];

function BuybackPage() {
  const { user } = useMember();
  const fetchFn = useServerFn(getBuyback); const req = useServerFn(requestBuyback); const rev = useServerFn(reviewBuyback);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['buyback'], enabled: !!user, queryFn: () => fetchFn(), refetchInterval: 20000 });
  const [amount, setAmount] = useState(''); const [method, setMethod] = useState<'email' | 'telegram' | 'whatsapp'>('email');
  const [contact, setContact] = useState(''); const [busy, setBusy] = useState(false);
  if (!user) return <main className="mx-auto max-w-md p-6 text-center"><p className="text-muted-foreground">Sign in to sell BIX to the dev buyback desk.</p><Button asChild className="mt-4"><Link to="/auth">Sign in</Link></Button></main>;
  const a = Number(amount);
  const submit = async () => {
    if (!buybackAmountSchema.safeParse(a).success) { toast.error('Minimum 500 BIX; maximum 1,000,000 BIX'); return; }
    if (contact.trim().length < 3) { toast.error('Enter your confirmation contact'); return; }
    if (!window.confirm(`Sell ${a} BIX for ${money(a * 0.25)} USDT? BIX is held until the developer reviews it.`)) return;
    setBusy(true);
    try { await req({ data: { amount: a, method, contact } }); toast.success('Buyback request sent — BIX held in escrow'); setAmount(''); await qc.invalidateQueries({ queryKey: ['buyback'] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Request failed'); } finally { setBusy(false); }
  };
  const act = async (id: string, approve: boolean) => {
    const note = approve ? '' : (window.prompt('Alasan reject (mis. sumber BIX bukan dari staking real):') ?? '');
    if (approve && !window.confirm('Beli BIX ini di $0.25? USDT langsung masuk ke saldo member.')) return;
    setBusy(true);
    try { await rev({ data: { id, approve, note } }); toast.success(approve ? 'Disetujui' : 'Ditolak, BIX dikembalikan'); await qc.invalidateQueries({ queryKey: ['buyback'] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Gagal'); } finally { setBusy(false); }
  };
  const d = q.data; const m = METHODS.find(x => x.id === method) ?? METHODS[0];
  const pending = (d?.queue ?? []).filter(r => r.status === 'pending');
  return <main className="mx-auto max-w-2xl space-y-6 p-4 pb-24 text-foreground">
    <div className="flex items-center justify-between"><Link to="/p2p" className="flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft size={16}/>P2P</Link><h1 className="flex items-center gap-1 font-display text-lg font-black"><Zap size={18} className="text-chart-3"/>Dev Buyback</h1></div>

    <section className="rounded-2xl border border-chart-3/50 bg-card p-4">
      <p className="text-xs text-muted-foreground">Fixed buyback price</p>
      <p className="numeric text-3xl font-black text-chart-3">$0.25 <span className="text-sm text-muted-foreground">/ BIX</span></p>
      <p className="mt-1 text-xs text-muted-foreground">Available: <b className="numeric">{number(d?.bixBalance ?? 0)} BIX</b></p>
      <label className="mt-4 grid gap-1 text-xs text-muted-foreground">Amount (BIX) · Minimum 500 BIX<input className="form-input" type="number" min={DEV_BUYBACK_MINIMUM_BIX} value={amount} onChange={e => setAmount(e.target.value)} /></label>
      <Button type="button" variant="ghost" size="sm" className="mt-1 text-chart-3 underline" onClick={() => setAmount(String(Math.floor(d?.bixBalance ?? 0)))}>Use max</Button>
      <p className="mt-2 text-sm">You receive: <b className="numeric text-chart-2">{money((a || 0) * 0.25)} USDT</b></p>
      <p className="mt-4 text-xs text-muted-foreground">Confirmation contact (choose one)</p>
      <div className="mt-1 grid grid-cols-3 gap-2">{METHODS.map(x => <Button key={x.id} size="sm" variant={method === x.id ? 'default' : 'outline'} aria-pressed={method === x.id} onClick={() => setMethod(x.id)}><x.icon size={14}/>{x.label}</Button>)}</div>
      <input className="form-input mt-2 w-full" placeholder={m.ph} value={contact} onChange={e => setContact(e.target.value)} maxLength={120} />
      <Button className="mt-4 w-full" disabled={busy || !buybackAmountSchema.safeParse(a).success} onClick={submit}>Sell to Dev Buyback</Button>
      <p className="mt-2 text-[11px] text-muted-foreground">Your BIX is held until reviewed. The developer verifies the BIX source; BIX not earned from real staking may be rejected and returned to your balance.</p>
    </section>

    <section><h2 className="mb-2 text-sm font-bold">My buyback requests</h2><div className="divide-y divide-border rounded-xl border border-border bg-card text-xs">
      {(d?.mine ?? []).map(r => <div key={r.id} className="flex items-center justify-between p-3"><span className="numeric">{number(Number(r.amount_in))} BIX → {money(Number(r.amount_out))}</span><span className={r.status === 'approved' ? 'text-chart-2' : r.status === 'rejected' ? 'text-destructive' : 'text-chart-3'}>{r.status}</span></div>)}
      {!d?.mine.length && <p className="p-3 text-muted-foreground">No requests yet.</p>}</div></section>

    {d?.owner && <section><h2 className="mb-2 font-bold">Antrean Owner · {pending.length} pending</h2><div className="space-y-2">
      {(d.queue ?? []).slice(0, 40).map(r => { const s = (r.detail?.source ?? {}) as Record<string, number | boolean>; const stakingBix = Number(s['staking_profit'] ?? 0) + Number(s['network_bonus'] ?? 0) + Number(s['vip_reward'] ?? 0); const ok = stakingBix >= Number(r.amount_in) && !s['is_clone'];
        return <div key={r.id} className={`rounded-xl border bg-card p-3 text-xs ${r.status === 'pending' ? (ok ? 'border-chart-2' : 'border-destructive') : 'border-border opacity-70'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2"><b className="numeric text-base">{number(Number(r.amount_in))} BIX → {money(Number(r.amount_out))}</b><span className="text-muted-foreground">{dateTime(r.created_at)}</span></div>
          <p className="text-muted-foreground">{r.username} · {r.code} · {r.detail?.contact_method}: <span className="font-mono text-foreground">{r.detail?.contact_value}</span></p>
          <p className={`mt-1 font-bold ${ok ? 'text-chart-2' : 'text-destructive'}`}>{s['is_clone'] ? '⚠️ AKUN CLONE' : ok ? '✓ Sumber staking real cukup' : '⚠️ Sumber non-staking melebihi jumlah jual'}</p>
          <div className="mt-1 grid grid-cols-2 gap-x-3 text-muted-foreground">{SRC.map(([k, l]) => <span key={k}>{l}: <b className="numeric text-foreground">{number(Number(s[k] ?? 0))}</b></span>)}<span>Deposit real: <b className="numeric text-foreground">{money(Number(s['real_deposit_usd'] ?? 0))}</b></span></div>
          {r.status === 'pending' ? <div className="mt-2 flex gap-2"><Button size="sm" disabled={busy || Number(r.amount_in) < DEV_BUYBACK_MINIMUM_BIX} onClick={() => act(r.id, true)}><Check/>Beli</Button><Button size="sm" variant="destructive" disabled={busy} onClick={() => act(r.id, false)}><X/>Reject</Button></div> : <p className="mt-1 uppercase">{r.status}{r.detail?.review_note ? ` · ${r.detail.review_note}` : ''}</p>}
        </div>; })}
      {!d.queue.length && <p className="text-sm text-muted-foreground">Belum ada pengajuan.</p>}</div></section>}
  </main>;
}
