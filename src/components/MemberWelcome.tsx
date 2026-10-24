import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useQueryClient } from '@tanstack/react-query';
import { Crown, Gamepad2, Gift, Layers, ShieldCheck, Sparkles, Users, X, Zap } from 'lucide-react';
import { claimQuest } from '@/lib/arena.functions';

const KEY = 'bixlink-member-welcome:';

const CSS = `
@keyframes mwSweep{0%{transform:translateX(-120%) skewX(-20deg)}60%,100%{transform:translateX(320%) skewX(-20deg)}}
@keyframes mwRise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes mwPulse{0%,100%{box-shadow:0 0 0 0 color-mix(in oklab,var(--chart-3) 55%,transparent)}50%{box-shadow:0 0 22px 2px color-mix(in oklab,var(--chart-3) 45%,transparent)}}
.mw-sweep{position:relative;overflow:hidden}.mw-sweep::after{content:'';position:absolute;inset:0 auto 0 0;width:35%;background:linear-gradient(90deg,transparent,color-mix(in oklab,var(--foreground) 35%,transparent),transparent);animation:mwSweep 3.2s ease-in-out infinite}
.mw-rise{animation:mwRise .5s ease-out both}.mw-pulse{animation:mwPulse 2.2s ease-in-out infinite}
.mw-corner{position:absolute;width:18px;height:18px;border-color:var(--chart-3)}
`;

/** One-time welcome for a signed-in member: claim 100 BIXP + how to earn BIXP + staking & presale overview. */
export function MemberWelcome({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const claim = useServerFn(claimQuest);
  const navigate = useNavigate();
  const qc = useQueryClient();
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

  const onClaim = async () => {
    setBusy(true); setMsg('');
    try { await claim({ data: { key: 'welcome' } }); }
    catch { /* already credited automatically at verification — still open the balance */ }
    await qc.invalidateQueries();
    setBusy(false); close();
    navigate({ to: '/profile', hash: 'bixp' });
  };

  if (!open || typeof document === 'undefined') return null;

  const earn = [
    { Icon: Gift, t: 'Bonus sambutan', d: '100 BIXP satu kali per akun terverifikasi.' },
    { Icon: Gamepad2, t: 'Misi Fox Arena', d: 'Klaim misi harian & sosial di menu Arena.' },
    { Icon: Users, t: 'Aktivitas komunitas', d: 'Kampanye resmi sesuai batas akun.' },
  ];

  return createPortal(<div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 p-3 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="mw-title" onClick={close}>
    <style>{CSS}</style>
    <div onClick={e => e.stopPropagation()} className="relative w-full max-w-[460px] border-2 border-chart-3 bg-background shadow-[0_0_40px_-8px_var(--chart-3)] animate-in fade-in zoom-in-95 duration-300">
      <span className="mw-corner -left-1 -top-1 border-l-4 border-t-4"/><span className="mw-corner -right-1 -top-1 border-r-4 border-t-4"/>
      <span className="mw-corner -bottom-1 -left-1 border-b-4 border-l-4"/><span className="mw-corner -bottom-1 -right-1 border-b-4 border-r-4"/>
      <div className="h-1 w-full bg-gradient-to-r from-primary via-chart-3 to-primary"/>
      <div className="max-h-[86vh] overflow-y-auto px-4 pb-4 pt-5 text-foreground">
        <button type="button" onClick={close} aria-label="Tutup" className="absolute right-3 top-4 grid h-8 w-8 place-items-center border border-chart-3/60 bg-card text-foreground"><X size={16}/></button>

        <div className="mw-rise text-center">
          <span className="inline-flex items-center gap-1.5 border border-chart-3 bg-chart-3/15 px-3 py-1 text-[10px] font-black tracking-[0.2em] text-chart-3"><Sparkles size={11}/> GENESIS ONBOARDING</span>
          <h2 id="mw-title" className="mt-3 font-display text-2xl font-black leading-tight text-foreground">Selamat Bergabung di <span className="text-chart-3">BIXLINK</span></h2>
          <p className="mt-1.5 text-xs text-foreground/85">Akun Anda aktif. Klaim hadiah sambutan dan pelajari ekosistem.</p>
        </div>

        <div className="mw-sweep mw-rise mt-4 border-2 border-chart-3 bg-gradient-to-br from-chart-3/30 via-card to-primary/25 p-4 text-center" style={{ animationDelay: '.1s' }}>
          <div className="text-[10px] font-black tracking-[0.25em] text-foreground">WELCOME BONUS</div>
          <div className="numeric mt-1 font-display text-6xl font-black text-chart-3 drop-shadow-[0_0_12px_var(--chart-3)]">100 <small className="text-xl">BIXP</small></div>
          <button type="button" disabled={busy} onClick={onClaim} className="mw-pulse mt-3 w-full bg-chart-3 py-3 text-sm font-black tracking-wider text-background disabled:opacity-60">{busy ? 'MEMPROSES…' : 'KLAIM 100 BIXP SEKARANG'}</button>
          {msg && <p className="mt-2 text-xs">{msg}</p>}
          <p className="mt-2 text-[11px] text-foreground/80">Langsung menuju saldo BIXP di Profil · poin promo, bukan BIX on-chain</p>
        </div>

        <h3 className="mt-5 flex items-center gap-2 text-[11px] font-black tracking-[0.18em] text-primary"><span className="h-3 w-1 bg-primary"/>CARA MENDAPATKAN BIXP</h3>
        <div className="mt-2 grid grid-cols-3 gap-2">{earn.map(({ Icon, t, d }, i) => <div key={t} className="mw-rise border border-primary/60 bg-card p-2.5 text-center" style={{ animationDelay: `${.2 + i * .08}s` }}>
          <span className="mx-auto grid h-9 w-9 place-items-center border border-primary bg-primary/20 text-primary shadow-[0_0_14px_-2px_var(--primary)]"><Icon size={17}/></span>
          <b className="mt-1.5 block text-[12px] leading-tight">{t}</b><p className="mt-1 text-[10px] leading-snug text-foreground/80">{d}</p>
        </div>)}</div>

        <h3 className="mt-5 flex items-center gap-2 text-[11px] font-black tracking-[0.18em] text-chart-3"><span className="h-3 w-1 bg-chart-3"/>KEUNTUNGAN GANDA · STAKING + PRESALE</h3>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="mw-rise border border-primary bg-primary/10 p-3" style={{ animationDelay: '.45s' }}>
            <div className="flex items-center gap-2 text-sm font-black"><Layers size={15} className="text-primary"/> Staking</div>
            <ul className="mt-1.5 grid gap-1 text-[11px] leading-snug text-foreground/90">
              <li>• Paket & tenor non-custodial</li><li>• Proyeksi yield harian</li><li>• Booster 70% BIX / 30% USDT</li><li>• Sertifikat NFT per tingkat</li>
            </ul>
          </div>
          <div className="mw-rise border border-chart-3 bg-chart-3/10 p-3" style={{ animationDelay: '.55s' }}>
            <div className="flex items-center gap-2 text-sm font-black"><Crown size={15} className="text-chart-3"/> Presale</div>
            <ul className="mt-1.5 grid gap-1 text-[11px] leading-snug text-foreground/90">
              <li>• Harga tahap awal</li><li>• Alokasi BIX tercatat</li><li>• Bonus sponsor referral</li><li>• Dibuka/ditutup Admin</li>
            </ul>
          </div>
        </div>
        <p className="mt-2 flex gap-1.5 border-l-2 border-chart-3 bg-card p-2 text-[11px] leading-snug"><Zap size={13} className="mt-0.5 shrink-0 text-chart-3"/> Gabungkan proyeksi yield Staking dengan harga awal Presale untuk dua sumber nilai.</p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Link to="/stake" onClick={close} className="bg-primary py-2.5 text-center text-xs font-black text-primary-foreground">Staking</Link>
          <Link to="/presale" onClick={close} className="border border-chart-3 py-2.5 text-center text-xs font-black text-chart-3">Presale</Link>
          <Link to="/arena" onClick={close} className="border border-foreground/40 py-2.5 text-center text-xs font-black">Fox Arena</Link>
        </div>
        <button type="button" onClick={close} className="mt-2 w-full py-1.5 text-xs text-foreground/70">Nanti saja</button>
        <p className="mt-1 flex gap-1.5 text-[10px] leading-snug text-foreground/70"><ShieldCheck size={12} className="shrink-0"/> Tidak ada jaminan profit. APY dan reward adalah proyeksi; konversi BIXP hanya jika dibuka Admin.</p>
      </div>
    </div>
  </div>, document.body);
}
