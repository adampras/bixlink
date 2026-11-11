import { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';

/** Shows a one-time "updated" notice when the app opens on a newer published build.
 *  The build fingerprint is the hashed stylesheet URL, which changes on every publish. */
export function AppUpdateNotice({ build }: { build: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      const prev = localStorage.getItem('bix-build');
      localStorage.setItem('bix-build', build);
      if (prev && prev !== build) setShow(true);
    } catch { /* storage blocked */ }
  }, [build]);
  if (!show) return null;
  return <div role="status" className="app-update-notice">
    <Sparkles size={18} aria-hidden/>
    <div><b>BIXLINK telah diperbarui</b><p>Versi terbaru aktif: tampilan lebih rapi dan fitur ekosistem diperbarui.</p></div>
    <button type="button" aria-label="Tutup" onClick={() => setShow(false)}><X size={16}/></button>
  </div>;
}
