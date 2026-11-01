import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { getPublicActivity } from '@/lib/growth.functions';
import { DIAL_COUNTRIES } from '@/lib/phone-country';

function countryOf(dial: string) {
  const d = dial.replace('+', '');
  const c = [...DIAL_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find(x => d.startsWith(x.dial));
  return c ? { flag: c.flag, country: c.name } : { flag: '🌐', country: 'Global' };
}

function ago(iso: string) {
  const m = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 60000));
  return m < 60 ? `${m}m ago` : m < 1440 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
}

/** Running activity strip: only recorded, verified member deposits and stakes, with masked usernames. */
export function LiveActivityTicker() {
  const load = useServerFn(getPublicActivity);
  const { data } = useQuery({ queryKey: ['public-activity'], queryFn: () => load(), staleTime: 60_000, refetchInterval: 120_000 });
  const rows = (data ?? []).filter(r => r.amount_usd > 0);
  if (!rows.length) return null;
  return <div className="lux-ticker live-activity-ticker" aria-label="Verified member activity">
    <div className="lux-ticker-track" style={{ animationDuration: `${Math.max(40, rows.length * 9)}s` }}>
      {[0, 1].map(k => <span key={k} aria-hidden={k === 1}>
        {rows.map((r, i) => { const c = countryOf(r.dial); const v = `$${r.amount_usd.toLocaleString('en-US')}`;
          return <b key={i} data-no-translate>{c.flag} {r.member} · {c.country.toUpperCase()} — {r.kind === 'deposit' ? `DEPOSITED ${v} USDT` : `STAKED ${v} USDT`} · {ago(r.at).toUpperCase()} · VERIFIED</b>; })}
      </span>)}
    </div>
  </div>;
}
