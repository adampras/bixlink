import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';
import { useShopPromo } from '@/lib/useShopCatalog';

/** Owner-edited flash-drop banner; the countdown is presentation only. */
export function ShopPromoBanner() {
  const { data: promo } = useShopPromo();
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  if (!promo?.enabled) return null;
  const end = promo.endsAt ? new Date(promo.endsAt).getTime() : NaN;
  const left = now !== null && Number.isFinite(end) ? Math.max(0, end - now) : null;
  const parts = left === null ? null : [Math.floor(left / 864e5), Math.floor(left / 36e5) % 24, Math.floor(left / 6e4) % 60, Math.floor(left / 1e3) % 60];
  const body = <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-chart-3/60 bg-card p-4">
    <div className="min-w-0"><p className="flex items-center gap-1 text-[10px] font-bold tracking-widest text-chart-3"><Timer size={12}/> FLASH DROP</p><b className="block truncate font-display text-lg">{promo.title}</b><p className="truncate text-xs text-muted-foreground">{promo.subtitle}</p></div>
    {parts && <div className="numeric flex gap-1 text-center">{parts.map((v, i) => <span key={i} className="min-w-9 rounded-lg border border-border px-1 py-1 text-sm font-bold">{String(v).padStart(2, '0')}<small className="block text-[8px] font-normal text-muted-foreground">{['D', 'H', 'M', 'S'][i]}</small></span>)}</div>}
  </div>;
  return promo.link ? <a href={promo.link} {...(promo.link.startsWith('https') ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="block">{body}</a> : body;
}
