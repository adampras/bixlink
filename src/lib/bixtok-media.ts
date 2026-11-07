/** Camera + microphone opener for BIXTOK LIVE with phone-friendly fallbacks and clear error kinds. */
export type MediaIssue = 'blocked' | 'busy' | 'nocamera' | 'nomic' | 'insecure' | 'unknown';

export const MEDIA_HELP: Record<MediaIssue, { title: string; body: string }> = {
  blocked: { title: 'Camera & microphone are blocked', body: 'Tap the lock icon next to bixlink.com in the address bar → Permissions → allow Camera and Microphone. Then tap Try again.' },
  busy: { title: 'Camera is used by another tab or app', body: 'Close other BIXTOK tabs, video calls or camera apps, then tap Try again.' },
  nocamera: { title: 'Voice only', body: 'No camera could be opened — viewers hear your voice. Allow the camera or close other camera apps, then tap Try again.' },
  nomic: { title: 'Video only', body: 'The microphone could not be opened — viewers see you without sound. Allow the microphone, then tap Try again.' },
  insecure: { title: 'Camera not available', body: 'Open BIXTOK at https://bixlink.com in Chrome or Safari to go LIVE.' },
  unknown: { title: 'Camera could not start', body: 'Tap Try again. If it keeps failing, restart the browser and allow Camera and Microphone.' },
};

export function classifyMediaError(e: unknown): MediaIssue {
  const name = (e as { name?: string } | null)?.name ?? '';
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') return 'blocked';
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') return 'busy';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') return 'nocamera';
  return 'unknown';
}

const AUDIO: MediaTrackConstraints = { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1, sampleRate: 48000 };
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Opens camera + mic. Steps down constraints, retries once when the camera is still being released,
 * and falls back to voice-only or video-only so the LIVE never ends up silent and black for no reason.
 */
/** Lists cameras (built-in, USB/HDMI capture cards, OBS Virtual Camera, DroidCam…) once permission is granted. */
export async function listCameras(): Promise<{ id: string; label: string }[]> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return [];
  const d = await navigator.mediaDevices.enumerateDevices().catch(() => [] as MediaDeviceInfo[]);
  return d.filter(x => x.kind === 'videoinput' && x.deviceId).map((x, i) => ({ id: x.deviceId, label: x.label || `Camera ${i + 1}` }));
}

export async function openLiveMedia(facing: 'user' | 'environment', deviceId?: string | null): Promise<{ stream: MediaStream | null; error: MediaIssue | null }> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return { stream: null, error: 'insecure' };
  const gum = (c: MediaStreamConstraints) => navigator.mediaDevices.getUserMedia(c);
  const pick: MediaTrackConstraints = deviceId ? { deviceId: { exact: deviceId } } : { facingMode: facing };
  const videos: MediaTrackConstraints[] = [
    { ...pick, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
    pick,
    {},
  ];
  let first: MediaIssue | null = null;
  for (let round = 0; round < 2; round++) {
    for (const v of videos) {
      try { return { stream: await gum({ video: Object.keys(v).length ? v : true, audio: AUDIO }), error: null }; }
      catch (e) {
        const k = classifyMediaError(e); first ??= k;
        if (k === 'blocked') break; // asking again will not change the answer
      }
    }
    if (first !== 'busy') break;
    await wait(800); // previous camera may still be closing (flip / reopen)
  }
  // Partial fallbacks: keep the voice, or keep the picture.
  try { const s = await gum({ audio: AUDIO }); return { stream: s, error: first === 'blocked' ? 'blocked' : 'nocamera' }; } catch { /* no mic either */ }
  try { const s = await gum({ video: { facingMode: facing } }); return { stream: s, error: 'nomic' }; } catch { /* nothing */ }
  return { stream: null, error: first ?? 'unknown' };
}
