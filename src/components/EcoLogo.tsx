/** Minimal per-ecosystem emblem + wordmark. The gold fox stays the platform mark; each service gets its own sign. */
type Eco = { a: string; b: string; tone: string; path: string };
export const ECO_LOGOS: Record<string, Eco> = {
  bixgo: { a: 'BIX', b: 'GO', tone: '#10B981', path: 'M5 7l6 5-6 5M12 7l6 5-6 5' },
  bixtok: { a: 'BIX', b: 'TOK', tone: '#A855F7', path: 'M8 6.5v11l9-5.5zM19 5.5a8 8 0 0 1 0 13' },
  call: { a: 'BIX', b: 'CALL', tone: '#38BDF8', path: 'M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6zM9 10v4M12 8v8M15 10v4' },
  pay: { a: 'BIX', b: 'PAY', tone: '#E5E7EB', path: 'M8.5 8.5a3.5 3.5 0 1 0 0 7c2 0 3.5-2 3.5-3.5S13.5 8.5 15.5 8.5a3.5 3.5 0 1 1 0 7' },
  exchange: { a: 'BIX', b: 'EXCHANGER', tone: '#22C55E', path: 'M6 18V11M10 18V7M14 18v-5M18 18V5M4 19h16' },
  gold: { a: 'BIX', b: 'GOLD', tone: '#FFD700', path: 'M9 4h6l4 4v6l-4 4H9l-4-4V8zM9 10l1.5 1.5L12 9l1.5 2.5L15 10' },
  care: { a: 'BIX', b: 'CARE', tone: '#34D399', path: 'M10 5h4v5h5v4h-5v5h-4v-5H5v-4h5z' },
  nft: { a: 'BIX', b: 'MALL', tone: '#F9A8D4', path: 'M6 9h12l-1 11H7zM9 9V7a3 3 0 0 1 6 0v2M6 9l6 4 6-4' },
};
export function EcoLogo({ id, size = 22, className = '' }: { id: string; size?: number; className?: string }) {
  const e = ECO_LOGOS[id]; if (!e) return null;
  return <span className={`eco-logo ${className}`} style={{ ['--eco' as string]: e.tone }} aria-label={`${e.a} ${e.b}`}>
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={e.path}/></svg>
    <b><span>{e.a}</span>{e.b}</b>
  </span>;
}
