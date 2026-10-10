import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { VaultStardust, VaultLogo, VaultNode } from '@/components/VaultFlourish';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { BixShell } from '@/components/BixShell';
import { passwordValid, PASSWORD_HINT } from '@/lib/password-rule';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';

export const Route = createFileRoute('/register')({
  validateSearch: (search: Record<string, unknown>): { ref?: string | undefined; target?: string | undefined } => ({ ref: typeof search['ref'] === 'string' ? search['ref'] : undefined, target: typeof search['target'] === 'string' ? search['target'] : undefined }),
  head: () => ({ links: [{ rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap' }], meta: [{ title: 'Create a BIXLINK Account' }, { name: 'description', content: 'Create your BIXLINK member account with an optional referral code.' }, { property: 'og:title', content: 'Create a BIXLINK Account' }, { property: 'og:description', content: 'You are invited to BIXLINK — join the Genesis staking ecosystem with your inviter code.' }, { property: 'og:type', content: 'website' }, { property: 'og:image', content: 'https://bixlink.lovable.app/__l5e/assets-v1/c44e33af-5cb2-4bf8-9d9f-ce8af06b3e8b/bix-reactor-poster.jpg' }, { name: 'twitter:card', content: 'summary_large_image' }, { name: 'twitter:image', content: 'https://bixlink.lovable.app/__l5e/assets-v1/c44e33af-5cb2-4bf8-9d9f-ce8af06b3e8b/bix-reactor-poster.jpg' }] }),
  component: RegisterPage,

});

function RegisterPage() {
  const [email, setEmail] = useState(''); const [fullName, setFullName] = useState(''); const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [referral, setReferral] = useState(''); const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false);
  const { ref, target } = Route.useSearch();
  useEffect(() => { if (target === 'presale') window.localStorage.setItem('bixlink-target', 'presale'); }, [target]);
  const [showPassword, setShowPassword] = useState(false);
  useEffect(() => { const incoming = ref || window.localStorage.getItem('bixlink-ref') || ''; if (/^BIX-\d{6}$/i.test(incoming)) { const normalized = incoming.toUpperCase(); setReferral(normalized); window.localStorage.setItem('bixlink-ref', normalized); } }, [ref]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setNotice('');
    try {
      const uname = username.trim().toLowerCase(); const code = referral.trim().toUpperCase();
      if (!/^[a-z0-9_.]{3,24}$/.test(uname)) throw new Error('Username: 3–24 letters, numbers, _ or .');
      if (fullName.trim().length < 2) throw new Error('Please enter your full name.');
      if (code && !/^BIX-\d{6}$/.test(code)) throw new Error('Referral code must use the format BIX-123456.');
      const { data: free } = await supabase.rpc('bix_username_available', { p_username: uname });
      if (!free) throw new Error('That username is already taken.');
      if (code) window.localStorage.setItem('bixlink-ref', code); else window.localStorage.removeItem('bixlink-ref');
      if (!passwordValid(password)) throw new Error(PASSWORD_HINT);
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth`, data: { full_name: fullName.trim().slice(0, 80), username: uname } } });
      if (error) throw error;
      setNotice('Check your email to confirm your account, then sign in.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not create your account.'); } finally { setBusy(false); }
  };
  return <BixShell><main className="register-numbered"><VaultStardust/><Link to="/" className="relative z-10 mb-3 inline-flex items-center gap-1.5 self-start rounded-full border border-chart-3/30 bg-card/50 px-3 py-1.5 text-xs font-bold text-chart-3 backdrop-blur-md">← Back to HOME</Link><div className="register-numbered-inner register-vault"><nav className="auth-tabs mb-6" aria-label="Account"><Link to="/auth">SIGN IN</Link><Link to="/register" data-active="true">REGISTER</Link></nav>
    <header className="register-numbered-brand"><VaultLogo/><div className="auth-badge mb-4"><span/>SECURE ONBOARDING</div><h1>BIX<span>LINK</span></h1><VaultNode/></header>
    <form onSubmit={submit} className="space-y-6" aria-label="Create BIXLINK account">
      <fieldset className="register-numbered-step"><legend className="sr-only">Personal profile</legend><span className="register-step-number" aria-hidden>01</span><div className="space-y-2.5"><h2>Personal profile</h2>
        <input aria-label="Full name" required minLength={2} maxLength={80} autoComplete="name" value={fullName} onChange={event => setFullName(event.target.value)} className="register-numbered-input" placeholder="Full Name"/>
        <input aria-label="Username" required pattern="[A-Za-z0-9_.]{3,24}" maxLength={24} autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} className="register-numbered-input" placeholder="Username"/>
      </div></fieldset>
      <fieldset className="register-numbered-step"><legend className="sr-only">Account security</legend><span className="register-step-number" aria-hidden>02</span><div className="space-y-2.5"><h2>Security hub</h2>
        <input aria-label="Email address" required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="register-numbered-input" placeholder="Email Address"/>
        <div className="relative"><input aria-label="Password" required minLength={6} type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} className="register-numbered-input pr-12" placeholder="Secure Password"/><Button type="button" variant="ghost" size="icon" className="register-password-toggle" title={showPassword ? 'Hide password' : 'Show password'} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(current => !current)}>{showPassword ? <EyeOff/> : <Eye/>}</Button></div>
      </div></fieldset>
      <fieldset className="register-numbered-step"><legend className="sr-only">Referral</legend><span className="register-step-number" aria-hidden>03</span><div className="space-y-2.5"><div className="flex items-center justify-between gap-2"><h2>Network code</h2><span className="text-[9px] font-bold uppercase text-muted-foreground">Optional</span></div>
        <input aria-label="Referral code" inputMode="text" maxLength={10} value={referral} onChange={event => setReferral(event.target.value.toUpperCase())} className="register-numbered-input register-network-code" placeholder="BIX-123456"/>
      </div></fieldset>
      {notice && <p role="status" className="text-sm leading-6 text-chart-2">{notice}</p>}
      <div className="space-y-4 pt-4"><Button type="submit" disabled={busy} className="register-numbered-submit vault-shimmer">{busy ? 'Please wait…' : 'Create account'}<ArrowRight/></Button><div className="text-center text-[10px] font-bold tracking-widest text-muted-foreground">OR</div><Button type="button" variant="outline" className="h-12 w-full rounded-full border-border bg-card" onClick={async () => { const r = await lovable.auth.signInWithOAuth('google', { redirect_uri: `${window.location.origin}/auth` }); if (r.error) setNotice(r.error.message); else if (!r.redirected) window.location.assign('/'); }}>Register with Google</Button><p className="text-center text-sm text-muted-foreground">Already have an account? <Link to="/auth" className="font-bold text-chart-2">Sign in</Link></p></div>
    </form>
  </div></main></BixShell>;
}
