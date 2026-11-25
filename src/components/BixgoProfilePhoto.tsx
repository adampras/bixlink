import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { BixAvatar } from '@/components/BixAvatar';
import { loadCard, uploadAppAvatar, type BixCard } from '@/lib/bix-avatar';
import { useBixgoText } from '@/lib/useBixgoText';

/** BIXGO-only profile photo: shown to passengers on trips; the main BIXLINK photo is never changed. */
export function BixgoProfilePhoto({ userId }: { userId: string }) {
  const text = useBixgoText();
  const [card, setCard] = useState<BixCard | null>(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { void loadCard(userId, true).then(setCard); }, [userId]);
  const name = card?.name ?? 'Driver';
  return <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-card p-3">
    <button type="button" aria-label={text('Change BIXGO photo')} disabled={busy} onClick={() => ref.current?.click()} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-primary bg-muted">
      <BixAvatar userId={userId} path={card?.bixgo_avatar_path || card?.avatar_path || null} name={name} className="h-full w-full" ring={false}/>
      <span className="absolute bottom-0 right-0 grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground">{busy ? <Loader2 className="h-3 w-3 animate-spin"/> : <Camera className="h-3 w-3"/>}</span>
    </button>
    <div className="min-w-0 text-[11px]"><p className="font-black">{text('BIXGO profile photo')}</p><p className="text-muted-foreground">{text(card?.bixgo_avatar_path ? 'Shown to passengers. Your BIXLINK photo stays the same.' : 'Using your BIXLINK photo. Tap to set a separate BIXGO photo.')}</p></div>
    <input ref={ref} type="file" accept="image/*" hidden onChange={async e => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; setBusy(true); try { await uploadAppAvatar('bixgo', userId, f, card?.bixgo_avatar_path); setCard(await loadCard(userId, true)); toast.success(text('BIXGO photo updated')); } catch (er) { toast.error(er instanceof Error ? er.message : text('Upload failed')); } finally { setBusy(false); } }}/>
  </div>;
}
