import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { getNotifySettings, saveNotifySettings, testNotify } from '@/lib/notify.functions';

type T = { telegram: boolean; whatsapp: boolean; deposit: boolean; withdraw: boolean; review: boolean };
const LABELS: [keyof T, string][] = [['telegram', 'Kirim ke Telegram'], ['whatsapp', 'Kirim ke WhatsApp'], ['deposit', 'Deposit masuk'], ['withdraw', 'Pengajuan withdraw'], ['review', 'Konfirmasi / penolakan Admin']];

export function AdminNotify() {
  const get = useServerFn(getNotifySettings), save = useServerFn(saveNotifySettings), test = useServerFn(testNotify);
  const [t, setT] = useState<T | null>(null);
  const [conn, setConn] = useState({ telegram: false, whatsapp: false });
  const [msg, setMsg] = useState('');
  useEffect(() => { get().then(r => { setT(r.toggles); setConn(r.connected); }).catch(() => setMsg('Hanya Owner 1 yang bisa mengatur notifikasi.')); }, []);
  if (!t) return msg ? <p className="mt-6 text-xs text-muted-foreground">{msg}</p> : null;
  return (
    <section className="mt-6 border border-primary/40 bg-card p-5">
      <p className="text-[10px] tracking-[0.3em] text-primary">NOTIFIKASI ADMIN</p>
      <h3 className="mt-1 text-lg font-semibold">Telegram & WhatsApp</h3>
      <div className="mt-3 flex gap-2 text-xs">
        <span className={`border px-2 py-1 ${conn.telegram ? 'border-primary text-primary' : 'border-border text-muted-foreground'}`}>Telegram: {conn.telegram ? 'terhubung' : 'belum diisi'}</span>
        <span className={`border px-2 py-1 ${conn.whatsapp ? 'border-primary text-primary' : 'border-border text-muted-foreground'}`}>WhatsApp: {conn.whatsapp ? 'terhubung' : 'belum diisi'}</span>
      </div>
      <div className="mt-4 space-y-3">
        {LABELS.map(([k, l]) => <label key={k} className="flex items-center justify-between text-sm"><span>{l}</span><Switch checked={t[k]} onCheckedChange={v => setT({ ...t, [k]: v })}/></label>)}
      </div>
      <div className="mt-5 flex gap-2">
        <Button className="rounded-none" onClick={async () => { try { await save({ data: t }); setMsg('Saved.'); } catch { setMsg('Failed to save.'); } }}>Save</Button>
        <Button variant="outline" className="rounded-none" onClick={async () => { setMsg('Mengirim...'); try { const r = await test(); setMsg(Object.keys(r).length ? Object.entries(r).map(([k, v]) => `${k}: ${v}`).join(' · ') : 'Belum ada kanal yang terhubung.'); } catch { setMsg('Uji coba gagal.'); } }}>Kirim uji coba</Button>
      </div>
      {msg && <p className="mt-3 text-xs text-muted-foreground">{msg}</p>}
    </section>
  );
}
