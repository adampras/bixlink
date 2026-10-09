import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { usePublicConfig } from '@/lib/useMember';
import { updateSetting } from '@/lib/bixlink.functions';
import { splashSettingsSchema } from '@/lib/splash-settings';
import video from '@/assets/booster-orbital.webm.asset.json';
import poster from '@/assets/booster-orbital-poster.jpg.asset.json';

export function AdminSplash({ onMessage }: { onMessage: (message: string) => void }) {
  const { data: config } = usePublicConfig();
  const [duration, setDuration] = useState('0.5');
  const [busy, setBusy] = useState(false);
  const save = useServerFn(updateSetting);
  const qc = useQueryClient();
  useEffect(() => { if (config) setDuration(String(config.splash.durationSeconds)); }, [config?.splash.durationSeconds]);
  return <section className="mt-8 max-w-xl border-t border-border pt-6"><h2 className="font-display text-xl font-bold">Splash video 1</h2><video className="mt-4 aspect-video w-full object-contain" src={video.url} poster={poster.url} muted loop playsInline autoPlay aria-label="Preview splash video 1"/><form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={async e => { e.preventDefault(); const parsed = splashSettingsSchema.safeParse({ durationSeconds: Number(duration) }); if (!parsed.success) { onMessage('Durasi harus antara 0,5 dan 60 detik.'); return; } setBusy(true); try { await save({ data: { key: 'splash', value: parsed.data } }); await qc.invalidateQueries({ queryKey: ['bix-public-config'] }); onMessage('Durasi splash tersimpan.'); } catch { onMessage('Durasi splash gagal disimpan.'); } finally { setBusy(false); } }}><label className="grid gap-2 text-sm">Durasi splash (detik)<input className="form-input w-40" type="number" min="0.5" max="60" step="0.5" value={duration} onChange={e => setDuration(e.target.value)} required/></label><Button disabled={busy}>Simpan durasi splash</Button></form></section>;
}