import { nativeCapabilities, validGps } from './native-capabilities';
import { nativePushStatus, registerNativeDevice } from './native-device.functions';

export async function getNativeCapabilities() {
  const { Capacitor } = await import('@capacitor/core');
  return nativeCapabilities(Capacitor.getPlatform(), Capacitor.isNativePlatform(), name => Capacitor.isPluginAvailable(name));
}

export type NativePushResult = 'registered' | 'not-configured' | 'native-required' | 'denied';
export async function enableNativePush(): Promise<NativePushResult> {
  const caps = await getNativeCapabilities();
  if (!caps.push || (caps.platform !== 'android' && caps.platform !== 'ios')) return 'native-required';
  const status = await nativePushStatus();
  if (!status.configured) return 'not-configured';
  const { PushNotifications } = await import('@capacitor/push-notifications');
  let permission = await PushNotifications.checkPermissions();
  if (permission.receive === 'prompt' || permission.receive === 'prompt-with-rationale') permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') return 'denied';
  // High-importance channels so calls ring with sound on the lock screen.
  try {
    await PushNotifications.createChannel({ id: 'bixcall_ring', name: 'BIX CALL incoming calls', importance: 5, visibility: 1, sound: 'default', vibration: true });
    await PushNotifications.createChannel({ id: 'bixcall_chat', name: 'BIX CALL messages', importance: 4, visibility: 1, vibration: true });
  } catch { /* older Android */ }
  let installationId = localStorage.getItem('bix-native-installation');
  if (!installationId) { installationId = crypto.randomUUID(); localStorage.setItem('bix-native-installation', installationId); }
  const id = installationId;
  const platform = caps.platform;
  let success: Awaited<ReturnType<typeof PushNotifications.addListener>> | undefined;
  let failure: Awaited<ReturnType<typeof PushNotifications.addListener>> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await new Promise<NativePushResult>((resolve, reject) => {
      timer = setTimeout(() => reject(new Error('Device registration timed out')), 15000);
      void (async () => {
        success = await PushNotifications.addListener('registration', ({ value }) => {
          void registerNativeDevice({ data: { installationId: id, token: value, platform } }).then(() => resolve('registered')).catch(reject);
        });
        failure = await PushNotifications.addListener('registrationError', () => reject(new Error('Device registration failed')));
        await PushNotifications.register();
      })().catch(reject);
    });
  } finally {
    if (timer) clearTimeout(timer);
    await success?.remove(); await failure?.remove();
  }
}

type LocationPlugin = {
  addWatcher(options: { tripIds: string[]; backgroundTitle: string; backgroundMessage: string }, callback: (location: { latitude: number; longitude: number } | null, error?: { message: string }) => void): Promise<string>;
  removeWatcher(options: { id: string }): Promise<void>;
};

/** Native plugin must itself own the foreground service and authenticated uploads while JS sleeps. */
export async function watchDriverLocation(ids: string[], onLocation: (lat: number, lng: number) => void, onState: (state: string) => void): Promise<() => void> {
  const caps = await getNativeCapabilities();
  if (caps.backgroundGps) {
    const { registerPlugin } = await import('@capacitor/core');
    const plugin = registerPlugin<LocationPlugin>('BixBackgroundLocation');
    const id = await plugin.addWatcher({ tripIds: ids, backgroundTitle: 'BIXGO · Active trip', backgroundMessage: 'Location sharing with your passenger' }, (location, error) => {
      if (error) { onState('Background GPS unavailable · check location permission'); return; }
      if (location && validGps(location.latitude, location.longitude)) onLocation(location.latitude, location.longitude);
    });
    // Do not claim delivery until a callback/upload has actually succeeded.
    onState('Native GPS requested · waiting for location');
    return () => { void plugin.removeWatcher({ id }).catch(() => onState('Could not stop GPS')); };
  }
  if (!navigator.geolocation) { onState('GPS unavailable'); return () => {}; }
  onState('Browser GPS · keep BIXGO open; locked-screen tracking unavailable');
  const id = navigator.geolocation.watchPosition(p => {
    if (validGps(p.coords.latitude, p.coords.longitude)) onLocation(p.coords.latitude, p.coords.longitude);
  }, () => onState('GPS blocked · allow location in site settings'), { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });
  return () => navigator.geolocation.clearWatch(id);
}