import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { FIAT_STATUS } from '@/components/P2PFiatDesk';

type Row = { id: string; seller_id: string; buyer_id: string; amount_bix: number; total_idr: number; method: string; status: string; proof_path: string | null; created_at: string };

/** Owner mediation for member Bank/QRIS trades: view proof, release BIX to buyer or return it to seller. */
export function AdminP2PFiat() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['p2p-fiat-admin'], refetchInterval: () => (document.hidden ? false : 20_000), queryFn: async () => {
    const { data } = await supabase.from('bix_p2p_fiat_orders' as never).select('*').in('status', ['disputed', 'paid', 'pending_pay']).order('created_at', { ascending: false }).limit(50);
    return (data ?? []) as unknown as Row[];
  } });
  const view = async (p: string | null) => { if (!p) return; const { data } = await supabase.storage.from('bix-p2p').createSignedUrl(p, 600); if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener'); };
  const act = async (id: string, action: 'admin_release' | 'admin_refund') => {
    if (!confirm(action === 'admin_release' ? 'Lepas BIX ke pembeli?' : 'Kembalikan BIX ke penjual?')) return;
    const { error } = await supabase.rpc('bix_p2p_fiat_act' as never, { p_order: id, p_action: action, p_proof: null } as never);
    if (error) toast.error(error.message); else { toast.success('Keputusan tersimpan'); qc.invalidateQueries({ queryKey: ['p2p-fiat-admin'] }); }
  };
  const rows = q.data ?? [];
  return <section className="grid gap-3 rounded-2xl border border-border bg-card p-4">
    <b>P2P Bank/QRIS · mediasi banding</b>
    <p className="text-xs text-muted-foreground">Banding muncul paling atas. Cek bukti transfer dan mutasi penjual sebelum memutuskan.</p>
    {rows.length === 0 && <p className="text-xs text-muted-foreground">Tidak ada pesanan aktif.</p>}
    {[...rows].sort((a, b) => Number(b.status === 'disputed') - Number(a.status === 'disputed')).map(r => <div key={r.id} className="grid gap-1 rounded-lg border border-border p-2 text-xs">
      <span className="flex justify-between"><b>{Number(r.amount_bix).toLocaleString()} BIX · Rp{Math.round(r.total_idr).toLocaleString('id-ID')} · {r.method}</b><span>{FIAT_STATUS[r.status]?.label ?? r.status}</span></span>
      <span className="font-mono text-muted-foreground">Penjual {r.seller_id.slice(0, 8)} · Pembeli {r.buyer_id.slice(0, 8)}</span>
      <span className="flex gap-2">
        {r.proof_path && <button className="underline" onClick={() => view(r.proof_path)}>Bukti</button>}
        <button className="rounded border border-border px-2 py-0.5" onClick={() => act(r.id, 'admin_release')}>Lepas ke pembeli</button>
        <button className="rounded border border-border px-2 py-0.5" onClick={() => act(r.id, 'admin_refund')}>Kembalikan ke penjual</button>
      </span>
    </div>)}
  </section>;
}
