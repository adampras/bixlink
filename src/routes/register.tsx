import { ModuleGate } from '@/components/ModuleGate';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { VaultStardust } from '@/components/VaultFlourish';
import { DIAL_COUNTRIES, detectCountry, toE164, orderCountries, filterCountries } from '@/lib/phone-country';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { BixShell } from '@/components/BixShell';
import { passwordValid, PASSWORD_HINT } from '@/lib/password-rule';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { WalletSignIn } from '@/components/WalletSignIn';

export const Route = createFileRoute('/register')({
  validateSearch: (search: Record<string, unknown>): { ref?: string | undefined; target?: string | undefined } => ({ ref: typeof search['ref'] === 'string' ? search['ref'] : undefined, target: typeof search['target'] === 'string' ? search['target'] : undefined }),
  head: () => ({ links: [{ rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap' }], meta: [{ title: 'Create a BIXLINK Account' }, { name: 'description', content: 'Create your BIXLINK member account with an optional referral code.' }, { property: 'og:title', content: 'Create a BIXLINK Account' }, { property: 'og:description', content: 'You are invited to BIXLINK — join the Genesis staking ecosystem with your inviter code.' }, { property: 'og:type', content: 'website' }, { property: 'og:image', content: 'https://bixlink.com/__l5e/assets-v1/c62ecff6-c5d1-4235-8e7a-e49c0c2b7039/fox-icon-512.png' }, { name: 'twitter:card', content: 'summary' }, { name: 'twitter:image', content: 'https://bixlink.com/__l5e/assets-v1/c62ecff6-c5d1-4235-8e7a-e49c0c2b7039/fox-icon-512.png' }] }),
  component: () => <ModuleGate module="register"><RegisterPage/></ModuleGate>,

});

function RegisterPage() {
  const [email, setEmail] = useState(''); const [fullName, setFullName] = useState(''); const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [referral, setReferral] = useState(''); const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false);
  const [country, setCountry] = useState('ID'); const [phone, setPhone] = useState('');
  const { ref, target } = Route.useSearch();
  useEffect(() => { if (target === 'presale') window.localStorage.setItem('bixlink-target', 'presale'); }, [target]);
  const [showPassword, setShowPassword] = useState(false);
  useEffect(() => { const incoming = ref || window.localStorage.getItem('bixlink-ref') || ''; if (/^BIX-\d{6}$/i.test(incoming)) { const normalized = incoming.toUpperCase(); setReferral(normalized); window.localStorage.setItem('bixlink-ref', normalized); } }, [ref]);
  const dial = DIAL_COUNTRIES.find(c => c.iso === country) ?? DIAL_COUNTRIES[0]!;
  const [pickerOpen, setPickerOpen] = useState(false); const [query, setQuery] = useState(''); const [detected, setDetected] = useState('ID');
  useEffect(() => { const d = detectCountry(Intl.DateTimeFormat().resolvedOptions().timeZone, navigator.language); setDetected(d); setCountry(d); }, []);
  const countryList = filterCountries(orderCountries(detected), query);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setNotice('');
    try {
      const uname = username.trim().toLowerCase(); const code = referral.trim().toUpperCase();
      if (fullName.trim().length < 2) throw new Error('Please enter your full name.');
      if (!/^[a-z0-9_.]{3,24}$/.test(uname)) throw new Error('Username: 3–24 letters, numbers, _ or .');
      const whatsapp = toE164(dial.dial, phone);
      if (!whatsapp) throw new Error('Please enter a valid WhatsApp number.');
      if (code && !/^BIX-\d{6}$/.test(code)) throw new Error('Referral code must use the format BIX-123456.');
      const { data: free } = await supabase.rpc('bix_username_available', { p_username: uname });
      if (!free) throw new Error('That username is already taken.');
      if (code) window.localStorage.setItem('bixlink-ref', code); else window.localStorage.removeItem('bixlink-ref');
      if (!passwordValid(password)) throw new Error(PASSWORD_HINT);
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth`, data: { full_name: fullName.trim().slice(0, 80), username: uname, whatsapp, whatsapp_country: dial.iso } } });
      if (error) throw error;
      setNotice('Check your email to confirm your account, then sign in.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not create your account.'); } finally { setBusy(false); }
  };
  const label = 'block text-xs font-bold text-muted-foreground';
  return <BixShell><main id="member-access" className="auth-vault-page mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-5 py-10"><VaultStardust/><Link to="/" className="relative z-10 mb-3 inline-flex items-center gap-1.5 self-start rounded-full border border-chart-3/30 bg-card/50 px-3 py-1.5 text-xs font-bold text-chart-3 backdrop-blur-md">← Back to HOME</Link><div className="auth-vault">
    <div className="flex items-center justify-center gap-2.5"><img src="https://bixlink.com/__l5e/assets-v1/c62ecff6-c5d1-4235-8e7a-e49c0c2b7039/fox-icon-512.png" alt="" className="h-9 w-9 rounded-full border border-chart-3/40"/><div className="text-left"><div className="text-lg font-black leading-none tracking-wide">BIX<span className="text-chart-3">LINK</span></div><div className="mt-1 text-[9px] font-bold tracking-[0.2em] text-muted-foreground">CREATE MEMBER ACCOUNT</div></div></div>
    <nav className="auth-tabs mt-5" aria-label="Account"><Link to="/auth">SIGN IN</Link><Link to="/register" data-active="true">REGISTER</Link></nav>
    <form onSubmit={submit} className="mt-6 space-y-3.5" aria-label="Create BIXLINK account">
      <label className={label}>FULL NAME<input required minLength={2} maxLength={80} autoComplete="name" value={fullName} onChange={e => setFullName(e.target.value)} className="form-input mt-1.5" placeholder="Your full name"/></label>
      <label className={label}>USERNAME<input required pattern="[A-Za-z0-9_.]{3,24}" maxLength={24} autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} className="form-input mt-1.5" placeholder="3–24 letters or numbers"/></label>
      <div className={label}><span id="wa-label">WHATSAPP NUMBER</span><div className="relative mt-1.5 grid grid-cols-[6.75rem_minmax(0,1fr)] gap-2">
        <button type="button" aria-label="Choose country code" aria-expanded={pickerOpen} onClick={() => { setPickerOpen(v => !v); setQuery(''); }} style={{ width: "6.75rem", flex: "0 0 6.75rem" }} className="form-input flex items-center justify-center gap-1 px-2 text-sm text-foreground"><span>{dial.flag}</span><span>+{dial.dial}</span><span className="text-[10px] opacity-60">▼</span></button>
        <input id="wa-input" aria-labelledby="wa-label" required type="tel" inputMode="tel" autoComplete="tel-national" value={phone} onChange={e => setPhone(e.target.value)} onFocus={() => setPickerOpen(false)} style={{ flex: "1 1 0%", width: "auto" }} className="form-input min-w-0" placeholder="812 3456 7890"/>
        {pickerOpen && <div className="absolute left-0 top-full z-30 mt-1 w-full overflow-hidden rounded-xl border border-border bg-background text-foreground shadow-xl">
          <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search country or code…" aria-label="Search country" className="w-full border-b border-border bg-transparent px-3 py-2.5 text-sm outline-none"/>
          <ul className="max-h-56 overflow-y-auto py-1" role="listbox">{countryList.length === 0 ? <li className="px-3 py-2 text-xs text-muted-foreground">No country found</li> : countryList.map(c => <li key={c.iso}><button type="button" role="option" aria-selected={c.iso === country} onClick={() => { setCountry(c.iso); setPickerOpen(false); document.getElementById('wa-input')?.focus(); }} className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent ${c.iso === country ? 'text-chart-3' : ''}`}><span>{c.flag}</span><span className="flex-1">{c.name}</span><span className="text-muted-foreground">+{c.dial}</span></button></li>)}</ul>
        </div>}
      </div></div>
      <label className={label}>EMAIL<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="form-input mt-1.5" placeholder="you@example.com"/></label>
      <label className={label}>PASSWORD<div className="relative mt-1.5"><input required minLength={6} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className="form-input pr-12" placeholder="••••••••"/><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(v => !v)}>{showPassword ? <EyeOff/> : <Eye/>}</Button></div></label>
      {password.length > 0 && <div className="pw-rules" aria-live="polite"><span className={password.length >= 8 ? 'is-ok' : ''}>8+ characters</span><span className={/[A-Z]/.test(password) && /[a-z]/.test(password) ? 'is-ok' : ''}>Upper & lower case</span><span className={/\d/.test(password) ? 'is-ok' : ''}>One number</span><span className={/[^A-Za-z0-9]/.test(password) && !/\s/.test(password) ? 'is-ok' : ''}>One symbol</span></div>}
      <label className={label}><span className="flex justify-between">REFERRAL CODE<span className="text-[9px] opacity-70">OPTIONAL</span></span><input maxLength={10} value={referral} onChange={e => setReferral(e.target.value.toUpperCase())} className="form-input mt-1.5 font-mono tracking-widest" placeholder="BIX-123456"/></label>
      {notice && <p role="status" className="text-sm text-chart-2">{notice}</p>}
      <Button type="submit" disabled={busy} className="mt-2 h-12 w-full rounded-full bg-primary text-sm font-black tracking-widest text-primary-foreground hover:bg-primary/90">{busy ? 'Please wait…' : 'Create account'} <ArrowRight/></Button>
    </form>
    <div className="my-5 text-center text-[10px] font-bold tracking-widest text-muted-foreground">OR</div>
    <Button type="button" variant="outline" className="h-12 w-full rounded-full border-border bg-card" onClick={async () => { const r = await lovable.auth.signInWithOAuth('google', { redirect_uri: `${window.location.origin}/auth` }); if (r.error) setNotice(r.error.message); else if (!r.redirected) window.location.assign('/'); }}>Register with Google</Button>
    <WalletSignIn/>
    <p className="mt-6 text-center text-sm text-muted-foreground">Already have an account? <Link to="/auth" className="font-bold text-chart-2">Sign in</Link></p>
  </div></main></BixShell>;
}
