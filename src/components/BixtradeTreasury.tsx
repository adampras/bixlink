type Exec = { net_usd: number; notional_usd: number; executed_at: string; buy_venue: string; sell_venue: string; source?: string };

/** Track record built only from recorded execution rows — no generated figures. */
export function BixtradeTreasury({ execs: rawExecs, onOpenLogs }: { execs?: Exec[] | null; onOpenLogs?: () => void }) {
  const execs = Array.isArray(rawExecs) ? rawExecs : [];
  const total = execs.reduce((a, x) => a + Number(x.net_usd), 0);
  const volume = execs.reduce((a, x) => a + Number(x.notional_usd), 0);
  const wins = execs.filter(x => Number(x.net_usd) > 0).length;
  const last = execs[0];
  const venues = new Set(execs.flatMap(x => [x.buy_venue, x.sell_venue])).size;
  return <section className="arb-card mt-4">
    <div className="flex items-center justify-between gap-2">
      <p className="shop-eyebrow">TRACK RECORD</p>
      <span className="arb-badge is-approved">DATA TERCATAT ✓</span>
    </div>
    <b className={`mt-1 block font-display text-3xl ${total >= 0 ? 'text-chart-2' : 'text-destructive'}`}>{total >= 0 ? '+' : ''}{total.toFixed(4)} USDT</b>
    <p className="text-[11px] text-muted-foreground">Hasil bersih dari {execs.length} eksekusi tercatat · volume {volume.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDT</p>
    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
      {[[String(execs.length), 'Eksekusi'], [`${execs.length ? Math.round(wins / execs.length * 100) : 0}%`, 'Win rate asli'], [String(venues), 'Bursa terpakai']].map(([a, b]) => <div key={b} className="arb-hud"><b>{a}</b><small>{b}</small></div>)}
    </div>
    <p className="mt-3 text-[11px]">{last ? <>Terakhir: <b>{new Date(last.executed_at).toLocaleString()}</b> · {last.buy_venue} → {last.sell_venue}</> : 'Belum ada eksekusi tercatat.'}</p>
    {onOpenLogs && execs.length > 0 && <button type="button" onClick={onOpenLogs} className="mt-2 text-xs font-bold text-chart-3 underline">Lihat semua resi →</button>}
    <p className="mt-3 text-[10px] text-muted-foreground">Setiap angka dihitung langsung dari catatan eksekusi Anda dengan harga bursa publik. Ini catatan kinerja, tidak otomatis masuk dompet; hasil masa lalu tidak menjamin hasil berikutnya.</p>
  </section>;
}
