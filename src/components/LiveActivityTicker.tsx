import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { getPublicActivity } from '@/lib/growth.functions';
import { DIAL_COUNTRIES } from '@/lib/phone-country';

type Row = { flag: string; country: string; text: string; real?: boolean };

const SIM: Array<[string, string, 'stake' | 'presale', number]> = [
  ['🇸🇬', 'Singapore', 'stake', 250], ['🇯🇵', 'Japan', 'presale', 500], ['🇰🇷', 'South Korea', 'stake', 120],
  ['🇦🇪', 'UAE', 'stake', 3000], ['🇩🇪', 'Germany', 'presale', 100], ['🇬🇧', 'United Kingdom', 'stake', 750],
  ['🇮🇩', 'Indonesia', 'presale', 200], ['🇲🇾', 'Malaysia', 'stake', 300], ['🇻🇳', 'Vietnam', 'presale', 150],
  ['🇹🇭', 'Thailand', 'stake', 450], ['🇮🇳', 'India', 'presale', 80], ['🇧🇷', 'Brazil', 'stake', 600],
  ['🇳🇬', 'Nigeria', 'presale', 100], ['🇦🇺', 'Australia', 'stake', 900], ['🇨🇦', 'Canada', 'presale', 350],
  ['🇺🇸', 'United States', 'presale', 5000], ['🇫🇷', 'France', 'stake', 220], ['🇵🇭', 'Philippines', 'presale', 60],
  ['🇿🇦', 'South Africa', 'stake', 180], ['🇹🇷', 'Türkiye', 'presale', 400], ['🇸🇦', 'Saudi Arabia', 'stake', 800],
  ['🇨🇳', 'China', 'presale', 950], ['🇭🇰', 'Hong Kong', 'stake', 500], ['🇹🇼', 'Taiwan', 'presale', 270],
  ['🇳🇱', 'Netherlands', 'stake', 130], ['🇨🇭', 'Switzerland', 'presale', 700], ['🇲🇽', 'Mexico', 'stake', 90],
  ['🇮🇹', 'Italy', 'presale', 320], ['🇪🇸', 'Spain', 'stake', 540], ['🇵🇰', 'Pakistan', 'presale', 50],
];

const label = (kind: string, usd: number) => {
  const v = `$${usd.toLocaleString('en-US')}`;
  return kind === 'presale' ? `secured ${v} in Presale Round 1` : `staked ${v} USDT`;
};

function countryOf(dial: string) {
  const d = dial.replace('+', '');
  const c = [...DIAL_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find(x => d.startsWith(x.dial));
  return c ? { flag: c.flag, country: c.name } : { flag: '🌐', country: 'Global' };
}

/** Running activity strip: recorded member stakes/presale (verified) mixed with labelled simulated activity. */
export function LiveActivityTicker() {
  const load = useServerFn(getPublicActivity);
  const { data } = useQuery({ queryKey: ['public-activity'], queryFn: () => load(), staleTime: 60_000, refetchInterval: 120_000 });
  const real: Row[] = (data ?? []).filter(r => r.amount_usd > 0).map(r => ({ ...countryOf(r.dial), text: label(r.kind, r.amount_usd), real: true }));
  const sim: Row[] = SIM.map(([flag, country, kind, usd]) => ({ flag, country, text: label(kind, usd) }));
  const rows: Row[] = [];
  sim.forEach((s, i) => { rows.push(s); const r = i % 3 === 2 ? real[Math.floor(i / 3)] : undefined; if (r) rows.push(r); });
  return <div className="lux-ticker live-activity-ticker" aria-label="Global member activity">
    <div className="lux-ticker-track" style={{ animationDuration: '90s' }}>
      {[0, 1].map(k => <span key={k} aria-hidden={k === 1}>
        {rows.map((r, i) => <b key={i}>{r.flag} {r.country.toUpperCase()} · MEMBER {r.text.toUpperCase()}{r.real ? ' · VERIFIED' : ''}</b>)}
      </span>)}
    </div>
    <small className="block px-4 pb-2 text-center text-[9px] tracking-wider text-muted-foreground">Includes simulated community activity for illustration; entries marked VERIFIED are recorded member transactions.</small>
  </div>;
}
