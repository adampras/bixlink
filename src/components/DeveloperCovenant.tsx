const DEVS = [
  { flag: '🇸🇬', country: 'Singapore', role: 'Lead Protocol Developer' },
  { flag: '🇲🇾', country: 'Malaysia', role: 'Smart Contract Developer' },
  { flag: '🇦🇪', country: 'United Arab Emirates', role: 'Liquidity Developer' },
  { flag: '🇩🇪', country: 'Germany', role: 'Security Developer' },
  { flag: '🇮🇩', country: 'Indonesia', role: 'Treasury & Vault Developer' },
];

export function DeveloperCovenant() {
  return <section className="covenant mt-6" aria-labelledby="covenant-title">
    <div className="covenant-inner">
      <p className="lux-kicker text-center">DEVELOPER COVENANT</p>
      <h2 id="covenant-title" className="lux-gold-text mt-1 text-center font-display text-xl font-black">BIX Price Commitment</h2>
      <div className="covenant-rule mx-auto mt-3" aria-hidden />
      <div className="mt-4 grid grid-cols-2 gap-2 text-center">
        <div className="lux-tile p-3"><span className="lux-label">Internal phase · 1 year</span><b className="lux-gold-text numeric block font-display text-3xl font-black">$0.50</b><span className="lux-label">held by developers</span></div>
        <div className="lux-tile p-3"><span className="lux-label">DEX & CEX listing target</span><b className="lux-gold-text numeric block font-display text-3xl font-black">$5+</b><span className="lux-label">minimum projection</span></div>
      </div>
      <p className="mt-4 text-center text-[12px] leading-relaxed text-foreground/85">We, the BIXLINK developers from five nations, commit to holding the BIX internal-phase reference price at <b className="lux-gold-text">$0.50</b> for <b>1 year</b>, and target a projected minimum price of <b className="lux-gold-text">$5</b> and above when BIX enters DEX and CEX markets.</p>
      <div className="covenant-seal mx-auto mt-5" aria-label="Developer digital seal"><span>BIXLINK</span><b>5 · 5</b><span>SEALED</span></div>
      <p className="lux-kicker mt-6 text-center">RATIFIED BY</p>
      <ul className="mt-2 grid gap-2">
        {DEVS.map((d, i) => <li key={d.country} className="covenant-sign">
          <span className="text-xl" aria-hidden>{d.flag}</span>
          <div className="min-w-0 flex-1"><b className="block text-[12px]">{d.role}</b><span className="lux-label">{d.country}</span></div>
          <div className="text-right"><span className="covenant-ink">Signed</span><span className="lux-label numeric block">SIG-0{i + 1} · BIX</span></div>
        </li>)}
      </ul>
      <p className="mt-4 text-center text-[9px] text-muted-foreground">$0.50 is a BIXLINK internal reference and $5 is a projected target, not a guaranteed return. DEX/CEX prices are set by the market.</p>
    </div>
  </section>;
}
