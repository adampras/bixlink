export type NativeCapabilities = {
  platform: string; push: boolean; backgroundGps: boolean;
};

/** Capability detection only; a WebView alone cannot provide background execution. */
export function nativeCapabilities(platform: string, native: boolean, available: (name: string) => boolean): NativeCapabilities {
  return {
    platform: native ? platform : 'web',
    push: native && available('PushNotifications'),
    backgroundGps: native && available('BixBackgroundLocation'),
  };
}

export function validGps(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function callFcmData(id: string, kind: string, createdAt: string) {
  return { type: 'call', callId: id, kind, path: '/call', expiresAt: String(new Date(createdAt).getTime() + 75000) };
}