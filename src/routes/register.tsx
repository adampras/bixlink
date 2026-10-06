import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ArrowRight, BadgeCheck } from 'lucide-react';
import { BixShell } from '@/components/BixShell';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/register')({
  validateSearch: (search: Record<string, unknown>): { ref?: string } => ({ ref: typeof search['ref'] === 'string' ? search['ref'] : undefined }),
  head: () => ({ meta: [{ title: 'Create a BIXLINK Account' }, { name: 'description', content: 'Create your BIXLINK member account with an optional referral code.' }, { property: 'og:title', content: 'Create a BIXLINK Account' }, { property: 'og:description', content: 'Register as a BIXLINK member and attach your inviter code.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const [email, setEmail] = useState(''); const [fullName, setFullName] = useState(''); const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [referral, setReferral] = useState(''); const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false);
  const { ref } = Route.useSearch();
  const navigate = useNavigate();
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
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth`, data: { full_name: fullName.trim().slice(0, 80), username: uname } } });
      if (error) throw error;
      setNotice('Check your email to confirm your account, then sign in.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not create your account.'); } finally { setBusy(false); }
  };
  return <BixShell><main className="register-page mx-auto grid min-h-[78vh] max-w-5xl items-center gap-10 px-5 py-12 md:grid-cols-[.8fr_1.2fr] md:px-8"><section><div className="eyebrow">NEW MEMBER</div><h1 className="section-title">CREATE YOUR <span>ACCOUNT</span></h1><p className="mt-4 max-w-sm text-sm leading-7 text-muted-foreground">Your referral code is optional. Paste it here if another BIXLINK member invited you.</p><div className="mt-6 flex items-center gap-2 text-xs text-chart-2"><BadgeCheck size={16}/> Referral is attached after your first confirmed sign-in.</div></section><form onSubmit={submit} className="register-panel space-y-4"><label className="block text-xs font-bold text-muted-foreground">FULL NAME<input required minLength={2} maxLength={80} autoComplete="name" value={fullName} onChange={event => setFullName(event.target.value)} className="form-input mt-2" placeholder="Your full name"/></label><label className="block text-xs font-bold text-muted-foreground">USERNAME<input required pattern="[A-Za-z0-9_.]{3,24}" maxLength={24} autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} className="form-input mt-2 lowercase" placeholder="e.g. foxtrader"/></label><label className="block text-xs font-bold text-muted-foreground">EMAIL<input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="form-input mt-2" placeholder="you@example.com"/></label><label className="block text-xs font-bold text-muted-foreground">PASSWORD<input required minLength={6} type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} className="form-input mt-2" placeholder="••••••••"/></label><label className="block text-xs font-bold text-muted-foreground">REFERRAL CODE <span className="font-normal text-muted-foreground/70">(OPTIONAL)</span><input inputMode="text" maxLength={10} value={referral} onChange={event => setReferral(event.target.value.toUpperCase())} className="form-input numeric mt-2 uppercase" placeholder="BIX-123456"/></label>{notice && <p role="status" className="text-sm text-chart-2">{notice}</p>}<Button disabled={busy} className="h-12 w-full rounded-full bg-chart-3 font-bold text-background hover:bg-chart-3/90">{busy ? 'Please wait…' : 'Create account'} <ArrowRight/></Button><Button type="button" variant="link" className="w-full text-muted-foreground" onClick={() => navigate({ to: '/auth' })}>Already a member? Sign in</Button><Link to="/auth" className="block text-center text-xs text-muted-foreground">← Back to BIXLINK</Link></form></main></BixShell>;
}