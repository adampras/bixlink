const NATIONS = [
  { code: 'SG', flag: 'sg', name: 'Singapore', role: 'Core Architecture', body: 'Ledger systems & platform engineering' },
  { code: 'ID', flag: 'id', name: 'Indonesia', role: 'Regional Growth', body: 'Community, leaders & member support' },
  { code: 'MY', flag: 'my', name: 'Malaysia', role: 'Operations', body: 'Compliance readiness & partner relations' },
  { code: 'HK', flag: 'hk', name: 'Hong Kong', role: 'Markets', body: 'Asia market research & liquidity planning' },
  { code: 'AE', flag: 'ae', name: 'Dubai · UAE', role: 'Global Expansion', body: 'Middle East network & RWA narrative' },
];

export function NationAlliance() {
  return <section className="nation-alliance" aria-labelledby="nation-title">
    <div className="eyebrow">GLOBAL ALLIANCE</div>
    <h2 id="nation-title" className="section-title">5-NATION <span>CONSORTIUM</span></h2>
    <div className="nation-grid">{NATIONS.map(n => <article key={n.code} className="nation-card">
      <div className="nation-avatar">{n.code}<img src={`https://flagcdn.com/w40/${n.flag}.png`} alt="" loading="lazy" width={24} height={16}/></div>
      <b>{n.name}</b><small>{n.role}</small><p>{n.body}</p>
    </article>)}</div>
    <p className="mt-4 text-center text-[10px] text-muted-foreground">Regional focus roles. Official team profiles are published by BIXLINK GLOBAL after verification.</p>
  </section>;
}
