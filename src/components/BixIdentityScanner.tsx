import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { QrScanner } from '@/components/QrScanner';
import foxLogo from '@/assets/bixlink-fox.webp';

type Me = { name: string; since: string | null; session: string };
const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const hashOf = async (v: string) => { try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase(); } catch { return v.replace(/\W/g, '').toUpperCase().padEnd(12, '0'); } };

/** BIX CALL member pass shown under the live scanner: real signed-in profile + BIX-ID QR. */
function MemberPass({ code, tier }: { code: string; tier: string }) {
  const [me, setMe] = useState<Me | null>(null);
  const [hash, setHash] = useState('');
  useEffect(() => {
    let live = true;
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user.id; if (!uid) return;
      const { data } = await supabase.from('profiles').select('full_name, username, created_at').eq('user_id', uid).maybeSingle();
      const sid = (await hashOf(`${uid}:${session.expires_at ?? ''}`)).slice(0, 8);
      if (live) setMe({ name: data?.full_name || data?.username || 'BIXLINK Member', since: data?.created_at ?? session.user.created_at ?? null, session: `${sid.slice(0, 4)}-${sid.slice(4)}` });
    })();
    return () => { live = false; };
  }, []);
  useEffect(() => { if (code) void hashOf(code).then(h => setHash(h.slice(0, 12).match(/.{4}/g)?.join(' ') ?? '')); }, [code]);
  const since = me?.since ? new Date(me.since) : null;
  const rows: [string, string][] = [['Tier', tier || 'Member'], ['BIX ID', code || '—'], ['Member since', since ? fmt(since) : '—'], ['Status', 'Active']];
  return <section className="bx-pass" aria-label="Sovereign Member Pass">
    <div className="bx-pass__head">
      <div className="bx-pass__avatar"><img src={foxLogo} alt="" /></div>
      <div className="bx-pass__info">
        <b className="bx-pass__name">{me?.name ?? 'Memuat…'}</b>
        <small>Sovereign Member Pass</small>
        <dl>{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      </div>
      <div className="bx-pass__qr">
        <div className="bx-pass__qrbox">{code ? <QRCodeSVG value={code} size={76} level="M" marginSize={0} /> : <span />}</div>
        <code>{hash || '····'}</code>
      </div>
    </div>
    <div className="bx-pass__twin">
      <div><span className="bx-pass__hex"><ShieldCheck size={17} /></span><p><em>Registered Pass</em><b>Account Active</b><small>Linked to your BIX ID</small></p></div>
      <div><span className="bx-pass__hex"><Lock size={16} /></span><p><b className="bx-pass__w">Secure Connection</b><em>Encrypted in transit</em><small className="mono">Session: {me?.session ?? '—'}</small></p></div>
    </div>
    <div className="bx-pass__foot">
      {[['Network', 'BIXLINK'], ['Format', 'QR · BIX-ID'], ['Transport', 'TLS'], ['Hash', 'SHA-256']].map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b></div>)}
    </div>
  </section>;
}

export function BixIdentityScanner({ code, tier, msg, onResult, onClose }: { code: string; tier: string; msg?: string; onResult: (v: string) => void; onClose: () => void }) {
  return <QrScanner variant="identity" title="Scan Identity" continuous onClose={onClose} onResult={onResult}>
    {msg && <p role="status" className="bx-idscan__msg">{msg}</p>}
    <MemberPass code={code} tier={tier} />
  </QrScanner>;
}
