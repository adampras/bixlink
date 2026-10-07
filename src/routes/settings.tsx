import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Bell, Check, ChevronRight, KeyRound, Languages, Settings2, ShieldCheck, UserRound, Coins, LockKeyhole } from 'lucide-react';
import { clearPin, getFiatCodes, hasPin, savePin, setFiatCodes, txFeedback } from '@/components/TxFeedback';

const FIATS = [['IDR','Indonesia'],['MYR','Malaysia'],['CNY','China'],['INR','India'],['SGD','Singapore'],['AED','Arab / UAE'],['ZAR','South Africa']] as const;
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
  const [fiat, setFiat] = useState<string[]>([]);
  const [pinOn, setPinOn] = useState(false); const [pinForm, setPinForm] = useState(false); const [pin1, setPin1] = useState(''); const [pin2, setPin2] = useState('');
  useEffect(() => { setFiat(getFiatCodes()); setPinOn(hasPin()); }, []);
  const toggleFiat = (code: string) => { const next = fiat.includes(code) ? fiat.filter(c => c !== code) : [...fiat, code]; setFiat(next); setFiatCodes(next); };
  const submitPin = async () => { if (!/^\d{6}$/.test(pin1)) return txFeedback.fail('PIN not saved', 'PIN must be exactly 6 digits.'); if (pin1 !== pin2) return txFeedback.fail('PIN not saved', 'The two PINs do not match.'); await savePin(pin1); setPinOn(true); setPinForm(false); setPin1(''); setPin2(''); txFeedback.success('Transaction PIN active', 'You will be asked for this PIN before every transaction on this device.'); };
  return <BixShell><main data-no-translate className="settings-page mx-auto min-h-[75vh] max-w-5xl px-5 py-8 md:px-8 md:py-10"><MemberGate ready={ready} signedIn={!!user} title={t('settings').toUpperCase()}>
    <div className="eyebrow"><Settings2 size={14}/>{t('preferences')}</div><h1 className="section-title">{t('settings').toUpperCase()}</h1>
    <div className="settings-console mt-7">
      <aside className="settings-rail" aria-label="Settings categories">
        <div className="settings-member"><span><UserRound/></span><div><b>{user?.email?.split('@')[0]}</b><small>Verified member</small></div></div>
        <nav><a href="#account"><ShieldCheck/>Account</a><a href="#language" className="active"><Languages/>{t('language')}</a><a href="#currency"><Coins/>Currency</a><a href="#pin"><LockKeyhole/>Transaction PIN</a><a href="#notifications"><Bell/>{t('notifications')}</a></nav>
      </aside>
      <div className="settings-content">
        <section id="account" className="settings-section"><div className="settings-heading"><span className="is-secure"><ShieldCheck/></span><div><h2>Account &amp; security</h2><p>Your verified account and password controls.</p></div></div><Button asChild variant="ghost" className="settings-account-row"><Link to="/reset-password"><span><KeyRound/>Change password</span><ChevronRight/></Link></Button><div className="mt-3"><KycCard userId={user?.id}/></div></section>
        <section id="language" className="settings-section"><div className="settings-heading"><span><Languages/></span><div><h2>{t('language')}</h2><p>{t('savedHere')}</p></div></div><div className="settings-language-grid">{LANGUAGES.map(item => <Button key={item.code} variant="ghost" className={`settings-language${language === item.code ? ' is-active' : ''}`} onClick={() => setLanguage(item.code as Language)}><span className={`flag-symbol flag-${item.flag}`} aria-hidden/><small>{item.label}</small>{language === item.code && <Check/>}</Button>)}</div></section>
        <section id="currency" className="settings-section"><div className="settings-heading"><span><Coins/></span><div><h2>Currency conversion</h2><p>Optional. Pick which currencies appear under your wallet balance.</p></div></div><div className="settings-language-grid">{FIATS.map(([code, label]) => <Button key={code} variant="ghost" className={`settings-language${fiat.includes(code) ? ' is-active' : ''}`} onClick={() => toggleFiat(code)}><b className="numeric">{code}</b><small>{label}</small>{fiat.includes(code) && <Check/>}</Button>)}</div></section>
        <section id="pin" className="settings-section"><div className="settings-row"><div className="settings-heading"><span className="is-secure"><LockKeyhole/></span><div><h2>Transaction PIN</h2><p>Optional 6-digit PIN asked before transfers, payments, staking, swaps and withdrawals on this device.</p></div></div><Button type="button" variant="ghost" className={`settings-switch${pinOn ? ' is-on' : ''}`} aria-pressed={pinOn} aria-label="Transaction PIN" onClick={() => { if (pinOn) { clearPin(); setPinOn(false); txFeedback.success('Transaction PIN turned off'); } else setPinForm(true); }}><i/></Button></div>
          {pinOn && !pinForm && <Button variant="outline" size="sm" className="mt-3 rounded-full" onClick={() => setPinForm(true)}>Change PIN</Button>}
          {pinForm && <div className="mt-4 grid gap-3 sm:grid-cols-2"><input className="form-input text-center tracking-[0.4em]" type="password" inputMode="numeric" maxLength={6} placeholder="New PIN" value={pin1} onChange={e => setPin1(e.target.value.replace(/\D/g, ''))}/><input className="form-input text-center tracking-[0.4em]" type="password" inputMode="numeric" maxLength={6} placeholder="Repeat PIN" value={pin2} onChange={e => setPin2(e.target.value.replace(/\D/g, ''))}/><Button variant="outline" className="rounded-full" onClick={() => { setPinForm(false); setPin1(''); setPin2(''); }}>Cancel</Button><Button className="rounded-full bg-chart-3 text-background" onClick={submitPin}>Save PIN</Button></div>}
        </section>
        <section id="notifications" className="settings-section"><div className="settings-row"><div className="settings-heading"><span className="is-notice"><Bell/></span><div><h2>{t('updatePrefs')}</h2><p>{t('updatePrefsHelp')}</p></div></div><Button type="button" variant="ghost" className={`settings-switch${notifications ? ' is-on' : ''}`} aria-pressed={notifications} aria-label={t('updatePrefs')} onClick={toggleNotifications}><i/></Button></div></section>
      </div>
    </div>
  </MemberGate></main></BixShell>;
}