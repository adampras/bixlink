import { useEffect, useState } from 'react';

/** Illustrative treasury figure: deterministic clock-seeded drift inside $2M–$5M. Display-only simulation, never a balance. */
export function treasuryIllustration(now: number) {
  const t = now / 60000;
  const wave = Math.sin(t / 37) * 0.55 + Math.sin(t / 11) * 0.3 + Math.sin(t / 3.1) * 0.15;
  return Math.round(3_500_000 + wave * 1_500_000);
}

export function BixtradeTreasury() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const id = setInterval(() => { if (!document.hidden) setNow(Date.now()); }, 4000); return () => clearInterval(id); }, []);
  const v = now ? treasuryIllustration(now) : 3_500_000;
  return <section className="arb-card mt-4">
    <div className="flex items-center justify-between gap-2">
      <p className="shop-eyebrow">TREASURY ENGINE</p>
      <span className="arb-badge">SIMULASI</span>
    </div>
    <b className="mt-1 block font-display text-3xl text-chart-3">${v.toLocaleString('en-US')}</b>
    <p className="text-[11px] text-muted-foreground">Ilustrasi kapasitas pool $2M–$5M · bergerak mengikuti siklus scan</p>
    <div className="mt-3 grid grid-cols-3 gap-2 text-center">
      {[['20–25%', 'Perputaran ekosistem'], ['6', 'Bursa dipindai'], ['24/7', 'Mesin aktif']].map(([a, b]) => <div key={b} className="arb-hud"><b>{a}</b><small>{b}</small></div>)}
    </div>
    <p className="mt-3 text-[10px] text-muted-foreground">Angka treasury adalah ilustrasi, bukan dana terverifikasi atau rekam jejak. Riwayat kinerja nyata hanya dari eksekusi tercatat di tab Logs. Hasil tidak dijamin.</p>
  </section>;
}
