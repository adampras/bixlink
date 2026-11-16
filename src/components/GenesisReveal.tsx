import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { onWelcomeDone } from '@/lib/popup-queue';

/** One-time luxury welcome shown the first time a new member lands on Wallet. Presentation only. */
export function GenesisReveal({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    // One popup at a time: wait until the Genesis BIXP welcome has been closed.
    let off = () => {};
    const check = () => { try {
      if (!localStorage.getItem('bixlink-member-welcome:' + userId)) { off = onWelcomeDone(check); return; }
      const k = 'bixlink-genesis-seen-' + userId;
      if (localStorage.getItem('bixlink-genesis') === '1' && !localStorage.getItem(k)) { setOpen(true); localStorage.setItem(k, '1'); }
      localStorage.removeItem('bixlink-genesis');
    } catch { /* optional storage */ } };
    check();
    return () => off();
  }, [userId]);
  if (!open) return null;
  const close = () => setOpen(false);
  return <div className="gen-reveal" role="dialog" aria-modal="true" aria-label="Sovereign Wallet aktif" onClick={close}>
    <div className="gen-card" onClick={e => e.stopPropagation()}>
      <div className="gen-shine" aria-hidden="true"/>
      <small className="gen-chip">SOVEREIGN MEMBER</small>
      <h2>Wallet Anda Aktif</h2>
      <p>Brankas pribadi BIXLINK siap. Saldo dan BIXP Anda tampil di halaman ini.</p>
      <div className="gen-actions">
        <Link to="/presale" onClick={close} className="gen-btn g1">Presale</Link>
        <Link to="/trade" onClick={close} className="gen-btn g2">P2P</Link>
        <button type="button" onClick={close} className="gen-btn g3">Lihat Saldo</button>
      </div>
    </div>
  </div>;
}
