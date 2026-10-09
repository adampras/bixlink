import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { getAdminReport } from '@/lib/bixlink.functions';
import { money, number } from '@/lib/bixlink';

type Report = Awaited<ReturnType<typeof getAdminReport>>;

const PERIODS = [
  { key: 'day', label: 'Hari ini' },
  { key: 'month', label: 'Bulan ini' },
  { key: 'total', label: 'Total' },
] as const;

function Row({ label, values, format }: { label: string; values: { day: number; month: number; total: number }; format: (v: number) => string }) {
  return (
    <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr] items-center gap-2 border-t border-border py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {PERIODS.map(p => <strong key={p.key} className="text-right tabular-nums">{format(values[p.key])}</strong>)}
    </div>
  );
}

export function AdminReports({ onMessage }: { onMessage: (msg: string) => void }) {
  const load = useServerFn(getAdminReport);
  const [report, setReport] = useState<Report | null>(null);
  useEffect(() => { load().then(setReport).catch(() => onMessage('Could not load report.')); }, []);
  if (!report) return <p className="mt-8 text-sm text-muted-foreground">Loading report…</p>;
  return (
    <div className="mt-8 max-w-3xl">
      <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr] gap-2 pb-2 text-xs uppercase text-muted-foreground">
        <span>Kategori</span>
        {PERIODS.map(p => <span key={p.key} className="text-right">{p.label}</span>)}
      </div>
      <Row label="Staking USDT (nilai)" values={report.stakingUsd} format={v => money(v)} />
      <Row label="Staking USDT (jumlah)" values={report.stakingCount} format={v => number(v)} />
      <Row label="Staking BIX" values={report.stakingBix} format={v => `${number(v)} BIX`} />
      <Row label="Bonus referral BIX" values={report.referralBix} format={v => `${number(v)} BIX`} />
      <Row label="Bonus jaringan USDT" values={report.networkUsdt} format={v => money(v)} />
      <Row label="Bonus jaringan BIX" values={report.networkBix} format={v => `${number(v)} BIX`} />
      <Row label="Hadiah mining BIX" values={report.miningBix} format={v => `${number(v)} BIX`} />
      <p className="mt-4 text-xs text-muted-foreground">{report.miningNote} Angka dihitung dari waktu pencatatan (UTC).</p>
    </div>
  );
}
