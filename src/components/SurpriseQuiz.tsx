import { useEffect, useState } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { Gift, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type Status = { enabled: boolean; quota: number; reward: number; round: number; winners: number; left: number; mine: string | null };
type Q = { q: string; options: string[] };

/** Floating gold orb: surprise FREE BIX quiz with 2 random server-picked questions. Answers are checked only on the server. */
export function SurpriseQuiz() {
  const path = useRouterState({ select: s => s.location.pathname });
  const [status, setStatus] = useState<Status | null>(null);
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState<string | null>(null);
  const [qs, setQs] = useState<Q[]>([]);
  const [picks, setPicks] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ result: string; amount?: number } | null>(null);
  const [err, setErr] = useState('');

  const load = async () => {
    const { data: s } = await supabase.auth.getSession();
    if (!s.session) { setStatus(null); return; }
    const { data } = await supabase.rpc('bix_surprise_status');
    setStatus((data as unknown as Status) ?? null);
  };
  useEffect(() => { void load(); const t = setInterval(load, 60000); const { data: sub } = supabase.auth.onAuthStateChange(e => { if (e === 'SIGNED_IN' || e === 'SIGNED_OUT') void load(); }); return () => { clearInterval(t); sub.subscription.unsubscribe(); }; }, []);

  const hidden = path.startsWith('/admin') || path.startsWith('/auth') || path.startsWith('/register') || path === '/';
  if (hidden || !status?.enabled) return null;
  const done = status.mine && status.mine !== 'open';
  if ((done || status.left <= 0) && !open) return null;

  const start = async () => {
    setOpen(true); setErr(''); setResult(null);
    if (attempt) return;
    setBusy(true);
    const { data, error } = await supabase.rpc('bix_surprise_open');
    setBusy(false);
    if (error) { setErr(error.message); return; }
    const d = data as unknown as { attempt: string; questions: Q[] };
    setAttempt(d.attempt); setQs(d.questions ?? []); setPicks((d.questions ?? []).map(() => -1));
  };
  const submit = async () => {
    if (!attempt) return;
    setBusy(true); setErr('');
    const { data, error } = await supabase.rpc('bix_surprise_answer', { p_attempt: attempt, p_answers: picks });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setResult(data as unknown as { result: string; amount?: number });
    void load();
  };

  return (
    <>
      {!open && (
        <button type="button" onClick={start} aria-label={`Kuis kejutan FREE ${status.reward} BIX`} className="surprise-orb fixed bottom-24 left-4 z-[60] grid size-16 place-items-center rounded-full">
          <Gift className="size-7 text-primary" />
          <span className="absolute -top-2 -right-3 rounded-full bg-primary px-2 py-0.5 text-[10px] font-black text-primary-foreground shadow">FREE {status.reward} BIX</span>
          <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-bold text-primary">Sisa {status.left}</span>
        </button>
      )}
      {open && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-background/70 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div onClick={e => e.stopPropagation()} className="surprise-card relative w-full max-w-sm rounded-3xl p-5 text-foreground">
            <button type="button" onClick={() => setOpen(false)} aria-label="Tutup" className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:text-foreground"><X className="size-5" /></button>
            <div className="mx-auto mb-2 grid size-14 place-items-center rounded-full surprise-orb"><Gift className="size-6 text-primary" /></div>
            <h3 className="text-center text-lg font-black tracking-wide">Kuis Kejutan <span className="text-primary">FREE {status.reward} BIX</span></h3>
            <p className="mb-4 text-center text-xs text-muted-foreground">Tersisa {status.left} dari {status.quota} hadiah · jawab 2 soal dengan benar · 1 kesempatan per ronde</p>
            {result ? (
              <div className="py-4 text-center">
                {result.result === 'win' && <p className="text-base font-bold text-primary">🎉 Selamat! {result.amount} BIX promo masuk ke saldo vBIX Anda.</p>}
                {result.result === 'wrong' && <p className="text-sm">Jawaban belum tepat. Nantikan ronde kejutan berikutnya!</p>}
                {result.result === 'late' && <p className="text-sm">Jawaban benar, tapi kuota hadiah sudah habis (atau email belum terverifikasi).</p>}
              </div>
            ) : busy && !qs.length ? <p className="py-6 text-center text-sm">Menyiapkan soal…</p> : (
              <div className="space-y-4">
                {qs.map((q, i) => (
                  <div key={i}>
                    <p className="mb-2 text-sm font-semibold">{i + 1}. {q.q}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map((o, j) => (
                        <button key={j} type="button" onClick={() => setPicks(p => p.map((v, k) => k === i ? j : v))} className={`rounded-xl border px-2 py-2 text-xs font-medium transition ${picks[i] === j ? 'border-primary bg-primary/15 text-primary' : 'border-border/60 bg-card/40 hover:border-primary/50'}`}>{o}</button>
                      ))}
                    </div>
                  </div>
                ))}
                {qs.length > 0 && <button type="button" disabled={busy || picks.some(p => p < 0)} onClick={submit} className="w-full rounded-full bg-primary py-2.5 text-sm font-black text-primary-foreground disabled:opacity-50">{busy ? 'Memeriksa…' : 'Kirim Jawaban'}</button>}
              </div>
            )}
            {err && <p className="mt-3 text-center text-xs text-destructive">{err}</p>}
            <p className="mt-3 text-center text-[10px] text-muted-foreground">Hadiah promo dari anggaran Marketing & Community, bukan imbal hasil investasi.</p>
          </div>
        </div>
      )}
    </>
  );
}
