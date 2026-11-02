import { createRoot } from 'react-dom/client';

/** Luxury in-app confirmation replacing the browser's native confirm box. Resolves true on confirm. */
export function luxConfirm(message: string, opts: { title?: string; ok?: string; cancel?: string; danger?: boolean } = {}): Promise<boolean> {
  return new Promise(resolve => {
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = createRoot(host);
    const done = (v: boolean) => { host.classList.add('out'); setTimeout(() => { root.unmount(); host.remove(); }, 180); resolve(v); };
    root.render(
      <div className="bxt-confirm-wrap" role="presentation" onClick={() => done(false)}>
        <div className="bxt-confirm" role="alertdialog" aria-modal="true" aria-label={opts.title ?? 'Confirm'} onClick={e => e.stopPropagation()}>
          <span className="bxt-confirm-mark" aria-hidden>{opts.danger ? '⏻' : '✦'}</span>
          <h3>{opts.title ?? 'Confirm'}</h3>
          <p>{message}</p>
          <div className="bxt-confirm-actions">
            <button type="button" className="ghost" autoFocus onClick={() => done(false)}>{opts.cancel ?? 'Cancel'}</button>
            <button type="button" className={opts.danger ? 'danger' : ''} onClick={() => done(true)}>{opts.ok ?? 'OK'}</button>
          </div>
        </div>
      </div>,
    );
  });
}
