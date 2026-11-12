const PLANS = [
  { name: 'BIXGO', live: true, rows: ['2% tiap trip driver yang Anda ajak', '1% tiap trip penumpang yang Anda ajak'] },
  { name: 'BIXCARE', live: false, rows: ['1% omzet outlet/merchant yang Anda ajak', '0.5% tiap transaksi pelanggan yang Anda ajak'] },
  { name: 'BIXTOK', live: false, rows: ['2% dari gift yang diterima host/kreator ajakan Anda', 'Bonus target kreator untuk sponsor'] },
  { name: 'BIX CALL', live: false, rows: ['Berlaku setelah masa gratis ditutup', '5% sponsor langsung · 2.5% matching upline'] },
];

/** Ecosystem referral plan overview. Only BIXGO is settled today; others are labelled plans. */
export function EcoMarketingPlan() {
  return <section className="mx-auto max-w-3xl px-4 py-6">
    <h2 className="text-center text-lg font-extrabold tracking-wide">MARKETING PLAN <span className="text-primary">EKOSISTEM</span></h2>
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {PLANS.map(p => <div key={p.name} className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between"><b className="text-sm">{p.name}</b><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.live ? 'bg-primary text-primary-foreground' : 'border border-border text-muted-foreground'}`}>{p.live ? 'AKTIF' : 'RENCANA'}</span></div>
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">{p.rows.map(r => <li key={r}>• {r}</li>)}</ul>
      </div>)}
    </div>
    <p className="mt-3 text-center text-[10px] text-muted-foreground">Bonus diambil dari bagian platform, tidak menambah biaya pengguna. Program berlabel RENCANA belum berjalan dan dapat berubah. Tidak ada jaminan penghasilan.</p>
  </section>;
}
