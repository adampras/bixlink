import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { cancelBixgoTrip } from '@/lib/bixgo-trip.functions';
import { DRIVER_CANCEL_REASONS, RIDER_CANCEL_REASONS, validCancelReason } from '@/lib/bixgo-trip';
export function BixgoCancelDialog({ id, role, open, onClose, onDone }: { id: string; role: 'rider' | 'driver'; open: boolean; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const cancel = useServerFn(cancelBixgoTrip);
  return <Dialog open={open} onOpenChange={v => !busy && !v && onClose()}><DialogContent className="z-[900] bg-background text-foreground">
    <DialogTitle>Cancel this trip?</DialogTitle>
    <DialogDescription>No cancellation fee before the trip starts. Held fare and prepaid driver BIX fees are released; no trip earnings are paid.</DialogDescription>
    <fieldset className="space-y-2"><legend className="mb-2 text-sm font-semibold">Reason for cancelling</legend>{(role === 'driver' ? DRIVER_CANCEL_REASONS : RIDER_CANCEL_REASONS).map(r => <label key={r} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 text-sm"><input type="radio" name="cancel-reason" value={r} checked={reason === r} onChange={() => setReason(r)} disabled={busy}/>{r}</label>)}</fieldset>
    <label className="text-xs">{reason === 'Other' ? 'Explanation (required)' : 'Note (optional)'}<textarea className="form-input mt-1 min-h-20" value={note} maxLength={240} onChange={e => setNote(e.target.value)} disabled={busy}/></label>
    <div className="sticky bottom-0 grid grid-cols-2 gap-2 bg-background py-2"><Button variant="outline" onClick={onClose} disabled={busy}>Keep trip</Button><Button variant="destructive" disabled={busy || !validCancelReason(role, reason, note)} onClick={async () => { setBusy(true); try { await cancel({ data: { id, reason, note } }); toast.success('Trip cancelled · held amounts released'); onDone(); onClose(); } catch (e) { toast.error(e instanceof Error ? e.message : 'Cancellation failed'); } finally { setBusy(false); } }}>{busy ? 'Cancelling…' : 'Cancel trip'}</Button></div>
  </DialogContent></Dialog>;
}