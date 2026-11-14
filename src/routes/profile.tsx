import { LandingStyleSwitch } from '@/components/LandingStyleSwitch';
import { NetworkTracker } from '@/components/NetworkTracker';
import { copyText } from '@/lib/copy-text';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getArenaStatus } from '@/lib/arena.functions';
import { BixShell } from '@/components/BixShell';
import { MemberGate } from '@/components/MemberGate';
import { Button } from '@/components/ui/button';
import { useMember, useReviewerAccess } from '@/lib/useMember';
import { createReferral, assignReferral } from '@/lib/bixlink.functions';
import { supabase } from '@/integrations/supabase/client';
import { ConditionalLeaderInfo } from '@/components/ConditionalLeaderInfo';
import { ArrowRight, BadgeCheck, Check, Crown, Swords, ChevronRight, Copy, Gem, KeyRound, LogOut, Settings, Shield, ShoppingBag, TrendingUp } from 'lucide-react';
import headerLogo from "@/assets/bixlink-logo-gold.webp";
const headerMark = { url: headerLogo };
import { useI18n } from '@/lib/i18n';
import { usePresaleStatus } from '@/components/PresaleEntry';
import { GenesisCertificate } from '@/components/PresaleStrategies';
import { SovereignPlaque } from '@/components/SovereignAllocation';
import { number } from '@/lib/bixlink';
import { hasVerifiedEmail, isWalletOnlyAccount } from '@/lib/wallet-login';
import { WalletAccountDetails } from '@/components/WalletAccountDetails';
import { InstallAppButton } from '@/components/InstallPrompt';
import { SovereignWalletSwitch } from '@/components/SovereignWalletSwitch';
import { ProfilePhotoHeader } from '@/components/ProfilePhotoEditor';

export const Route = createFileRoute('/profile')({ head: () => ({ meta: [{ title: 'Profile — BIXLINK' }, { name: 'description', content: 'Your BIXLINK account, referral code and network.' }, { property: 'og:title', content: 'Profile — BIXLINK' }, { property: 'og:description', content: 'Manage your BIXLINK member profile.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }), component: ProfilePage });

function ProfilePage() {
  const { user, ready, data } = useMember();
  const walletOnly = isWalletOnlyAccount(user);
  const accountLabel = walletOnly ? user?.app_metadata?.['wallet_address'] : user?.email;
  const reviewer = useReviewerAccess(user?.id);
  const [openProof, setOpenProof] = useState<string | null>(null);
  const [notice, setNotice] = useState(''); const [code, setCode] = useState('');
  const makeCode = useServerFn(createReferral); const link = useServerFn(assignReferral);
  const qc = useQueryClient(); const navigate = useNavigate();
  const { formatDate } = useI18n();
  const presale = usePresaleStatus(user?.id);
  const orders = presale.data?.orders ?? [];
  const loadArena = useServerFn(getArenaStatus);
  const arena = useQuery({ queryKey: ['arena', user?.id], queryFn: () => loadArena(), enabled: Boolean(user) });
  const bixp = arena.data?.status;
  const badges = [
    hasVerifiedEmail(user) && { Icon: BadgeCheck, label: 'Verified email', cls: 'border-chart-2/40 bg-chart-2/10 text-chart-2' },
    walletOnly && { Icon: Shield, label: 'Verified wallet', cls: 'border-chart-3/40 bg-chart-3/10 text-chart-3' },
    (data?.stakes ?? []).some(s => s.status === 'active') && { Icon: TrendingUp, label: 'Active staker', cls: 'border-primary/40 bg-primary/10 text-primary' },
    orders.length > 0 && { Icon: Gem, label: 'Genesis Founder', cls: 'border-chart-3/40 bg-chart-3/10 text-chart-3' },
    orders.some(o => Number(o.package_usd) >= 100000) && { Icon: Crown, label: 'Sovereign Founder', cls: 'border-chart-3/60 bg-chart-3/15 text-chart-3' },
  ].filter(Boolean) as { Icon: typeof BadgeCheck; label: string; cls: string }[];
  const referralUrl = data?.referral?.code ? `https://bixlink.com/register?ref=${data.referral.code}` : '';
  const signOut = async () => { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); navigate({ to: '/auth', replace: true }); };
  const [copied, setCopied] = useState<'' | 'link' | 'code' | 'promo'>('');
  const flash = (k: 'link' | 'code' | 'promo', ok: boolean) => { if (ok) { setCopied(k); try { navigator.vibrate?.(12); } catch { /* optional */ } setTimeout(() => setCopied(''), 2200); } else setCopied(''); setNotice(ok ? '' : 'Salin diblokir browser ini — tekan lama link lalu pilih Salin.'); };
  const copyReferral = async () => { if (!referralUrl) return; flash('link', await copyText(referralUrl)); };
  const promoText = referralUrl ? `💎 *BIXCOIN PRESALE PHASE 1* 💎\n\nGet BIX at *$0.25* — packages $100–$1,000, released 1% daily over 100 days.\n\n🚗 BIXGO · 📞 BIX CALL · 🏥 BIXCARE · 🛍 BIXMALL — one ecosystem, one app.\n\n👉 Join with my link:\n${referralUrl}\n\n_Projections are not guaranteed. Do your own research._` : '';
  const copyPromo = async () => { if (!promoText) return; flash('promo', await copyText(promoText)); };
  const copyCode = async () => { if (!data?.referral?.code) return; flash('code', await copyText(data.referral.code)); };
  const autoMade = useRef(false);
  useEffect(() => { if (data && !data.referral?.code && !autoMade.current) { autoMade.current = true; void makeCode().then(() => qc.invalidateQueries({ queryKey: ['my-bixlink'] })).catch(() => {}); } }, [data, makeCode, qc]);
  return <BixShell><main className="profile-page mx-auto max-w-3xl px-5 py-8 md:px-8 md:py-10">
    <MemberGate ready={ready} signedIn={!!user} title="PROFILE">
      <ProfilePhotoHeader fallback={headerMark.url}><div className="eyebrow">{walletOnly ? 'WALLET MEMBER' : 'MEMBER ACCOUNT'}</div><h1 className="break-all">{accountLabel}</h1><p>Active since {user && formatDate(user.created_at)}</p>{badges.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{badges.map(({ Icon, label, cls }) => <span key={label} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${cls}`}><Icon size={11}/>{label}</span>)}</div>}</ProfilePhotoHeader>
      {walletOnly && <WalletAccountDetails/>}
      <section className="profile-referral">
        <div className="profile-section-head"><h2>Referral code</h2>{data?.referral?.code && <span><Check size={11}/> Active</span>}</div>
        {data?.referral?.code ? <><div className="profile-code-row"><div className="profile-code"><b>{data.referral.code}</b><Button size="icon" variant="ghost" title="Copy referral code" onClick={copyCode}>{copied === 'code' ? <Check className="text-chart-2"/> : <Copy/>}</Button></div></div>{referralUrl && <div className="mt-2 grid grid-cols-2 gap-2"><Button asChild size="sm" variant="outline" className="rounded-full"><a href={`https://wa.me/?text=${encodeURIComponent(`Join me on BIXLINK: ${referralUrl}`)}`} target="_blank" rel="noopener noreferrer">Share WhatsApp</a></Button><Button asChild size="sm" variant="outline" className="rounded-full"><a href={`https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent('Join me on BIXLINK')}`} target="_blank" rel="noopener noreferrer">Share Telegram</a></Button></div>}</> : <Button className="profile-generate" onClick={async () => { try { await makeCode(); await qc.invalidateQueries({ queryKey: ['my-bixlink'] }); } catch { setNotice('Could not create code.'); } }}>Generate referral code</Button>}
        {referralUrl && <div className="profile-personal-link"><span>Personal link</span><div><input readOnly aria-label="Full referral URL" value={referralUrl} onClick={e => { e.currentTarget.select(); void copyReferral(); }}/><Button size="icon" variant="ghost" title="Copy personal link" onClick={copyReferral}>{copied === 'link' ? <Check className="text-chart-2"/> : <Copy/>}</Button></div><Button type="button" className="mt-2 w-full rounded-full" onClick={copyReferral}>{copied === 'link' ? <><Check/> Link undangan tersalin!</> : <><Copy/> Copy invite link</>}</Button><Button type="button" variant="outline" className="mt-2 w-full rounded-full" onClick={copyPromo}>{copied === 'promo' ? <><Check/> Pesan promosi tersalin!</> : <><Copy/> Salin Pesan Promosi WhatsApp</>}</Button>{notice && <p role="status" className="mt-2 text-xs text-destructive">{notice}</p>}</div>}
        {data && !data.referral?.referred_by && <form className="profile-apply" onSubmit={async e => { e.preventDefault(); try { const r = await link({ data: { code: code.trim().toUpperCase() } }); setNotice(r.linked ? 'Referrer linked.' : 'Code unavailable.'); await qc.invalidateQueries({ queryKey: ['my-bixlink'] }); } catch { setNotice('Invalid code.'); } }}><input className="form-input" placeholder="Apply referrer code" aria-label="Apply referrer code" value={code} onChange={e => setCode(e.target.value)}/><Button type="submit" variant="outline">Apply</Button></form>}
        <Link to="/network" className="profile-network-link">View my network <ArrowRight/></Link>
      </section>
      <ConditionalLeaderInfo/>
      <section id="bixp" className="mt-6 scroll-mt-20 rounded-2xl border border-chart-3/40 bg-card p-5"><div className="flex items-center justify-between gap-3"><div><div className="eyebrow">BIXP · ECOSYSTEM POINTS</div><b className="numeric mt-1 block font-display text-2xl text-chart-3">{bixp ? Number(bixp.totalVbix).toFixed(2) : '—'} <small className="text-sm text-muted-foreground">BIXP</small></b></div><Button asChild size="sm"><Link to="/arena">Earn BIXP</Link></Button></div><div className="arena-cap mt-3"><i style={{ width: `${bixp ? (bixp.cap > 0 ? Math.min(100, Number(bixp.questVbix) / bixp.cap * 100) : 100) : 0}%` }}/></div><p className="mt-2 text-[11px] text-muted-foreground">Free promotional points. Not on-chain BIX; conversion only if the owner opens it.</p></section>
      {orders.length > 0 && !data?.isAdmin && (() => { const pick = orders.find(o => o.id === openProof) ?? orders[0]!; const total = orders.reduce((s, o) => s + Number(o.package_usd), 0); return <section className="mt-6 rounded-2xl border border-chart-3/40 bg-card p-4">
        <div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="eyebrow">GENESIS VAULT</div><p className="mt-1 text-xs text-muted-foreground">{orders.length} certificates · <span className="numeric">${number(total)}</span></p></div><Gem size={18} className="shrink-0 text-chart-3"/></div>
        <div className="mx-auto mt-3 max-w-[260px]">{Number(pick.package_usd) >= 100000 ? <SovereignPlaque serial={pick.serial ?? 1} strategy={pick.strategy ?? 'standard'} bix={Number(pick.bix_amount)} holder={user?.email ?? 'Member'}/> : <GenesisCertificate usd={Number(pick.package_usd)} serial={pick.serial} strategy={pick.strategy} bix={Number(pick.bix_amount)}/>}</div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{orders.map(o => <button key={o.id} type="button" onClick={() => setOpenProof(o.id)} className={`numeric shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold ${o.id === pick.id ? 'border-chart-3 bg-chart-3/10 text-chart-3' : 'border-border text-muted-foreground'}`}>#GEN-{String(o.serial ?? 0).padStart(4, '0')} · ${number(Number(o.package_usd))}</button>)}</div>
      </section>; })()}
      <div className="eyebrow mt-8">ECOSYSTEM</div><section className="profile-actions"><Button asChild variant="outline"><Link to="/p2p"><span className="profile-action-icon"><TrendingUp/></span><span>P2P Market <small>Buy · sell BIX between members</small></span><ChevronRight className="profile-action-arrow"/></Link></Button><Button asChild variant="outline"><Link to="/marketing"><span className="profile-action-icon"><TrendingUp/></span><span>Marketing materials <small>PDF · Video</small></span><ChevronRight className="profile-action-arrow"/></Link></Button>
        <Button asChild variant="outline"><Link to="/nft-marketplace"><span className="profile-action-icon"><ShoppingBag/></span><span>BIXLINK Marketplace</span><ChevronRight className="profile-action-arrow"/></Link></Button>
        {reviewer.data && <Button asChild variant="outline"><Link to="/review"><span className="profile-action-icon profile-action-icon--admin"><Shield/></span><span>ADMIN PANEL BIX <small>Deposit &amp; withdrawal review only</small></span><ChevronRight className="profile-action-arrow"/></Link></Button>}
        <Button asChild variant="outline"><Link to="/arena"><span className="profile-action-icon"><Swords/></span><span>Fox Arena <small>Daily missions and leaderboard</small></span><ChevronRight className="profile-action-arrow"/></Link></Button>
      </section>      {data?.isAdmin && <><div className="eyebrow mt-6">OWNER CONTROL</div><section className="profile-actions">
        {<Button asChild variant="outline"><Link to="/admin"><span className="profile-action-icon profile-action-icon--admin"><Shield/></span><span>Admin panel <small>Owner only</small></span><ChevronRight className="profile-action-arrow"/></Link></Button>}
        {<LandingStyleSwitch/>}
        {<NetworkTracker/>}
        {<SovereignWalletSwitch/>}
        {<Button asChild variant="outline"><Link to="/leader-control"><span className="profile-action-icon profile-action-icon--admin"><Crown/></span><span>Leader &amp; Loan control <small>3× personal · 5× team · HUB menu</small></span><ChevronRight className="profile-action-arrow"/></Link></Button>}
        {<Button asChild variant="outline"><Link to="/bixtrade"><span className="profile-action-icon profile-action-icon--admin"><Shield/></span><span>BIXTrade operator <small>Deposit, withdraw &amp; plan (hidden from public)</small></span><ChevronRight className="profile-action-arrow"/></Link></Button>}
        {<Button asChild variant="outline"><Link to="/owner-desk"><span className="profile-action-icon profile-action-icon--admin"><Shield/></span><span>Owner Desk <small>WD & omset real</small></span><ChevronRight className="profile-action-arrow"/></Link></Button>}
      </section></>}<div className="eyebrow mt-6">SECURITY &amp; ACCOUNT</div><section className="profile-actions">
        <Button asChild variant="outline"><Link to="/settings"><span className="profile-action-icon"><Settings/></span><span>Settings <small>Language, notifications and security</small></span><ChevronRight className="profile-action-arrow"/></Link></Button>
        {!walletOnly && <Button variant="outline" onClick={async () => { if (!user?.email) return; const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/reset-password` }); setNotice(error ? error.message : 'Password reset email sent.'); }}><span className="profile-action-icon"><KeyRound/></span><span>Change password</span><ChevronRight className="profile-action-arrow"/></Button>}
        {!data?.isAdmin && <InstallAppButton/>}
        <Button variant="outline" className="profile-signout" onClick={signOut}><span className="profile-action-icon"><LogOut/></span><span>Sign out</span></Button>
      </section>
      {notice && <p role="status" className="mt-5 text-chart-2">{notice}</p>}
    </MemberGate>
  </main></BixShell>;
}
