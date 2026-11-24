import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Gift, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { giftArt } from '@/lib/bixtok-gift-art';
import { giftSeenKey, giftTotals, mergeGiftSeen, readGiftSeen, unseenGifts, type ReceivedGift } from '@/lib/bixtok-received-gifts';
import './bixtok-received-gifts.css';

type Recent = { gift_name: string; currency: string; amount: number; created_at: string; sender: string };
export function useReceivedGifts(userId: string | undefined, enabled: boolean) {
  const qc = useQueryClient();
  const [seenState, setSeenState] = useState<{ user: string; ids: string[] } | null>(null);
  useEffect(() => {
    if (!userId) { setSeenState(null); return; }
    const sync = () => setSeenState({ user: userId, ids: readGiftSeen(userId) });
    sync();
    const onStorage = (e: StorageEvent) => { if (e.key === giftSeenKey(userId)) sync(); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [userId]);
  const q = useQuery({
    queryKey: ['bixtok-received-gifts', userId], enabled: Boolean(userId) && enabled,
    refetchInterval: 15_000, refetchIntervalInBackground: false, staleTime: 10_000,
    queryFn: async (): Promise<ReceivedGift[]> => {
      if (!userId) return [];
      const [tx, earnings] = await Promise.all([
        supabase.from('bixtok_gift_tx').select('id,gift_name,currency,amount,gross_amount,created_at,claimed_at,video_id,live_id').eq('recipient_id', userId).order('created_at', { ascending: false }).limit(50),
        supabase.rpc('bixtok_my_earnings'),
      ]);
      if (tx.error) throw tx.error;
      if (earnings.error) throw earnings.error;
      const recent = (earnings.data as unknown as { recent: Recent[] } | null)?.recent ?? [];
      const rows = (tx.data ?? []).map(row => ({ ...row, amount: Number(row.amount), gross_amount: Number(row.gross_amount), sender: recent.find(r => r.created_at === row.created_at && r.gift_name === row.gift_name && r.currency === row.currency && Number(r.amount) === Number(row.amount))?.sender ?? 'member' }));
      // Existing balance view re-reads its authoritative totals, not a client increment.
      void qc.invalidateQueries({ queryKey: ['bixtok-earnings'] });
      return rows;
    },
  });
  const unread = seenState && seenState.user === userId ? unseenGifts(q.data ?? [], seenState.ids) : [];
  const acknowledge = useCallback((ids: string[]) => {
    if (!userId) return;
    setSeenState(previous => {
      const next = mergeGiftSeen(mergeGiftSeen(readGiftSeen(userId), previous?.user === userId ? previous.ids : []), ids);
      try { localStorage.setItem(giftSeenKey(userId), JSON.stringify(next)); } catch { /* Session-only acknowledgement when storage is unavailable. */ }
      return { user: userId, ids: next };
    });
  }, [userId]);
  return { rows: q.data ?? [], unread, acknowledge, error: q.isError };
}

export function BixtokReceivedGifts({ userId, rows, unread, acknowledge, activeVideo, balanceOpen, blocked, muted, onBalance }: {
  userId: string; rows: ReceivedGift[]; unread: ReceivedGift[]; acknowledge: (ids: string[]) => void;
  activeVideo: string | null; balanceOpen: boolean; blocked: boolean; muted: boolean; onBalance: () => void;
}) {
  const [toast, setToast] = useState<ReceivedGift | null>(null);
  const previous = useRef<{ user: string; ids: Set<string> } | null>(null);
  useEffect(() => {
    if (!rows.length) return;
    if (previous.current?.user === userId) {
      const incoming = rows.find(row => !previous.current?.ids.has(row.id));
      if (incoming) setToast(incoming);
    }
    previous.current = { user: userId, ids: new Set(rows.map(row => row.id)) };
  }, [rows, userId]);
  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(null), 5000); return () => clearTimeout(t); }, [toast]);

  const audio = useRef<AudioContext | null>(null);
  useEffect(() => {
    // Separate, gesture-unlocked notification sound; never touches call/LIVE audio.
    const unlock = () => {
      if (!audio.current) { try { audio.current = new AudioContext(); } catch { return; } }
      void audio.current.resume().catch(() => {});
    };
    document.addEventListener('pointerdown', unlock);
    return () => { document.removeEventListener('pointerdown', unlock); void audio.current?.close().catch(() => {}); audio.current = null; };
  }, []);
  const current = !blocked && !balanceOpen && activeVideo ? unread.find(row => row.video_id === activeVideo) : undefined;
  const latest = balanceOpen ? unread[0] : current;
  useEffect(() => {
    const c = audio.current;
    if (!latest || muted || !c || c.state !== 'running' || document.hidden) return;
    [880, 1175].forEach((frequency, i) => {
      const oscillator = c.createOscillator(); const gain = c.createGain();
      oscillator.frequency.value = frequency; gain.gain.setValueAtTime(.025, c.currentTime + i * .12);
      gain.gain.exponentialRampToValueAtTime(.0001, c.currentTime + i * .12 + .25);
      oscillator.connect(gain).connect(c.destination); oscillator.start(c.currentTime + i * .12); oscillator.stop(c.currentTime + i * .12 + .27);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  }, [latest?.id, muted]);
  useEffect(() => {
    if (!current || document.hidden) return;
    const t = window.setTimeout(() => { if (!document.hidden) acknowledge([current.id]); }, 3000);
    return () => clearTimeout(t);
  }, [current?.id, acknowledge]);
  const totals = giftTotals(unread);
  const display = (amount: number) => amount.toLocaleString('en-US', { maximumFractionDigits: 6 });
  return <>
    {current && <div key={current.id} className="bxt-received-stage" role="status">
      <div className="bxt-received-art" aria-hidden="true"><img src={giftArt({ name: current.gift_name, emoji: '' }, 0)} alt=""/><i>✦</i><i>✧</i><i>✦</i><i>✧</i></div>
      <div className="bxt-received-caption"><small>🎁 Gift dari @{current.sender}</small><b>{current.gift_name}</b><strong>+{display(current.amount)} {current.currency}</strong><small>{current.currency === 'BIXP' ? 'Poin promo BIXTOK' : 'Penghasilan bersih BIXTOK'}</small></div>
    </div>}
    {toast && !balanceOpen && !blocked && !current && <div className="bxt-received-toast" role="status"><Gift/><div><b>Gift baru dari @{toast.sender}</b><small>{toast.gift_name} · +{display(toast.amount)} {toast.currency}</small></div><Button variant="ghost" size="sm" onClick={() => { setToast(null); onBalance(); }}>Lihat</Button><Button variant="ghost" size="icon" aria-label="Tutup pemberitahuan gift" onClick={() => setToast(null)}><X/></Button></div>}
    <Dialog open={balanceOpen && unread.length > 0 && !blocked} onOpenChange={open => { if (!open) acknowledge(unread.map(row => row.id)); }}>
      <DialogContent className="bxt-received-dialog">
        <img src={giftArt({ name: unread[0]?.gift_name ?? 'BIX', emoji: '' }, 0)} alt=""/>
        <DialogTitle>Anda menerima gift!</DialogTitle>
        <DialogDescription>{unread.length} hadiah · nominal bersih yang tercatat</DialogDescription>
        <div className="bxt-received-totals">{totals.bix > 0 && <span>+{display(totals.bix)} BIX</span>}{totals.bixp > 0 && <span>+{display(totals.bixp)} BIXP</span>}</div>
        <ul className="bxt-received-list">{unread.map(row => <li key={row.id}><div>@{row.sender}<small>{row.gift_name} · {new Date(row.created_at).toLocaleString('id-ID')}</small></div><b>+{display(row.amount)} {row.currency}</b></li>)}</ul>
        <p>BIX masuk Penghasilan BIXTOK; penarikan ke saldo utama mengikuti batas yang berlaku. BIXP tetap terpisah sebagai poin promo.</p>
        <Button className="bxt-received-done" onClick={() => acknowledge(unread.map(row => row.id))}>Lihat saldo &amp; riwayat</Button>
      </DialogContent>
    </Dialog>
  </>;
}