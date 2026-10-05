import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { BixShell } from '@/components/BixShell';
import { LandingExperience } from '@/components/LandingExperience';
import { Button } from '@/components/ui/button';
import { usePublicConfig } from '@/lib/useMember';
import { ArrowRight } from 'lucide-react';

export const Route = createFileRoute('/auth')({ head: () => ({ meta: [{ title: 'Discover & Join BIXLINK' }, { name: 'description', content: 'Explore BIXLINK staking, rewards and roadmap before creating your member account.' }, { property: 'og:title', content: 'Discover & Join BIXLINK' }, { property: 'og:description', content: 'Explore the BIXLINK ecosystem and access member registration.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }), component: Auth });

function Auth() {
  const [mode, setMode] = useState<'signin'|'signup'|'forgot'>('signin');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false);
  const navigate = useNavigate(); const { data: config } = usePublicConfig();
  useEffect(() => { const incoming = new URLSearchParams(window.location.search).get('ref'); if (incoming && /^BIX-\d{6}$/i.test(incoming)) window.localStorage.setItem('bixlink-ref', incoming.toUpperCase()); }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setNotice('');
    try {
      if (mode === 'forgot') { const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` }); if (error) throw error; setNotice('Check your inbox for a password reset link.'); }
      else if (mode === 'signup') { const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth` } }); if (error) throw error; setNotice('Check your email to confirm your account, then sign in.'); }
      else { const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; navigate({ to: '/' }); }
    } catch (err) { setNotice(err instanceof Error ? err.message : 'Something went wrong.'); } finally { setBusy(false); }
  }
  return <BixShell><LandingExperience {...(config ? { packages: config.packages, booster: config.booster.enabled, bixPrice: config.bixMarket.priceUsd } : {})} compact/><main id="member-access" className="mx-auto flex min-h-[75vh] max-w-md flex-col justify-center px-5 py-16"><div className="eyebrow">MEMBER ACCESS</div><h2 className="section-title">{mode === 'signup' ? 'CREATE ACCOUNT' : mode === 'forgot' ? 'RESET PASSWORD' : 'WELCOME BACK'}</h2><p className="mt-2 text-sm text-muted-foreground">Your gateway to the BIXLINK ecosystem.</p><form onSubmit={submit} className="mt-8 space-y-4"><label className="block text-xs font-bold text-muted-foreground">EMAIL<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="form-input mt-2" placeholder="you@example.com"/></label>{mode !== 'forgot' && <label className="block text-xs font-bold text-muted-foreground">PASSWORD<input required minLength={6} type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} className="form-input mt-2" placeholder="••••••••"/></label>}{notice && <p role="status" className="text-sm text-chart-2">{notice}</p>}<Button disabled={busy} className="h-12 w-full rounded-full bg-chart-3 font-bold text-background hover:bg-chart-3/90">{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Sign in'} <ArrowRight/></Button></form>{mode !== 'forgot' && <><div className="my-5 text-center text-xs text-muted-foreground">OR CONTINUE WITH</div><Button variant="outline" className="h-12 w-full rounded-full border-border bg-card" onClick={async () => { const result = await lovable.auth.signInWithOAuth('google', { redirect_uri: `${window.location.origin}/auth` }); if (result.error) setNotice(result.error.message); else if (!result.redirected) navigate({ to: '/' }); }}>Google</Button></>}<div className="mt-6 flex justify-between text-sm"><Button variant="link" className="px-0 text-chart-2" onClick={() => { setNotice(''); setMode(mode === 'signup' ? 'signin' : 'signup'); }}>{mode === 'signup' ? 'Already a member? Sign in' : 'Create an account'}</Button><Button variant="link" className="px-0 text-muted-foreground" onClick={() => { setNotice(''); setMode(mode === 'forgot' ? 'signin' : 'forgot'); }}>{mode === 'forgot' ? 'Back to sign in' : 'Forgot password?'}</Button></div><Link to="/" className="mt-8 text-center text-xs text-muted-foreground">← Open market HOME</Link></main></BixShell>;
}