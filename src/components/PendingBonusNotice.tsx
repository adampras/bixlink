import { useQuery } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/** Bonuses held until the member's own first approved deposit (released automatically by the server). */
export function PendingBonusNotice({ userId }: { userId?: string }) {
  const { data } = useQuery({
    queryKey: ['pending-network-bonuses', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('bix_pending_network_bonuses').select('usdt_amount,bix_amount').eq('user_id', userId!);
      if (error) throw error;
      return (data ?? []).reduce((a, r) => ({ n: a.n + 1, usdt: a.usdt + Number(r.usdt_amount), bix: a.bix + Number(r.bix_amount) }), { n: 0, usdt: 0, bix: 0 });
    },
  });
  if (!data || data.n === 0) return null;
  return (
    <div className="rounded-xl border border-chart-3/40 bg-chart-3/10 p-3 text-sm">
      <p className="flex items-center gap-2 font-bold text-chart-3"><Lock size={16} /> Bonus tertahan · {data.n} bonus</p>
      <p className="mt-1">{data.usdt.toFixed(2)} USDT + {data.bix.toFixed(2)} BIX</p>
      <p className="mt-1 text-xs text-muted-foreground">Bonus dari jaringan Anda ditahan sampai Anda melakukan deposit pertama. Setelah deposit disetujui, semua bonus otomatis masuk ke saldo.</p>
    </div>
  );
}
