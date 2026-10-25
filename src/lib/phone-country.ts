export type DialCountry = { iso: string; flag: string; dial: string; name: string };

export const DIAL_COUNTRIES: DialCountry[] = [
  { iso: 'ID', flag: '🇮🇩', dial: '62', name: 'Indonesia' },
  { iso: 'MY', flag: '🇲🇾', dial: '60', name: 'Malaysia' },
  { iso: 'SG', flag: '🇸🇬', dial: '65', name: 'Singapore' },
  { iso: 'TH', flag: '🇹🇭', dial: '66', name: 'Thailand' },
  { iso: 'VN', flag: '🇻🇳', dial: '84', name: 'Vietnam' },
  { iso: 'PH', flag: '🇵🇭', dial: '63', name: 'Philippines' },
  { iso: 'CN', flag: '🇨🇳', dial: '86', name: 'China' },
  { iso: 'HK', flag: '🇭🇰', dial: '852', name: 'Hong Kong' },
  { iso: 'TW', flag: '🇹🇼', dial: '886', name: 'Taiwan' },
  { iso: 'JP', flag: '🇯🇵', dial: '81', name: 'Japan' },
  { iso: 'KR', flag: '🇰🇷', dial: '82', name: 'South Korea' },
  { iso: 'IN', flag: '🇮🇳', dial: '91', name: 'India' },
  { iso: 'AE', flag: '🇦🇪', dial: '971', name: 'UAE' },
  { iso: 'SA', flag: '🇸🇦', dial: '966', name: 'Saudi Arabia' },
  { iso: 'ZA', flag: '🇿🇦', dial: '27', name: 'South Africa' },
  { iso: 'AU', flag: '🇦🇺', dial: '61', name: 'Australia' },
  { iso: 'GB', flag: '🇬🇧', dial: '44', name: 'United Kingdom' },
  { iso: 'US', flag: '🇺🇸', dial: '1', name: 'United States' },
];

const TZ: Record<string, string> = {
  'Asia/Jakarta': 'ID', 'Asia/Makassar': 'ID', 'Asia/Jayapura': 'ID', 'Asia/Pontianak': 'ID',
  'Asia/Kuala_Lumpur': 'MY', 'Asia/Kuching': 'MY', 'Asia/Singapore': 'SG', 'Asia/Bangkok': 'TH',
  'Asia/Ho_Chi_Minh': 'VN', 'Asia/Saigon': 'VN', 'Asia/Manila': 'PH', 'Asia/Shanghai': 'CN',
  'Asia/Hong_Kong': 'HK', 'Asia/Taipei': 'TW', 'Asia/Tokyo': 'JP', 'Asia/Seoul': 'KR',
  'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Asia/Dubai': 'AE', 'Asia/Riyadh': 'SA',
  'Africa/Johannesburg': 'ZA', 'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Europe/London': 'GB',
};

export function detectCountry(timeZone?: string, locale?: string): string {
  if (timeZone && TZ[timeZone]) return TZ[timeZone];
  const region = locale?.split('-')[1]?.toUpperCase();
  if (region && DIAL_COUNTRIES.some(c => c.iso === region)) return region;
  if (timeZone?.startsWith('America/')) return 'US';
  return 'ID';
}

/** Detected (default) country first, then China and Singapore, then the rest. */
export function orderCountries(detected: string): DialCountry[] {
  const top = [detected, 'CN', 'SG'].filter((v, i, a) => a.indexOf(v) === i);
  const pinned = top.map(iso => DIAL_COUNTRIES.find(c => c.iso === iso)).filter((c): c is DialCountry => !!c);
  return [...pinned, ...DIAL_COUNTRIES.filter(c => !top.includes(c.iso))];
}

export function filterCountries(list: DialCountry[], query: string): DialCountry[] {
  const q = query.trim().toLowerCase().replace(/^\+/, '');
  if (!q) return list;
  return list.filter(c => c.name.toLowerCase().includes(q) || c.iso.toLowerCase() === q || c.dial.startsWith(q));
}

/** Returns E.164 number (+62812...) or null when invalid. Strips a leading 0 or repeated dial code. */
export function toE164(dial: string, raw: string): string | null {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith(dial) && digits.length > dial.length + 6) digits = digits.slice(dial.length);
  digits = digits.replace(/^0+/, '');
  if (digits.length < 6 || digits.length > 13) return null;
  return `+${dial}${digits}`;
}
