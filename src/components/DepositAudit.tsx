import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { getDepositAudit, setSupportQualified } from '@/lib/reviewer.functions';
import { dateTime, money } from '@/lib/bixlink';
import { BadgeCheck, ShieldAlert } from 'lucide-react';

/** Real on-chain deposits (3 unique digits) vs non-real support accounts funded by Owner 1, with the 3× turnover switch. */
export function DepositAudit({ onMessage }: { onMessage: (m: string) => void }) {
  const load = useServerFn(getDepositAudit); const toggle = useServerFn(setSupportQualified);
  const q = useQuery({ queryKey: ['deposit-audit'], queryFn: () => load() });
  const [busy, setBusy] = useState('');
  if (q.isLoading) return <p className="mt-6 text-sm text-muted-foreground">Loading deposit audit…</p>;
  if (q.error) return <p className="mt-6 text-sm text-destructive">{q.error instanceof Error ? q.error.message : 'Akses ditutup.'}</p>;
  const real = q.data?.real ?? []; const support = q.data?.support ?? [];
  const realTotal = real.filter(r => r.status === 'approved').reduce((s, r) => s + r.base, 0);
  return <div className="mt-8 space-y-6">
    <section className="rounded-[20px] border border-chart-2/60 bg-card p-5">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold"><BadgeCheck size={18} className="text-chart-2"/> Real deposit · 3 angka unik</h2>
      <p className="mt-1 text-xs text-muted-foreground">Real USDT deposits to deposit wallet. 3 decimals are unique transfer matching codes. Total approved: <b className="text-chart-2">{money(realTotal)}</b></p>
      <div className="mt-4 max-h-[60vh] overflow-auto"><table className="w-full min-w-[640px] text-left text-xs">
        <thead className="text-muted-foreground"><tr><th className="p-2">Member</th><th className="p-2">Tanggal</th><th className="p-2">Pokok</th><th className="p-2">Unique code</th><th className="p-2">Transfer amount</th><th className="p-2">TxID</th><th className="p-2">Status</th></tr></thead>
        <tbody>{real.map(r => <tr key={r.id} className="border-t border-border">
          <td className="p-2"><b className="font-mono text-primary">{r.code}</b><div className="text-muted-foreground">{r.name}</div></td>
          <td className="p-2">{dateTime(r.createdAt)}</td>
          <td className="numeric p-2">{money(r.base)}</td>
          <td className="numeric p-2 font-bold text-chart-3">{r.unique ? `.${r.unique}` : '—'}</td>
          <td className="numeric p-2">{r.exact != null ? r.exact.toFixed(3) : '—'} {r.network}</td>
          <td className="max-w-[160px] truncate p-2 font-mono" title={r.txHash ?? ''}>{r.txHash ?? 'Belum ada'}</td>
          <td className="p-2 capitalize">{r.status}{r.onChain && <span className="ml-1 text-chart-2">· on-chain</span>}</td>
        </tr>)}</tbody></table>
        {!real.length && <p className="p-2 text-sm text-muted-foreground">No real deposits yet.</p>}</div>
    </section>
    <section className="rounded-[20px] border border-chart-3/60 bg-card p-5">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold"><ShieldAlert size={18} className="text-chart-3"/> Non-real account · support from Admin 1</h2>
      <p className="mt-1 text-xs text-muted-foreground">Virtual leader balances and clone accounts without blockchain TxIDs; not counted as real deposit turnover. The switch locks held balances (support + all sponsor/matching bonuses) until direct team turnover meets target: Self-loan 5× loan value, Virtual USDT support 3× support value.</p>
      <div className="mt-4 space-y-2">{support.map(s => <div key={`${s.kind}-${s.userId}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3 text-xs">
        <div className="min-w-0"><b className="font-mono text-primary">{s.code}</b> <span className="text-muted-foreground">{s.name}</span>
          <div className="mt-1">{s.kind === 'clone' ? <span className="rounded-full border border-chart-3 px-2 py-0.5 text-[10px] font-bold uppercase text-chart-3">Clone</span> : s.supportKind === 'loan' ? <span className="rounded-full border border-secondary bg-secondary/15 px-2 py-0.5 text-[10px] font-black uppercase text-secondary">Pinjaman mandiri · target 5×</span> : <span className="rounded-full border border-accent bg-accent/15 px-2 py-0.5 text-[10px] font-black uppercase text-accent">Support USDT virtual · target 3×</span>} <span className="numeric">{s.value}</span> · {dateTime(s.createdAt)}</div></div>
        {s.kind === 'leader' ? <label className="flex items-center gap-2 font-bold">
          <span className={s.requireTurnover ? 'text-chart-3' : 'text-chart-2'}>{s.requireTurnover ? `🔒 ${s.multiple ?? 3}× turnover required` : '🔓 Qualified dibuka'}</span>
          <button type="button" role="switch" aria-checked={!!s.requireTurnover} aria-label={`Saklar ${s.multiple ?? 3}× omset ${s.code}`} disabled={busy === s.userId}
            onClick={async () => { setBusy(s.userId); try { await toggle({ data: { userId: s.userId, requireTurnover: !s.requireTurnover } }); await q.refetch(); onMessage(`${s.code}: ${!s.requireTurnover ? `wajib ${s.multiple ?? 3}× omset` : 'qualified dibuka'}.`); } catch (e) { onMessage(e instanceof Error ? e.message : 'Failed to save.'); } finally { setBusy(''); } }}
            className={`relative h-6 w-11 rounded-full border transition-colors ${s.requireTurnover ? 'border-chart-3 bg-chart-3/30' : 'border-chart-2 bg-chart-2/30'}`}>
            <i className={`absolute top-0.5 h-4 w-4 rounded-full bg-foreground transition-all ${s.requireTurnover ? 'left-6' : 'left-0.5'}`}/></button>
        </label> : <span className="text-muted-foreground">Excluded from turnover</span>}
      </div>)}{!support.length && <p className="text-sm text-muted-foreground">No support accounts in this network.</p>}</div>
    </section>
  </div>;
}
