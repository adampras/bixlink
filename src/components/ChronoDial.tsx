/** Chronograph ornament (RM-style torque arc + tourbillon). Shown only when html[data-chrono=on]. Display-only. */
export function ChronoDial({ value, label, caption, beat = 60 }: { value: number; label: string; caption: string; beat?: number }) {
  const v = Math.max(0, Math.min(1, value));
  const r = 44, len = Math.PI * r;
  return <div className="chrono-only chrono-dial" aria-hidden>
    <svg viewBox="0 0 120 70" className="chrono-arc">
      <path d="M16 62 A44 44 0 0 1 104 62" className="chrono-arc__track"/>
      <path d="M16 62 A44 44 0 0 1 104 62" className="chrono-arc__fill" strokeDasharray={`${len * v} ${len}`}/>
      <line x1="60" y1="62" x2="60" y2="24" className="chrono-arc__hand" style={{ transform: `rotate(${v * 180 - 90}deg)`, transformOrigin: '60px 62px' }}/>
    </svg>
    <span className="chrono-tourbillon" style={{ animationDuration: `${beat}s` }}><i/><i/><i/></span>
    <div className="chrono-dial__text"><b>{label}</b><small>{caption}</small></div>
  </div>;
}
