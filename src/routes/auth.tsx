import { signInWithIdentifier } from '@/lib/login.functions';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BixShell } from '@/components/BixShell';
import { Button } from '@/components/ui/button';
import { VaultStardust } from '@/components/VaultFlourish';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { WalletSignIn } from '@/components/WalletSignIn';

export const Route = createFileRoute('/auth')({ head: () => ({ meta: [{ title: 'Member Access — BIXLINK' }, { name: 'description', content: 'Sign in to your BIXLINK member account or request a password reset.' }, { property: 'og:title', content: 'Member Access — BIXLINK' }, { property: 'og:description', content: 'Access your BIXLINK account and member services.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] }), component: Auth });

function Auth() {
  const [mode, setMode] = useState<'signin'|'forgot'>('signin');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false); const [show, setShow] = useState(false);
  useEffect(() => { const saved = window.localStorage.getItem('bixlink-login-identifier'); const verified = new URLSearchParams(window.location.search).get('verified') === '1'; if (saved) setEmail(saved); if (verified) setNotice('Email verified. Your account is active — enter your password to sign in.'); else if (saved) setNotice('Enter your password to sign in. New accounts must confirm their email first.'); }, []);
  const navigate = useNavigate();
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setNotice('');
    try {
      if (mode === 'forgot') { const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` }); if (error) throw error; setNotice('Check your inbox for a password reset link.'); }
      else { const r = await signInWithIdentifier({ data: { identifier: email, password } }); if (!r.ok) throw new Error(r.error); const { error } = await supabase.auth.setSession({ access_token: r.access_token, refresh_token: r.refresh_token }); if (error) throw error; const t = window.localStorage.getItem('bixlink-target'); window.localStorage.removeItem('bixlink-target'); navigate({ to: t === 'presale' ? '/presale' : '/' }); }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      if (/not confirmed/i.test(msg)) {
        if (!email.includes('@')) { setNotice('Email not verified yet. Open the activation email we sent you, or sign in with your email address to receive a new link.'); return; }
        const { error: rErr } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${window.location.origin}/auth?verified=1` } });
        setNotice(rErr ? `Email not verified yet. ${rErr.message}` : 'Email not verified yet. We sent a NEW activation link — open only the newest email, then sign in.');
      } else setNotice(msg);
    } finally { setBusy(false); }
  }
  return <BixShell><main id="member-access" className="auth-vault-page mx-auto flex auth-center auth-fit max-w-md flex-col justify-center px-4 py-3"><VaultStardust/><div className="auth-vault"><Link to="/" className="auth-back" aria-label="Back to HOME">← HOME</Link><div className="auth-mini-hero"><img src="https://bixlink.com/__l5e/assets-v1/c62ecff6-c5d1-4235-8e7a-e49c0c2b7039/fox-icon-512.png" alt=""/><div><b>BIX<span>LINK</span></b><small>{mode === 'forgot' ? 'RESET PASSWORD' : 'WELCOME BACK'}</small></div></div><nav className="auth-tabs mt-4" aria-label="Account"><Link to="/auth" data-active="true">SIGN IN</Link><Link to="/register">REGISTER</Link></nav><form onSubmit={submit} className="mt-4 space-y-2.5"><label className="block text-xs font-bold text-muted-foreground">{mode === 'forgot' ? 'EMAIL' : 'EMAIL / MEMBER CODE / USERNAME'}<input required type={mode === 'forgot' ? 'email' : 'text'} autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} className="form-input mt-2" placeholder={mode === 'forgot' ? 'you@example.com' : 'Email, BIX-123456 or username'}/></label>{mode !== 'forgot' && <label className="block text-xs font-bold text-muted-foreground">PASSWORD<div className="relative mt-2"><input required minLength={6} type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="form-input pr-12" placeholder="••••••••"/><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow(v => !v)}>{show ? <EyeOff/> : <Eye/>}</Button></div></label>}{notice && <p role="status" className="text-sm text-chart-2">{notice}</p>}<Button disabled={busy} className="h-12 w-full rounded-full bg-primary text-sm font-black tracking-widest text-primary-foreground hover:bg-primary/90">{busy ? 'Please wait…' : mode === 'forgot' ? 'Send reset link' : 'Sign in'} <ArrowRight/></Button></form>{mode !== 'forgot' && <div className="auth-mini-alt"><WalletSignIn/></div>}<div className="mt-3 flex justify-between text-xs"><Link to="/register" className="auth-toska-link">Create an account →</Link><Button variant="link" className="px-0 text-muted-foreground" onClick={() => { setNotice(''); setMode(mode === 'forgot' ? 'signin' : 'forgot'); }}>{mode === 'forgot' ? 'Back to sign in' : 'Forgot password?'}</Button></div></div></main></BixShell>;
}