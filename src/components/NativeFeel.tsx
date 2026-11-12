import { useEffect } from 'react';

/** App-like touch feel: micro haptics on primary actions and the phone Back key closes open dialogs first. */
export function NativeFeel() {
  useEffect(() => {
    const onTap = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      const el = (e.target as HTMLElement | null)?.closest('button, [role="button"], a.btn, .comm-dial-pad button');
      if (!el || (el as HTMLButtonElement).disabled) return;
      try { navigator.vibrate?.(12); } catch { /* unsupported */ }
    };
    const onPop = () => {
      const open = document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]');
      if (!open) return;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      open.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    };
    const onHide = () => document.documentElement.toggleAttribute('data-app-hidden', document.hidden);
    document.addEventListener('pointerdown', onTap, { passive: true });
    window.addEventListener('popstate', onPop);
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pageshow', onHide);
    window.addEventListener('focus', onHide);
    onHide();
    return () => {
      document.removeEventListener('pointerdown', onTap);
      window.removeEventListener('popstate', onPop);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pageshow', onHide);
      window.removeEventListener('focus', onHide);
    };
  }, []);
  return null;
}
