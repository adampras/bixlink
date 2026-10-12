import { useEffect, useRef, useState } from 'react';
import { number } from '@/lib/bixlink';

/** Rolling odometer-style number. Display only — never changes the underlying value. */
export function AnimatedNumber({ value, digits = 2, duration = 900 }: { value: number; digits?: number; duration?: number }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(value); from.current = value; return; }
    const start = from.current; const t0 = performance.now(); let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration); const e = 1 - Math.pow(1 - p, 3);
      setShown(start + (value - start) * e);
      if (p < 1) raf = requestAnimationFrame(tick); else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{number(shown, { minimumFractionDigits: digits, maximumFractionDigits: digits })}</>;
}
