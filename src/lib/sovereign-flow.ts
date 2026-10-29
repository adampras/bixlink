export function parseWalletRecipient(raw: string, ledger: boolean): string | null {
  if (!ledger) return raw.match(/0x[a-fA-F0-9]{40}/)?.[0] ?? null;
  const text = raw.trim();
  if (/^BIX-\d{6}$/i.test(text)) return text.toUpperCase();
  try {
    const code = new URL(text).searchParams.get('to') ?? '';
    return /^BIX-\d{6}$/i.test(code) ? code.toUpperCase() : null;
  } catch { return null; }
}