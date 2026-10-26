import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { getWalletProfile, saveWalletProfile } from '@/lib/wallet-login.functions';

export function WalletAccountDetails() {
  const save = useServerFn(saveWalletProfile);
  const load = useServerFn(getWalletProfile);
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => { void load().then(profile => {
    setName(profile.full_name === profile.username ? '' : profile.full_name);
    setWhatsapp(profile.whatsapp ?? '');
  }).catch(() => setNotice('Could not load your profile.')); }, []);
  return <section className="mt-5 border-b border-border pb-5"><h2 className="font-bold">Wallet account</h2><p className="mt-2 text-xs text-muted-foreground">Keep this wallet secure. Email recovery is unavailable until you add and verify a real email. Email-required rewards remain locked.</p><form className="mt-4 grid gap-3" onSubmit={async e => {
    e.preventDefault(); setBusy(true); setNotice('');
    try {
      await save({ data: { fullName: name.trim(), whatsapp: whatsapp.trim() } });
      const profile = await load();
      setName(profile.full_name === profile.username ? '' : profile.full_name);
      setWhatsapp(profile.whatsapp ?? '');
      if (email.trim()) {
        const { error } = await supabase.auth.updateUser({ email: email.trim() }, { emailRedirectTo: `${window.location.origin}/auth` });
        if (error) throw error;
        setNotice('Profile saved. Check your real email to confirm the change.');
      } else setNotice('Profile saved.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not save profile.'); }
    finally { setBusy(false); }
  }}><label className="text-xs text-muted-foreground">Full name · optional<input className="form-input mt-1" maxLength={80} autoComplete="name" value={name} onChange={e => setName(e.target.value)}/></label><label className="text-xs text-muted-foreground">WhatsApp · optional<input className="form-input mt-1" type="tel" placeholder="+628123456789" value={whatsapp} onChange={e => setWhatsapp(e.target.value)}/></label><label className="text-xs text-muted-foreground">Recovery email · optional<input className="form-input mt-1" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}/></label><Button disabled={busy} type="submit" variant="outline">{busy ? 'Saving…' : 'Save details'}</Button>{notice && <p role="status" className="text-xs text-chart-2">{notice}</p>}</form></section>;
}