import { useEffect, useState } from 'react';
import { Bell, RefreshCw, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { enableNativePush, getNativeCapabilities } from '@/lib/native-device';
import { enableBixNotifications } from '@/components/BixCall';

export function NativeDeviceSettings() {
  const [native, setNative] = useState(false);
  const [gps, setGps] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  useEffect(() => { void getNativeCapabilities().then(c => { setNative(c.push); setGps(c.backgroundGps); }).catch(() => {}); }, []);
  const enable = async () => {
    setBusy(true);
    try {
      const result = native ? await enableNativePush() : await enableBixNotifications();
      const messages: Record<string, string> = {
        registered: 'Device registered · incoming-call delivery still requires native Android setup.',
        'not-configured': 'Firebase is not connected yet.',
        'native-required': 'Native Android app required.',
        granted: 'Browser notifications enabled · not full-screen locked-screen calls.',
        denied: 'Notifications blocked · allow them in site or phone settings.',
        'open-in-new-tab': 'Open BIXLINK in its own tab to allow notifications.',
        unsupported: 'Notifications unavailable on this device.',
        failed: 'Notification registration failed · try again.',
      };
      setNote(messages[result] ?? 'Notification permission not granted.');
    } catch { setNote('Device registration failed · check your connection and try again.'); }
    finally { setBusy(false); }
  };
  return <section className="comm-card">
    <h3 className="comm-h flex items-center gap-2"><Smartphone size={16}/>Device notifications</h3>
    <div className="space-y-2 text-xs text-muted-foreground">
      <p>{native ? 'Native notification support detected' : 'Browser · locked-screen calling not available'}</p>
      <p>{gps ? 'Native GPS support detected · permission required' : 'BIXGO GPS · app must remain open'}</p>
    </div>
    <Button variant="outline" size="sm" className="mt-3" disabled={busy} onClick={() => void enable()}>
      {busy ? <RefreshCw className="animate-spin"/> : <Bell/>}Enable notifications
    </Button>
    {note && <p className="mt-2 text-xs text-muted-foreground" role="status">{note}</p>}
  </section>;
}