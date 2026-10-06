import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Bell, Check, Languages, Settings2 } from 'lucide-react';
import { BixShell } from '@/components/BixShell';
import { MemberGate } from '@/components/MemberGate';
import { Button } from '@/components/ui/button';
import { LANGUAGES, type Language, useI18n } from '@/lib/i18n';
import { useMember } from '@/lib/useMember';

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
  return <BixShell><main className="mx-auto min-h-[75vh] max-w-3xl px-5 py-10 md:px-8"><MemberGate ready={ready} signedIn={!!user} title={t('settings').toUpperCase()}>
    <div className="eyebrow"><Settings2 size={14}/>{t('preferences')}</div><h1 className="section-title">{t('accountSettings')}</h1>
    <section className="settings-panel mt-8"><div className="settings-heading"><span><Languages/></span><div><h2>{t('language')}</h2><p>{t('savedHere')}</p></div></div><div className="settings-language-grid">{LANGUAGES.map(item => <Button key={item.code} variant={language === item.code ? 'default' : 'outline'} className="settings-language" onClick={() => setLanguage(item.code as Language)}><span className={`flag-symbol flag-${item.flag}`} aria-hidden/><small>{item.label}</small>{language === item.code && <Check/>}</Button>)}</div></section>
    <section className="settings-panel mt-4"><div className="settings-row"><div className="settings-heading"><span><Bell/></span><div><h2>{t('updatePrefs')}</h2><p>{t('updatePrefsHelp')}</p></div></div><Button type="button" variant={notifications ? 'default' : 'outline'} className="settings-toggle" aria-pressed={notifications} onClick={toggleNotifications}>{notifications ? t('enabled') : t('disabled')}</Button></div></section>
  </MemberGate></main></BixShell>;
}