import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { listRecoveryWallets, scanRecoveryTransfers, lookupRecoveryTx, creditRecoveryTx, manualCreditNoHash } from '@/lib/deposit-recovery.functions';
import { dateTime, money } from '@/lib/bixlink';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Radar, CheckCircle2, AlertTriangle, Clock, LifeBuoy } from 'lucide-react';

type Lookup = Awaited<ReturnType<typeof lookupRecoveryTx>>;
type Scan = Awaited<ReturnType<typeof scanRecoveryTransfers>>;
type Cand = { code: string; name: string; amount: number; createdAt: string; kind: 'report' | 'unique' };

const explorer = (network: string, hash: string) => network === 'TRC20' ? `https://tronscan.org/#/transaction/${hash}` : network === 'ERC20' ? `https://etherscan.io/tx/${hash}` : `https://bscscan.com/tx/${hash}`;

/** Owner 1 / Owner 2: find real on-chain transfers to the owner wallet that did not reach a member wallet, and credit them after on-chain re-verification. */
export function DepositRecovery({ onMessage }: { onMessage: (m: string) => void }) {
  const loadWallets = useServerFn(listRecoveryWallets); const scan = useServerFn(scanRecoveryTransfers);
  const lookup = useServerFn(lookupRecoveryTx); const credit = useServerFn(creditRecoveryTx);
  const qc = useQueryClient();
  const w = useQuery({ queryKey: ['recovery-wallets'], queryFn: () => loadWallets() });
  const wallets = w.data?.wallets ?? [];
  const [walletCode, setWalletCode] = useState(''); const [hash, setHash] = useState(''); const [member, setMember] = useState(''); const [note, setNote] = useState('');
  const [found, setFound] = useState<Lookup | null>(null); const [busy, setBusy] = useState(''); const [scanData, setScanData] = useState<Scan | null>(null);
  const code = walletCode || wallets[0]?.code || '';
  const current = wallets.find(x => x.code === code);

  const check = async (c = code, h = hash) => {
    if (!c || !h.trim()) return;
    setBusy('check'); setFound(null);
    try { const r = await lookup({ data: { walletCode: c, txHash: h.trim() } }); setFound(r); if (r.ok && r.candidates.length === 1 && !member) setMember(r.candidates[0]!.code); }
    catch (e) { onMessage(e instanceof Error ? e.message : 'Failed to check TxID.'); } finally { setBusy(''); }
  };
  const pick = (c: string, h: string, m?: string) => { setWalletCode(c); setHash(h); if (m) setMember(m); void check(c, h); document.getElementById('recovery-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const approve = async () => {
    if (!found?.ok || !member.trim()) return;
    if (!window.confirm(`Credit ${money(found.credit)} to member ${member.trim()}?\nTxID: ${found.hash.slice(0, 18)}…`)) return;
    setBusy('credit');
    try {
      const r = await credit({ data: { walletCode: code, txHash: found.hash, member: member.trim(), ...(note.trim() ? { note: note.trim() } : {}) } });
      onMessage('linked' in r && r.linked ? `TxID linked to manual credit ${money(r.previous)} of ${r.member}. No additional balance added (anti-duplicate).` : `Success: ${money(r.amount)} credited to ${r.member}'s wallet.`);
      setFound(null); setHash(''); setMember(''); setNote(''); setScanData(null);
      await Promise.all([qc.invalidateQueries({ queryKey: ['admin-wallet'] }), qc.invalidateQueries({ queryKey: ['deposit-audit'] }), qc.invalidateQueries({ queryKey: ['owner-revenue'] })]);
    } catch (e) { onMessage(e instanceof Error ? e.message : 'Failed to credit.'); } finally { setBusy(''); }
  };
  const runScan = async () => { setBusy('scan'); try { setScanData(await scan({ data: {} })); } catch (e) { onMessage(e instanceof Error ? e.message : 'Failed to scan.'); } finally { setBusy(''); } };

  if (w.isLoading) return <p className="mt-6 text-sm text-muted-foreground">Memuat wallet deposit…</p>;
  if (w.error) return null;

  const Cands = ({ list, c, h }: { list: Cand[]; c: string; h: string }) => list.length ? <div className="mt-2 flex flex-wrap gap-1.5">{list.map(x => <button key={x.code + x.createdAt} type="button" onClick={() => pick(c, h, x.code)} className="rounded-full border border-chart-3/60 bg-chart-3/10 px-2.5 py-1 text-[11px] font-bold text-chart-3 hover:bg-chart-3/20">
    {x.code} · {x.kind === 'unique' ? 'kode unik' : 'lapor'} {x.amount.toFixed(x.kind === 'unique' ? 3 : 2)}</button>)}</div> : null;

  return <section className="mt-8 rounded-[20px] border border-chart-2/60 bg-card p-5">
    <h2 className="flex items-center gap-2 font-display text-lg font-bold"><LifeBuoy size={18} className="text-chart-2"/> Pemulihan deposit on-chain</h2>
    <p className="mt-1 text-xs text-muted-foreground">Untuk member yang sudah transfer asli ke wallet Owner tetapi saldonya belum masuk (nominal terpotong biaya exchange, lupa kirim TxID, atau waktu habis). Sistem selalu cek ulang ke blockchain; jumlah yang dikreditkan = jumlah yang benar-benar masuk. Satu TxID hanya bisa dikreditkan satu kali.{!w.data?.owner1 && ' You can only credit members in your network.'}</p>
    {!wallets.length ? <p className="mt-4 text-sm text-muted-foreground">No active deposit wallets yet.</p> : <>
      <form id="recovery-form" className="mt-5 grid gap-3 rounded-2xl border border-border p-4 sm:grid-cols-[minmax(0,240px)_minmax(0,1fr)_auto]" onSubmit={e => { e.preventDefault(); void check(); }}>
        <label className="grid min-w-0 gap-1 text-xs font-bold">Wallet tujuan
          <select value={code} onChange={e => { setWalletCode(e.target.value); setFound(null); }} className="h-10 w-full min-w-0 truncate rounded-md border border-input bg-background px-2 text-sm">
            {wallets.map(x => <option key={x.code} value={x.code}>{x.code} · {x.asset} {x.network}{w.data?.owner1 ? ` · ${x.owner}` : ''}</option>)}</select></label>
        <label className="grid min-w-0 gap-1 text-xs font-bold">TxID / Hash transaksi
          <Input value={hash} onChange={e => { setHash(e.target.value); setFound(null); }} placeholder="0x… (view in Owner wallet history / BscScan)" className="font-mono" autoComplete="off"/></label>
        <Button type="submit" className="self-end gap-2" disabled={busy === 'check' || !hash.trim()}><Search size={16}/>{busy === 'check' ? 'Mengecek…' : 'Cek on-chain'}</Button>
        {current && <p className="text-[11px] text-muted-foreground sm:col-span-3">Alamat: <span className="break-all font-mono">{current.address}</span></p>}
      </form>

      {found && !found.ok && <p role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/60 bg-destructive/10 p-3 text-sm text-destructive">{found.pending ? <Clock size={16} className="mt-0.5 shrink-0"/> : <AlertTriangle size={16} className="mt-0.5 shrink-0"/>}{found.reason}</p>}
      {found?.ok && <div className="mt-3 rounded-2xl border border-chart-2/60 bg-chart-2/5 p-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2"><b className="flex items-center gap-2 text-chart-2"><CheckCircle2 size={16}/> Confirmed on blockchain</b>
          <a className="text-xs font-bold text-primary underline" href={explorer(found.network, found.hash)} target="_blank" rel="noreferrer">View on explorer</a></div>
        <p className="mt-2">Incoming: <b className="numeric">{found.amount.toFixed(4)} {found.asset}</b> ({found.network}) → dikreditkan <b className="numeric text-chart-2">{money(found.credit)}</b></p>
        {found.creditedTo ? <p className="mt-2 font-bold text-chart-3">Sudah masuk ke wallet {found.creditedTo}. Tidak perlu tindakan.</p> : <>
          {found.queuedBy && <p className="mt-2 text-xs text-chart-3">TxID ini sudah diajukan oleh {found.queuedBy} dan masih menunggu.</p>}
          {found.candidates.length > 0 && <div className="mt-2 text-xs text-muted-foreground">Likely owner (deposit requests with similar amounts, past 72 hours):<Cands list={found.candidates} c={code} h={found.hash}/></div>}
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Input value={member} onChange={e => setMember(e.target.value)} placeholder="Kode referral / username member" aria-label="Member penerima"/>
            <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Catatan (opsional)" maxLength={120} aria-label="Catatan"/>
            <Button type="button" onClick={approve} disabled={busy === 'credit' || !member.trim()} className="gap-2"><CheckCircle2 size={16}/>{busy === 'credit' ? 'Menyimpan…' : 'Approve & kreditkan'}</Button>
          </div></>}
      </div>}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-display text-base font-bold">Recent incoming transfers</h3>
        <p className="text-[11px] text-muted-foreground">Reading recent confirmed transfers directly from the blockchain. For older transfers, use On-chain Check with TxID.</p></div>
        <Button type="button" variant="outline" className="gap-2" onClick={runScan} disabled={busy === 'scan'}><Radar size={16}/>{busy === 'scan' ? 'Memindai…' : 'Pindai blockchain'}</Button></div>
      {scanData && <div className="mt-3 space-y-4">{scanData.map(s => <div key={s.wallet} className="rounded-2xl border border-border p-3">
        <b className="text-xs">{s.wallet} · {s.asset} {s.network}</b>
        {s.error ? <p className="mt-1 text-xs text-muted-foreground">{s.error}</p> : !s.transfers.length ? <p className="mt-1 text-xs text-muted-foreground">No recent incoming transfers.</p> :
          <div className="mt-2 space-y-2">{s.transfers.map(t => <div key={t.hash} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 p-2.5 text-xs">
            <div className="min-w-0"><b className="numeric">{t.amount.toFixed(4)} {s.asset}</b> <span className="text-muted-foreground">· {dateTime(t.at)}</span>
              <a href={explorer(s.network, t.hash)} target="_blank" rel="noreferrer" className="block max-w-[260px] truncate font-mono text-muted-foreground underline">{t.hash}</a>
              {t.state === 'unmatched' && <Cands list={(t.candidates ?? []) as Cand[]} c={s.wallet} h={t.hash}/>}</div>
            {t.state === 'credited' ? <span className="rounded-full border border-chart-2 px-2 py-0.5 font-bold text-chart-2">Sudah masuk · {t.member}</span>
              : t.state === 'queued' ? <Button size="sm" variant="outline" onClick={() => pick(s.wallet, t.hash, t.member)}>Antri · {t.member} → proses</Button>
              : <Button size="sm" onClick={() => pick(s.wallet, t.hash)} className="gap-1"><AlertTriangle size={14}/> Not credited yet · processing</Button>}
          </div>)}</div>}
      </div>)}</div>}
      {w.data?.owner1 && <ManualCredit wallet={code} onMessage={onMessage}/>}
    </>}
  </section>;
}

/** Owner 1 fallback when the blockchain check is busy: credit now, link the TxID later (the same member cannot receive a second credit until then). */
function ManualCredit({ wallet, onMessage }: { wallet: string; onMessage: (m: string) => void }) {
  const fn = useServerFn(manualCreditNoHash); const qc = useQueryClient();
  const [member, setMember] = useState(''); const [amount, setAmount] = useState(''); const [note, setNote] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async () => {
    const a = Number(amount);
    if (!member.trim() || !(a >= 1) || note.trim().length < 5) return onMessage('Enter member, amount (min $1), and proof note (min 5 characters).');
    if (!window.confirm(`Credit ${money(a)} to ${member.trim()} WITHOUT blockchain check?\nMake sure you have seen these funds arrive in the Owner wallet.`)) return;
    setBusy(true);
    try { const r = await fn({ data: { walletCode: wallet, member: member.trim(), amount: a, note: note.trim() } }); onMessage(`Success: ${money(r.amount)} credited to ${r.member}. Link TxID later via On-chain Check.`); setMember(''); setAmount(''); setNote('');
      await qc.invalidateQueries({ queryKey: ['admin-wallet'] }); }
    catch (e) { onMessage(e instanceof Error ? e.message : 'Failed.'); } finally { setBusy(false); }
  };
  return <div className="mt-6 rounded-2xl border border-chart-3/60 bg-chart-3/5 p-4">
    <h3 className="flex items-center gap-2 font-display text-base font-bold"><AlertTriangle size={16} className="text-chart-3"/> Kredit manual (blockchain sibuk) · Owner 1</h3>
    <p className="mt-1 text-[11px] text-muted-foreground">Use only if you have seen the funds arrive in the Owner wallet. A member can only have one manual credit without a TxID. When the TxID is later approved via On-chain Check, the TxID is only linked to this credit — balance will not increase again.</p>
    <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_120px_1fr_auto]">
      <Input value={member} onChange={e => setMember(e.target.value)} placeholder="Kode referral / username" aria-label="Member"/>
      <Input value={amount} onChange={e => setAmount(e.target.value)} placeholder="USD" inputMode="decimal" aria-label="Amount"/>
      <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Proof: time, sender wallet, etc." maxLength={120} aria-label="Catatan bukti"/>
      <Button type="button" variant="outline" onClick={submit} disabled={busy}>{busy ? 'Menyimpan…' : 'Kreditkan'}</Button>
    </div>
  </div>;
}
