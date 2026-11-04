import { useEffect } from 'react';

const ALLOW = 'input, textarea, select, [contenteditable="true"], .allow-select, [data-copyable], .select-all, .select-text, .break-all, .font-mono, code, pre, .chat-bubble, [class*="msg-bubble"]';

/** Blocks context menu and drag on images/static content; inputs and copyable areas stay usable. */
export function ContentGuard() {
  useEffect(() => {
    const allowed = (t: EventTarget | null) => t instanceof Element && !!t.closest(ALLOW);
    const onMenu = (e: MouseEvent) => { if (!allowed(e.target)) e.preventDefault(); };
    const onDrag = (e: DragEvent) => { const t = e.target; if (t instanceof HTMLImageElement || t instanceof HTMLVideoElement || (t instanceof Element && t.closest('img,video,svg'))) e.preventDefault(); };
    document.addEventListener('contextmenu', onMenu);
    document.addEventListener('dragstart', onDrag);
    return () => { document.removeEventListener('contextmenu', onMenu); document.removeEventListener('dragstart', onDrag); };
  }, []);
  return null;
}
