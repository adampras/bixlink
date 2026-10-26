import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { getWalletProfile, saveWalletProfile } from '@/lib/wallet-login.functions';
import { DIAL_COUNTRIES, detectCountry, filterCountries, orderCountries, toE164 } from '@/lib/phone-country';

/** Split a stored E.164 number into a known dial country and the local part. */
function splitE164(value: string) {
  const digits = value.replace(/^\+/, '');
  const match = [...DIAL_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find(c => digits.startsWith(c.dial));
  return match ? { iso: match.iso, local: digits.slice(match.dial.length) } : null;
}

export function WalletAccountDetails() {
  const save = useServerFn(saveWalletProfile);
  const load = useServerFn(getWalletProfile);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('ID');
  const [detected, setDetected] = useState('ID');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const dial = DIAL_COUNTRIES.find(c => c.iso === country) ?? DIAL_COUNTRIES[0]!;
  const apply = (profile: { full_name: string; username: string; whatsapp: string | null }) => {
    setName(profile.full_name === profile.username ? '' : profile.full_name);
    const parts = profile.whatsapp ? splitE164(profile.whatsapp) : null;
    if (parts) { setCountry(parts.iso); setPhone(parts.local); }
  };
  useEffect(() => {
    const d = detectCountry(Intl.DateTimeFormat().resolvedOptions().timeZone, navigator.language);
    setDetected(d); setCountry(d);
    void load().then(apply).catch(() => setNotice('Could not load your profile.'));
  }, []);
  const countryList = filterCountries(orderCountries(detected), query);
  return <section className="mt-5 border-b border-border pb-5"><h2 className="font-bold">Wallet account</h2><p className="mt-2 text-xs text-muted-foreground">Keep this wallet secure. Email recovery is unavailable until you add and verify a real email. Email-required rewards remain locked.</p><form className="mt-4 grid gap-3" onSubmit={async e => {
    e.preventDefault(); setBusy(true); setNotice('');
    try {
      const whatsapp = phone.trim() ? toE164(dial.dial, phone) : '';
      if (whatsapp === null) throw new Error('Please enter a valid WhatsApp number.');
      await save({ data: { fullName: name.trim(), whatsapp } });
      apply(await load());
      if (email.trim()) {
        const { error } = await supabase.auth.updateUser({ email: email.trim() }, { emailRedirectTo: `${window.location.origin}/auth` });
        if (error) throw error;
        setNotice('Profile saved. Check your real email to confirm the change.');
      } else setNotice('Profile saved.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not save profile.'); }
    finally { setBusy(false); }
  }}>
    <label className="text-xs text-muted-foreground">Full name · optional<input className="form-input mt-1" maxLength={80} autoComplete="name" value={name} onChange={e => setName(e.target.value)}/></label>
    <div className="text-xs text-muted-foreground"><span id="wwa-label">WhatsApp · optional</span><div className="relative mt-1 grid grid-cols-[6.75rem_minmax(0,1fr)] gap-2">
      <button type="button" aria-label="Choose country code" aria-expanded={pickerOpen} onClick={() => { setPickerOpen(v => !v); setQuery(''); }} className="form-input flex items-center justify-center gap-1 px-2 text-sm text-foreground"><span>{dial.flag}</span><span>+{dial.dial}</span><span className="text-[10px] opacity-60">▼</span></button>
      <input id="wwa-input" aria-labelledby="wwa-label" type="tel" inputMode="tel" autoComplete="tel-national" value={phone} onChange={e => setPhone(e.target.value)} onFocus={() => setPickerOpen(false)} className="form-input min-w-0" placeholder="812 3456 7890"/>
      {pickerOpen && <div className="absolute left-0 top-full z-30 mt-1 w-full overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-xl">
        <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search country or code…" aria-label="Search country" className="w-full border-b border-border bg-transparent px-3 py-2.5 text-sm outline-none"/>
        <ul className="max-h-56 overflow-y-auto py-1" role="listbox">{countryList.length === 0 ? <li className="px-3 py-2 text-xs text-muted-foreground">No country found</li> : countryList.map(c => <li key={c.iso}><button type="button" role="option" aria-selected={c.iso === country} onClick={() => { setCountry(c.iso); setPickerOpen(false); document.getElementById('wwa-input')?.focus(); }} className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent ${c.iso === country ? 'text-chart-3' : ''}`}><span>{c.flag}</span><span className="flex-1">{c.name}</span><span className="text-muted-foreground">+{c.dial}</span></button></li>)}</ul>
      </div>}
    </div></div>
    <label className="text-xs text-muted-foreground">Recovery email · optional<input className="form-input mt-1" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}/></label>
    <Button disabled={busy} type="submit" variant="outline">{busy ? 'Saving…' : 'Save details'}</Button>{notice && <p role="status" className="text-xs text-chart-2">{notice}</p>}
  </form></section>;
}
