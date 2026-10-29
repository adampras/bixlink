export type StakingActivity = { id: string; package_id: string; status: string; amount_usd: number | string; created_at: string; activated_at?: string | null };

export function stakingUpdates(stakes: StakingActivity[]) {
  return stakes.map(stake => ({
    id: `stake:${stake.id}:${stake.status}`,
    title: `${stake.package_id} · ${stake.status.toUpperCase()}`,
    body: `$${Number(stake.amount_usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · ${stake.status === 'completed' ? 'Contract completed. No automatic payout; certificate and settlement terms apply.' : stake.status === 'active' ? 'Stake active. Yield remains a display-only projection.' : stake.status === 'pending' ? 'Request recorded; awaiting activation.' : 'Recorded staking status.'}`,
    date: stake.activated_at ?? stake.created_at,
    status: stake.status,
  })).sort((a, b) => b.date.localeCompare(a.date));
}