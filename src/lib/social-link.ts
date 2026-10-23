const HOSTS: Record<string, string> = { telegram: 't.me', x: 'x.com', youtube: 'youtube.com', discord: 'discord.gg', instagram: 'instagram.com' };

/** Turns "t.me/name", "@name" or "name" into a full https link; empty stays empty. */
export function normalizeSocial(key: string, raw: string): string {
  const v = raw.trim();
  if (!v) return '';
  if (/^https:\/\//i.test(v)) return v;
  if (/^http:\/\//i.test(v)) return 'https://' + v.slice(7);
  if (v.includes('.') && !v.startsWith('@')) return 'https://' + v;
  const handle = v.replace(/^@/, '');
  const host = HOSTS[key] ?? '';
  return host ? `https://${host}/${key === 'youtube' ? '@' + handle : handle}` : '';
}
