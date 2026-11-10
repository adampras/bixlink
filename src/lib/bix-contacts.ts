/** Device-local BIX CALL contact book saved by scanning a member's BIX-ID QR. */
export type BixContact = { id: string; name: string; code: string };
const KEY = 'bixcall-contacts';
export const CONTACTS_EVENT = 'bixcall-contacts';

/** Accepts a BIX-ID (BIX-123456 or 123456), @username, or a BIX link (?to= / ?ref= / ?code=). */
export function parseBixId(raw: string): string | null {
  const t = raw.trim();
  const norm = (v: string) => { const x = v.trim(); if (/^BIX-?\d{6}$/i.test(x)) return 'BIX-' + x.replace(/\D/g, ''); if (/^\d{6}$/.test(x)) return 'BIX-' + x; if (/^@[\w.]{3,}$/.test(x)) return x; return null; };
  const d = norm(t); if (d) return d;
  try { const u = new URL(t); for (const k of ['to', 'ref', 'code', 'id']) { const v = u.searchParams.get(k); const n = v ? norm(v) : null; if (n) return n; } } catch { /* not a URL */ }
  const m = t.match(/BIX-?\d{6}/i); return m ? 'BIX-' + m[0].replace(/\D/g, '') : null;
}
export function readContacts(): BixContact[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}
const write = (l: BixContact[]) => { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { /* blocked */ } window.dispatchEvent(new Event(CONTACTS_EVENT)); };
export function addContact(c: BixContact) { write([c, ...readContacts().filter(x => x.id !== c.id)].slice(0, 200)); }
export function removeContact(id: string) { write(readContacts().filter(x => x.id !== id)); }
