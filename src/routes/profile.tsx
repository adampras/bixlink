import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { BixShell } from '@/components/BixShell';
import { MemberGate } from '@/components/MemberGate';
import { Button } from '@/components/ui/button';
import { useMember } from '@/lib/useMember';
import { createReferral, assignReferral } from '@/lib/bixlink.functions';
import { supabase } from '@/integrations/supabase/client';
import { Copy, KeyRound, LogOut, Shield } from 'lucide-react';
import { LeaderCard } from '@/components/LeaderCard';
import fox from '@/assets/bixlink-fox.png';

export const Route = createFileRoute('/profile')({ head: () => ({ meta: [{ title: 'Profile — BIXLINK' }, { name: 'description', content: 'Your BIXLINK account, referral code and network.' }, { property: 'og:title', content: 'Profile — BIXLINK' }, { property: 'og:description', content: 'Manage your BIXLINK member profile.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }), component: ProfilePage });

function ProfilePage() {
  const { user, ready, data } = useMember();
  const [notice, setNotice] = useState(''); const [code, setCode] = useState('');
  const makeCode = useServerFn(createReferral); const link = useServerFn(assignReferral);
  const qc = useQueryClient(); const navigate = useNavigate();
  const referralUrl = data?.referral?.code && typeof window !== 'undefined' ? `${window.location.origin}/auth?ref=${data.referral.code}` : '';
  const signOut = async () => { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); navigate({ to: '/auth', replace: true }); };
  return <BixShell><main className="mx-auto max-w-3xl px-5 py-10 md:px-8">
    <MemberGate ready={ready} signedIn={!!user} title="PROFILE">
      <div className="flex items-center gap-4"><img src={fox} alt="" className="h-16 w-16 rounded-full border border-chart-3 bg-card object-cover object-top"/><div><div className="eyebrow">MEMBER</div><h1 className="font-display text-2xl font-black">{user?.email}</h1><p className="text-xs text-muted-foreground">Joined {user && new Date(user.created_at).toLocaleDateString()}</p></div></div>
      <section className="mt-8 rounded-[20px] border border-border bg-card p-6"><h2 className="font-bold">Referral code</h2>
        <div className="mt-3 flex flex-wrap gap-3">{data?.referral?.code ? <><span className="rounded-full border border-border px-5 py-2 font-mono text-chart-3">{data.referral.code}</span><Button className="rounded-full" onClick={async () => { await navigator.clipboard.writeText(referralUrl); setNotice('Referral link copied.'); }}><Copy/> Copy link</Button></> : <Button className="rounded-full bg-chart-3 text-background" onClick={async () => { try { await makeCode(); await qc.invalidateQueries({ queryKey: ['my-bixlink'] }); } catch { setNotice('Could not create code.'); } }}>Generate code</Button>}</div>
        {referralUrl && <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-background p-3"><input readOnly aria-label="Full referral URL" className="min-w-0 flex-1 bg-transparent font-mono text-xs text-muted-foreground outline-none" value={referralUrl}/><Button size="icon" variant="ghost" title="Copy referral URL" onClick={async()=>{await navigator.clipboard.writeText(referralUrl);setNotice('Referral link copied.');}}><Copy/></Button></div>}
        {data && !data.referral?.referred_by && <form className="mt-4 flex gap-2" onSubmit={async e => { e.preventDefault(); try { const r = await link({ data: { code: code.trim().toUpperCase() } }); setNotice(r.linked ? 'Referrer linked.' : 'Code unavailable.'); await qc.invalidateQueries({ queryKey: ['my-bixlink'] }); } catch { setNotice('Invalid code.'); } }}><input className="form-input max-w-44" placeholder="BIX-123456" value={code} onChange={e => setCode(e.target.value)}/><Button type="submit" className="rounded-full">Apply referrer</Button></form>}
        <Link to="/network" className="mt-4 block text-xs text-chart-2">View my network →</Link>
      </section>
      <LeaderCard/>
      <section className="mt-6 grid gap-3">
        <Button variant="outline" className="justify-start rounded-full" onClick={async () => { if (!user?.email) return; const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/reset-password` }); setNotice(error ? error.message : 'Password reset email sent.'); }}><KeyRound/> Change password</Button>
        {data?.isAdmin && <Button asChild variant="outline" className="justify-start rounded-full"><Link to="/admin"><Shield/> Admin panel (owner only)</Link></Button>}
        <Button variant="outline" className="justify-start rounded-full text-destructive" onClick={signOut}><LogOut/> Sign out</Button>
      </section>
      {notice && <p role="status" className="mt-5 text-chart-2">{notice}</p>}
    </MemberGate>
  </main></BixShell>;
}
