/** Lux tiered vehicle silhouettes for BIXGO (moto, saver, urban, executive, black VIP). */
export type VehicleKind = 'moto' | 'saver' | 'urban' | 'executive' | 'black';
export function vehicleKind(name: string): VehicleKind {
  const n = name.toLowerCase();
  if (n.includes('saver')) return 'saver';
  if (n.includes('moto')) return 'moto';
  if (n.includes('black')) return 'black';
  if (n.includes('executive')) return 'executive';
  return 'urban';
}
export function BixgoVehicleIcon({ kind, className = '' }: { kind: VehicleKind; className?: string }) {
  const gold = kind === 'black';
  return <svg viewBox="0 0 64 40" className={`bixgo-veh ${gold ? 'is-vip' : ''} ${className}`} fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <defs>
      <linearGradient id={`vb-${kind}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--veh-hi)"/><stop offset="1" stopColor="var(--veh-lo)"/></linearGradient>
    </defs>
    {kind === 'moto' || kind === 'saver' ? <>
      <path d="M14 27 L24 18 H36 L42 12 H48 L46 18 L52 27" stroke="var(--veh-line)" strokeWidth="2.2"/>
      <path d="M22 27 Q30 18 44 22 L48 27 Z" fill={`url(#vb-${kind})`} stroke="var(--veh-line)" strokeWidth="1.4"/>
      <path d="M30 17 H38" stroke="var(--veh-accent)" strokeWidth="2.4"/>
      <circle cx="14" cy="28" r="6.5" stroke="var(--veh-line)" strokeWidth="2.4"/><circle cx="14" cy="28" r="2" fill="var(--veh-accent)"/>
      <circle cx="50" cy="28" r="6.5" stroke="var(--veh-line)" strokeWidth="2.4"/><circle cx="50" cy="28" r="2" fill="var(--veh-accent)"/>
      <path d="M48 12 L53 11" stroke="var(--veh-accent)" strokeWidth="2.4"/>
      {kind === 'saver' && <path d="M30 4 L26 11 H31 L28 17 L35 9 H30 Z" fill="var(--veh-accent)"/>}
    </> : <>
      <path d={kind === 'urban' ? 'M5 27 V22 Q6 18 12 17 L20 10 Q24 8 32 8 H40 Q46 8 50 14 L56 17 Q60 18 60 22 V27 Z' : 'M4 27 V21 Q4 17 9 16 L15 9 Q17 7 22 7 H48 Q53 7 56 12 L59 17 Q61 19 61 22 V27 Z'} fill={`url(#vb-${kind})`} stroke="var(--veh-line)" strokeWidth="1.6"/>
      <path d={kind === 'urban' ? 'M21 16 L26 11 H32 V16 Z M35 16 V11 H41 Q44 11 47 16 Z' : 'M17 15 L21 10 H31 V15 Z M34 15 V10 H44 V15 Z M47 15 V10 H50 Q53 10 55 15 Z'} fill="var(--veh-glass)"/>
      <path d="M57 21 H61" stroke="var(--veh-accent)" strokeWidth="2.6"/>
      <path d="M8 19 H20" stroke="var(--veh-accent)" strokeWidth="1" opacity=".7"/>
      <circle cx="17" cy="28" r="5.5" fill="var(--veh-tyre)" stroke="var(--veh-line)" strokeWidth="2"/><circle cx="17" cy="28" r="1.8" fill="var(--veh-accent)"/>
      <circle cx="48" cy="28" r="5.5" fill="var(--veh-tyre)" stroke="var(--veh-line)" strokeWidth="2"/><circle cx="48" cy="28" r="1.8" fill="var(--veh-accent)"/>
      {gold && <path d="M28 2 L30 5 L32 1.5 L34 5 L36 2 L35.4 6 H28.6 Z" fill="var(--veh-accent)"/>}
    </>}
  </svg>;
}
