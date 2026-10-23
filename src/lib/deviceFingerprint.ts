// Browser-only: call from effects/handlers. Combines a persistent device id with hardware signals.
const KEY = 'bix_loan_device_uuid';

function persistentId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(KEY, id); }
  return id;
}

function canvasSig(): string {
  try {
    const c = document.createElement('canvas'); c.width = 220; c.height = 40;
    const x = c.getContext('2d'); if (!x) return '';
    x.textBaseline = 'top'; x.font = '16px Arial'; x.fillStyle = '#f60'; x.fillRect(10, 5, 90, 20);
    x.fillStyle = '#069'; x.fillText('BIXLINK-fox-🦊', 4, 12);
    return c.toDataURL();
  } catch { return ''; }
}

function webglSig(): string {
  try {
    const gl = document.createElement('canvas').getContext('webgl') as WebGLRenderingContext | null;
    if (!gl) return '';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? `${gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)}|${gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)}` : String(gl.getParameter(gl.RENDERER));
  } catch { return ''; }
}

export function deviceLabel(): string {
  const ua = navigator.userAgent;
  const os = /iPhone|iPad/.test(ua) ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'macOS' : 'Device';
  const model = ua.match(/Android [\d.]+; ([^;)]+)/)?.[1]?.trim() ?? (/iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : '');
  return `${os}${model ? ' · ' + model : ''}`;
}

export async function deviceFingerprint(): Promise<string> {
  const n = navigator as Navigator & { deviceMemory?: number };
  const raw = [
    persistentId(), canvasSig(), webglSig(), navigator.userAgent, navigator.platform, navigator.language,
    screen.width, screen.height, screen.colorDepth, window.devicePixelRatio, n.hardwareConcurrency, n.deviceMemory ?? '',
    navigator.maxTouchPoints, Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join('§');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
