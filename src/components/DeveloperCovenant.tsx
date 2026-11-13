const DEVS = [
  { flag: '🇮🇩', country: 'Indonesia', role: 'Lead Protocol Developer' },
  { flag: '🇸🇬', country: 'Singapore', role: 'Treasury & Vault Developer' },
  { flag: '🇲🇾', country: 'Malaysia', role: 'Smart Contract Developer' },
  { flag: '🇦🇪', country: 'United Arab Emirates', role: 'Liquidity Developer' },
  { flag: '🇩🇪', country: 'Germany', role: 'Security Developer' },
];

export function DeveloperCovenant() {
  return <section className="covenant mt-6" aria-labelledby="covenant-title">
    <div className="covenant-inner">
      <p className="lux-kicker text-center">DEVELOPER COVENANT · PIAGAM KOMITMEN</p>
      <h2 id="covenant-title" className="lux-gold-text mt-1 text-center font-display text-xl font-black">Komitmen Harga BIX</h2>
      <div className="mt-4 grid grid-cols-2 gap-2 text-center">
        <div className="lux-tile p-3"><span className="lux-label">Fase internal · 1 tahun</span><b className="lux-gold-text numeric block font-display text-3xl font-black">$0.50</b><span className="lux-label">dijaga developer</span></div>
        <div className="lux-tile p-3"><span className="lux-label">Target listing DEX & CEX</span><b className="lux-gold-text numeric block font-display text-3xl font-black">$5+</b><span className="lux-label">prediksi minimal</span></div>
      </div>
      <p className="mt-4 text-center text-[12px] leading-relaxed text-foreground/85">Kami, developer BIXLINK dari lima negara, berkomitmen menjaga harga acuan fase internal BIX di <b className="lux-gold-text">$0.50</b> selama <b>1 tahun</b>, dan menargetkan harga prediksi minimal <b className="lux-gold-text">$5</b> ke atas saat BIX masuk pasar DEX dan CEX.</p>
      <ul className="mt-5 grid gap-2">
        {DEVS.map((d, i) => <li key={d.country} className="covenant-sign">
          <span className="text-xl" aria-hidden>{d.flag}</span>
          <div className="min-w-0 flex-1"><b className="block text-[12px]">{d.role}</b><span className="lux-label">{d.country}</span></div>
          <div className="text-right"><span className="covenant-ink">Signed</span><span className="lux-label numeric block">SIG-0{i + 1} · BIX</span></div>
        </li>)}
      </ul>
      <div className="covenant-seal mx-auto mt-5" aria-label="Segel digital developer"><span>BIXLINK</span><b>5 · 5</b><span>SEALED</span></div>
      <p className="mt-4 text-center text-[9px] text-muted-foreground">Harga $0.50 adalah acuan internal BIXLINK dan $5 adalah target prediksi, bukan jaminan hasil. Harga pasar DEX/CEX ditentukan pasar.</p>
    </div>
  </section>;
}
