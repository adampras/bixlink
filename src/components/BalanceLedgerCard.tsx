import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { getMyBalanceLedger } from '@/lib/bixlink.functions';
import { money, number } from '@/lib/bixlink';
import { BadgeCheck, Lock, ShieldAlert, ShieldCheck, Unlock } from 'lucide-react';

const EXEMPT: Record<string, string> = { owner1: 'Owner 1 · no restrictions', clone: 'Owner account · no restrictions', owner_open: 'Opened by Owner 1' };

/** Two-column split of the USDT wallet: real withdrawable funds vs sponsored/virtual escrow. Figures come from the server ledger RPC. */
export function BalanceLedgerCard({ hidden }: { hidden?: boolean }) {
  const fetchLedger = useServerFn(getMyBalanceLedger);
  const { data: d } = useQuery({ queryKey: ['my-wallet', 'ledger'], queryFn: () => fetchLedger(), staleTime: 30_000 });
  const [tab, setTab] = useState<'real' | 'unreal'>('real');
  if (!d) return null;
  const m = (v: number) => hidden ? '••••' : money(Number(v));
  const b = (v: number) => hidden ? '••••' : `${number(Number(v), { maximumFractionDigits: 4 })} BIX`;
  const rows = (d.recent ?? []).filter(r => tab === 'real' ? r.real : !r.real);
  const hasSponsored = d.locked_usdt > 0 || d.sponsor_capital_usdt > 0 || d.vusdt_usdt > 0 || d.bonus_unreal_usdt > 0 || d.bonus_unreal_bix > 0 || d.locked_bix > 0;
  return <section className="ledger-split mt-4" aria-label="Balance separation">
    {d.owner_access === 'closed' && !d.exempt && <p className="ledger-alert"><ShieldAlert size={14}/> This sponsored account is closed by Owner 1. Withdrawals and transfers are paused.</p>}
    {d.exempt && <p className="ledger-exempt"><BadgeCheck size={14}/> {EXEMPT[d.exempt]}</p>}
    <div className="ledger-grid">
      <article className="ledger-card ledger-card--real">
        <header><ShieldCheck size={15}/><span>REAL FUNDS</span><em>Withdrawable</em></header>
        <strong className="numeric">{m(d.withdrawable_usdt)}</strong>
        <dl>
          <div><dt>On-chain deposits</dt><dd className="numeric">{m(d.real_deposit_usdt)}</dd></div>
          <div><dt>Bonus · real members (USDT)</dt><dd className="numeric">{m(d.bonus_real_usdt)}</dd></div>
          <div><dt>Bonus · real members (BIX)</dt><dd className="numeric">{b(d.bonus_real_bix)}</dd></div>
        </dl>
      </article>
      <article className={`ledger-card ledger-card--locked${hasSponsored ? '' : ' is-empty'}`}>
        <header><Lock size={15}/><span>SPONSORED · ESCROW</span><em>{d.exempt ? 'Unlocked' : 'Locked'}</em></header>
        <strong className="numeric">{m(d.locked_usdt)}</strong>
        <dl>
          <div><dt>Sponsor capital (leader)</dt><dd className="numeric">{m(d.sponsor_capital_usdt)}</dd></div>
          <div><dt>Virtual USDT (vUSDT)</dt><dd className="numeric">{m(d.vusdt_usdt)}</dd></div>
          <div><dt>Bonus · sponsored (USDT)</dt><dd className="numeric">{m(d.bonus_unreal_usdt)}</dd></div>
          <div><dt>Bonus · sponsored (BIX)</dt><dd className="numeric">{b(d.bonus_unreal_bix)}</dd></div>
          <div><dt>BIX locked</dt><dd className="numeric">{b(d.locked_bix)}</dd></div>
        </dl>
        <p className="ledger-note">{d.exempt ? <><Unlock size={11}/> No requirement applies to this account.</> : d.is_leader && !d.qualified ? 'Locked until your leader target (3× personal or 5× team real turnover) is reached.' : 'Sponsored and virtual balances are internal credits and cannot be withdrawn.'}</p>
      </article>
    </div>
    <details className="ledger-history">
      <summary>Network bonus history · separated</summary>
      <div className="ledger-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'real'} onClick={() => setTab('real')}>Real bonus</button>
        <button type="button" role="tab" aria-selected={tab === 'unreal'} onClick={() => setTab('unreal')}>Sponsored bonus</button>
      </div>
      {rows.length ? <ul>{rows.map((r, i) => <li key={`${r.at}-${i}`} data-real={r.real}>
        <div className="min-w-0"><b>{r.member}</b><span>{r.kind} · L{r.level} · {new Date(r.at).toLocaleDateString()}</span></div>
        <div className="text-right"><b className="numeric">{m(r.usdt)}</b><span className="numeric">{b(r.bix)}</span><i>{r.real ? 'Available' : 'Escrow · sponsored'}</i></div>
      </li>)}</ul> : <p className="ledger-empty">No {tab === 'real' ? 'real' : 'sponsored'} bonus yet.</p>}
    </details>
  </section>;
}
