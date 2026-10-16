import { useEffect, useState } from 'react';
import { Plane } from 'lucide-react';

const STEPS = ['Scanning the blockchain…', 'Matching your exact deposit amount…', 'Confirming the transaction…'];

export function DepositFlightScanner({ done = false }: { done?: boolean }) {
  const [step, setStep] = useState(0);
  useEffect(() => { if (done) return; const t = setInterval(() => setStep(s => (s + 1) % STEPS.length), 2200); return () => clearInterval(t); }, [done]);
  return <div className={`dep-flight${done ? ' is-done' : ''}`} role="status" aria-live="polite">
    <div className="dep-flight-sky" aria-hidden>
      <span className="dep-flight-radar"/>
      <span className="dep-flight-trail"/>
      <span className="dep-flight-plane"><Plane size={26}/></span>
    </div>
    <p className="dep-flight-text">{done ? 'Deposit matched!' : STEPS[step]}</p>
  </div>;
}
