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
import { ArrowRight, Check, ChevronRight, Copy, KeyRound, LogOut, Shield } from 'lucide-react';
import { LeaderCard } from '@/components/LeaderCard';
import headerMark from '@/assets/bixlink-header-mark.png.asset.json';

export const Route = createFileRoute('/profile')({ head: () => ({ meta: [{ title: 'Profile — BIXLINK' }, { name: 'description', content: 'Your BIXLINK account, referral code and network.' }, { property: 'og:title', content: 'Profile — BIXLINK' }, { property: 'og:description', content: 'Manage your BIXLINK member profile.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }), component: ProfilePage });

function ProfilePage() {
  const { user, ready, data } = useMember();
  const [notice, setNotice] = useState(''); const [code, setCode] = useState('');
  const makeCode = useServerFn(createReferral); const link = useServerFn(assignReferral);
  const qc = useQueryClient(); const navigate = useNavigate();
  const referralUrl = data?.referral?.code && typeof window !== 'undefined' ? `${window.location.origin}/register?ref=${data.referral.code}` : '';
  const signOut = async () => { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); navigate({ to: '/auth', replace: true }); };
  const copyReferral = async () => { if (!referralUrl) return; await navigator.clipboard.writeText(referralUrl); setNotice('Referral link copied.'); };
  return <BixShell><main className="profile-page mx-auto max-w-3xl px-5 py-8 md:px-8 md:py-10">
    <MemberGate ready={ready} signedIn={!!user} title="PROFILE">
      <header className="profile-identity"><div className="profile-avatar"><img src={headerMark.url} alt="BIXLINK member emblem"/></div><div className="min-w-0"><div className="eyebrow">VERIFIED MEMBER</div><h1>{user?.email}</h1><p>Active since {user && new Date(user.created_at).toLocaleDateString()}</p></div></header>
      <section className="profile-referral">
        <div className="profile-section-head"><h2>Referral code</h2>{data?.referral?.code && <span><Check size={11}/> Active</span>}</div>
        {data?.referral?.code ? <div className="profile-code-row"><div className="profile-code"><b>{data.referral.code}</b><Button size="icon" variant="ghost" title="Copy referral link" onClick={copyReferral}><Copy/></Button></div><Button onClick={copyReferral}>Copy link</Button></div> : <Button className="profile-generate" onClick={async () => { try { await makeCode(); await qc.invalidateQueries({ queryKey: ['my-bixlink'] }); } catch { setNotice('Could not create code.'); } }}>Generate referral code</Button>}
        {referralUrl && <div className="profile-personal-link"><span>Personal link</span><div><input readOnly aria-label="Full referral URL" value={referralUrl}/><Button size="icon" variant="ghost" title="Copy personal link" onClick={copyReferral}><Copy/></Button></div></div>}
        {data && !data.referral?.referred_by && <form className="profile-apply" onSubmit={async e => { e.preventDefault(); try { const r = await link({ data: { code: code.trim().toUpperCase() } }); setNotice(r.linked ? 'Referrer linked.' : 'Code unavailable.'); await qc.invalidateQueries({ queryKey: ['my-bixlink'] }); } catch { setNotice('Invalid code.'); } }}><input className="form-input" placeholder="Apply referrer code" aria-label="Apply referrer code" value={code} onChange={e => setCode(e.target.value)}/><Button type="submit" variant="outline">Apply</Button></form>}
        <Link to="/network" className="profile-network-link">View my network <ArrowRight/></Link>
      </section>
      <LeaderCard/>
      <section className="profile-actions">
        <Button variant="outline" onClick={async () => { if (!user?.email) return; const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/reset-password` }); setNotice(error ? error.message : 'Password reset email sent.'); }}><span className="profile-action-icon"><KeyRound/></span><span>Change password</span><ChevronRight className="profile-action-arrow"/></Button>
        {data?.isAdmin && <Button asChild variant="outline"><Link to="/admin"><span className="profile-action-icon profile-action-icon--admin"><Shield/></span><span>Admin panel <small>Owner only</small></span><ChevronRight className="profile-action-arrow"/></Link></Button>}
        <Button variant="outline" className="profile-signout" onClick={signOut}><span className="profile-action-icon"><LogOut/></span><span>Sign out</span></Button>
      </section>
      {notice && <p role="status" className="mt-5 text-chart-2">{notice}</p>}
    </MemberGate>
  </main></BixShell>;
}
