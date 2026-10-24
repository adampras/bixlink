import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from '@tanstack/react-router';
import { Crown, Gamepad2, Gift, Layers, ShieldCheck, Sparkles, Users, X, Zap } from 'lucide-react';

const KEY = 'bixlink-member-welcome:';

/** One-time welcome for a signed-in member: 100 BIXP bonus + how to earn BIXP + staking & presale overview. */
export function MemberWelcome({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try { if (localStorage.getItem(KEY + userId)) return; } catch { return; }
    const t = window.setTimeout(() => setOpen(true), 1200);
    return () => window.clearTimeout(t);
  }, [userId]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', esc);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', esc); };
  }, [open]);
  const close = () => { try { localStorage.setItem(KEY + userId, '1'); } catch { /* ignore */ } setOpen(false); };
  if (!open || typeof document === 'undefined') return null;

  const earn = [
    { Icon: Gift, t: 'Bonus sambutan', d: '100 BIXP otomatis, satu kali per akun terverifikasi.' },
    { Icon: Gamepad2, t: 'Misi Fox Arena', d: 'Klaim misi harian & sosial di menu Arena.' },
    { Icon: Users, t: 'Aktivitas komunitas', d: 'Kampanye resmi terverifikasi sesuai batas akun.' },
  ];

  return createPortal(<div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 p-3 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="mw-title" onClick={close}>
    <div onClick={e => e.stopPropagation()} className="relative w-full max-w-[520px] rounded-3xl bg-gradient-to-br from-chart-3 via-primary/60 to-chart-3 p-px shadow-2xl animate-in fade-in zoom-in-95 duration-300">
      <div className="max-h-[88vh] overflow-y-auto rounded-3xl bg-card px-5 pb-5 pt-6 text-card-foreground">
        <button type="button" onClick={close} aria-label="Tutup" className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border border-border bg-background/70 text-muted-foreground hover:text-foreground"><X size={16}/></button>

        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-chart-3/50 bg-chart-3/10 px-3 py-1 text-[10px] font-bold tracking-[0.18em] text-chart-3"><Sparkles size={11}/> GENESIS ONBOARDING</span>
          <h2 id="mw-title" className="mt-3 font-display text-2xl font-black leading-tight">Selamat Bergabung di <span className="text-chart-3">BIXLINK</span></h2>
          <p className="mt-1.5 text-xs text-muted-foreground">Akun Anda aktif. Berikut hadiah sambutan dan panduan singkat ekosistem.</p>
        </div>

        <div className="relative mx-auto mt-5 overflow-hidden rounded-2xl border border-chart-3/50 bg-gradient-to-br from-chart-3/20 via-card to-primary/15 p-4 text-center">
          <div className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">WELCOME BONUS</div>
          <div className="numeric mt-1 font-display text-5xl font-black text-chart-3">100 <small className="text-lg">BIXP</small></div>
          <p className="mt-1 text-[11px] text-muted-foreground">Tercatat di Profil · poin promo ekosistem, bukan BIX on-chain</p>
        </div>

        <h3 className="mt-5 text-[11px] font-bold tracking-[0.16em] text-primary">CARA MENDAPATKAN BIXP</h3>
        <div className="mt-2 grid gap-2">{earn.map(({ Icon, t, d }) => <div key={t} className="flex items-start gap-3 rounded-xl border border-border bg-background/40 p-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary"><Icon size={16}/></span>
          <div className="min-w-0"><b className="text-sm">{t}</b><p className="text-[11px] leading-snug text-muted-foreground">{d}</p></div>
        </div>)}</div>

        <h3 className="mt-5 text-[11px] font-bold tracking-[0.16em] text-chart-3">KEUNTUNGAN GANDA · STAKING + PRESALE</h3>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-3">
            <div className="flex items-center gap-2 text-sm font-bold"><Layers size={15} className="text-primary"/> Staking</div>
            <ul className="mt-1.5 grid gap-1 text-[11px] leading-snug text-muted-foreground">
              <li>• Pilih paket & tenor kontrak non-custodial</li>
              <li>• Proyeksi yield harian transparan</li>
              <li>• Booster dibagi 70% BIX / 30% USDT</li>
              <li>• Sertifikat NFT sesuai tingkat paket</li>
            </ul>
          </div>
          <div className="rounded-xl border border-chart-3/40 bg-chart-3/5 p-3">
            <div className="flex items-center gap-2 text-sm font-bold"><Crown size={15} className="text-chart-3"/> Presale</div>
            <ul className="mt-1.5 grid gap-1 text-[11px] leading-snug text-muted-foreground">
              <li>• Harga tahap awal sebelum fase publik</li>
              <li>• Alokasi BIX tercatat saat pembelian</li>
              <li>• Bonus sponsor untuk referral langsung</li>
              <li>• Dibuka/ditutup oleh Admin</li>
            </ul>
          </div>
        </div>
        <p className="mt-2 flex gap-1.5 rounded-lg bg-muted/40 p-2 text-[11px] leading-snug"><Zap size={13} className="mt-0.5 shrink-0 text-chart-3"/> Gabungkan proyeksi yield Staking dengan alokasi harga awal Presale untuk dua sumber nilai sekaligus.</p>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <Link to="/stake" onClick={close} className="rounded-xl bg-primary px-2 py-2.5 text-center text-xs font-bold text-primary-foreground">Staking</Link>
          <Link to="/presale" onClick={close} className="rounded-xl bg-chart-3 px-2 py-2.5 text-center text-xs font-bold text-background">Presale</Link>
          <Link to="/arena" onClick={close} className="rounded-xl border border-border px-2 py-2.5 text-center text-xs font-bold">Fox Arena</Link>
        </div>
        <button type="button" onClick={close} className="mt-2 w-full py-1.5 text-xs text-muted-foreground hover:text-foreground">Nanti saja</button>
        <p className="mt-2 flex gap-1.5 text-[10px] leading-snug text-muted-foreground"><ShieldCheck size={12} className="shrink-0"/> Tidak ada jaminan profit. APY dan reward adalah proyeksi; BIXP adalah poin promo dan konversinya hanya jika dibuka Admin.</p>
      </div>
    </div>
  </div>, document.body);
}
