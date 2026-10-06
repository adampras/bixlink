import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Bell, Check, ChevronRight, KeyRound, Languages, Settings2, ShieldCheck, UserRound } from 'lucide-react';
import { BixShell } from '@/components/BixShell';
import { MemberGate } from '@/components/MemberGate';
import { Button } from '@/components/ui/button';
import { LANGUAGES, type Language, useI18n } from '@/lib/i18n';
import { useMember } from '@/lib/useMember';
import { KycCard } from '@/components/KycCard';

export const Route = createFileRoute('/settings')({
  head: () => ({ meta: [{ title: 'Settings — BIXLINK' }, { name: 'description', content: 'Manage BIXLINK language and update notification preferences.' }, { property: 'og:title', content: 'Settings — BIXLINK' }, { property: 'og:description', content: 'Choose your BIXLINK language and notification preferences.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, ready } = useMember();
  const { language, setLanguage, t } = useI18n();
  const [notifications, setNotifications] = useState(true);
  useEffect(() => { setNotifications(window.localStorage.getItem('bixlink-notifications') !== 'off'); }, []);
  const toggleNotifications = () => setNotifications(current => {
    const next = !current;
    window.localStorage.setItem('bixlink-notifications', next ? 'on' : 'off');
    window.dispatchEvent(new Event('bixlink-preferences'));
    return next;
  });
  return <BixShell><main data-no-translate className="settings-page mx-auto min-h-[75vh] max-w-5xl px-5 py-8 md:px-8 md:py-10"><MemberGate ready={ready} signedIn={!!user} title={t('settings').toUpperCase()}>
    <div className="eyebrow"><Settings2 size={14}/>{t('preferences')}</div><h1 className="section-title">{t('settings').toUpperCase()}</h1>
    <div className="settings-console mt-7">
      <aside className="settings-rail" aria-label="Settings categories">
        <div className="settings-member"><span><UserRound/></span><div><b>{user?.email?.split('@')[0]}</b><small>Verified member</small></div></div>
        <nav><a href="#account"><ShieldCheck/>Account</a><a href="#language" className="active"><Languages/>{t('language')}</a><a href="#notifications"><Bell/>{t('notifications')}</a></nav>
      </aside>
      <div className="settings-content">
        <section id="account" className="settings-section"><div className="settings-heading"><span className="is-secure"><ShieldCheck/></span><div><h2>Account &amp; security</h2><p>Your verified account and password controls.</p></div></div><Button asChild variant="ghost" className="settings-account-row"><Link to="/reset-password"><span><KeyRound/>Change password</span><ChevronRight/></Link></Button><div className="mt-3"><KycCard userId={user?.id}/></div></section>
        <section id="language" className="settings-section"><div className="settings-heading"><span><Languages/></span><div><h2>{t('language')}</h2><p>{t('savedHere')}</p></div></div><div className="settings-language-grid">{LANGUAGES.map(item => <Button key={item.code} variant="ghost" className={`settings-language${language === item.code ? ' is-active' : ''}`} onClick={() => setLanguage(item.code as Language)}><span className={`flag-symbol flag-${item.flag}`} aria-hidden/><small>{item.label}</small>{language === item.code && <Check/>}</Button>)}</div></section>
        <section id="notifications" className="settings-section"><div className="settings-row"><div className="settings-heading"><span className="is-notice"><Bell/></span><div><h2>{t('updatePrefs')}</h2><p>{t('updatePrefsHelp')}</p></div></div><Button type="button" variant="ghost" className={`settings-switch${notifications ? ' is-on' : ''}`} aria-pressed={notifications} aria-label={t('updatePrefs')} onClick={toggleNotifications}><i/></Button></div></section>
      </div>
    </div>
  </MemberGate></main></BixShell>;
}