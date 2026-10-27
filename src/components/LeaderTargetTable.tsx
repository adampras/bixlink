const ROWS: [string, string, string][] = [
  ['Account type', 'Sponsored leader (self-funded path)', 'Loan account (network path)'],
  ['Target', '3× package value', '5× package value'],
  ['Counted turnover', 'Your own real stakes only', 'Real stakes of direct members (L1)'],
  ['Example · $1,000', 'Stake $3,000 yourself', 'Team stakes $5,000'],
  ['Not counted', 'Virtual USDT, loan funds', 'Virtual USDT, clones, other loan accounts'],
  ['Staking lock', '360 days mandatory', '360 days mandatory'],
  ['Unlocks', 'Withdrawals + escrowed bonuses', 'Withdrawals + escrowed bonuses'],
];

export function LeaderTargetTable() {
  return <section className="mx-auto max-w-3xl px-5 py-8" aria-labelledby="leader-target-title">
    <div className="eyebrow">LEADER QUALIFICATION</div>
    <h2 id="leader-target-title" className="section-title">3× vs <span>5×</span> TARGET</h2>
    <div className="mt-4 overflow-x-auto rounded-2xl border border-chart-3/30 bg-card/60 backdrop-blur-md">
      <table className="w-full min-w-[340px] text-left text-xs">
        <thead><tr className="border-b border-border">
          <th className="p-3 text-muted-foreground">Rule</th>
          <th className="p-3 text-chart-3">3× Personal</th>
          <th className="p-3 text-primary">5× Team</th>
        </tr></thead>
        <tbody>{ROWS.map(([k, a, b]) => <tr key={k} className="border-b border-border/50 last:border-0">
          <td className="p-3 font-semibold text-muted-foreground">{k}</td><td className="p-3">{a}</td><td className="p-3">{b}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <p className="mt-3 text-center text-[10px] text-muted-foreground">Either path qualifies the account. Targets are internal ledger rules, not guaranteed returns.</p>
  </section>;
}
