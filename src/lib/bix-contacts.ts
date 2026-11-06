/** Device-local BIX CALL contact book saved by scanning a member's BIX-ID QR. */
export type BixContact = { id: string; name: string; code: string };
const KEY = 'bixcall-contacts';
export const CONTACTS_EVENT = 'bixcall-contacts';

/** Accepts a bare BIX-ID or a BIX PAY link (?to=BIX-123456). */
export function parseBixId(raw: string): string | null {
  const t = raw.trim();
  if (/^BIX-\d{6}$/i.test(t)) return t.toUpperCase();
  try { const c = new URL(t).searchParams.get('to') ?? ''; return /^BIX-\d{6}$/i.test(c) ? c.toUpperCase() : null; } catch { return null; }
}
export function readContacts(): BixContact[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}
const write = (l: BixContact[]) => { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { /* blocked */ } window.dispatchEvent(new Event(CONTACTS_EVENT)); };
export function addContact(c: BixContact) { write([c, ...readContacts().filter(x => x.id !== c.id)].slice(0, 200)); }
export function removeContact(id: string) { write(readContacts().filter(x => x.id !== id)); }
