import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type StudioFeature = "banner" | "poster" | "presentation" | "video";
const LABEL: Record<StudioFeature, string> = { banner: "Banner", poster: "Poster HD", presentation: "Presentasi bersuara", video: "Video" };
const FEATURES = Object.keys(LABEL) as StudioFeature[];

type Status = { open: boolean; enabled: boolean; members_enabled: boolean; is_owner: boolean; balance: number; used_today: number; daily_limit: number; credit_usd: number; prices: Record<string, number>; features: Record<string, boolean> };
type Ctx = { status: Status | null; charge: (f: StudioFeature) => Promise<boolean>; reload: () => void };
const StudioCtx = createContext<Ctx>({ status: null, charge: async () => false, reload: () => {} });
export const useStudio = () => useContext(StudioCtx);

export function StudioProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const reload = async () => {
    const { data: u } = await supabase.auth.getUser();
    setSignedIn(!!u.user);
    if (!u.user) return;
    const { data } = await supabase.rpc("bix_studio_status");
    setStatus(data as unknown as Status);
  };
  useEffect(() => { void reload(); }, []);
  const charge = async (f: StudioFeature) => {
    if (!status) return false;
    if (status.is_owner) return true;
    const price = status.prices[f] ?? 0;
    if (!window.confirm(`${LABEL[f]} memakai ${price} Studio Credit. Saldo Anda ${status.balance}. Lanjutkan?`)) return false;
    const { error } = await supabase.rpc("bix_studio_spend", { p_feature: f });
    if (error) { window.alert(error.message); return false; }
    await reload();
    return true;
  };
  if (signedIn === false) return <Gate text="Masuk ke akun BIXLINK untuk memakai BIX Studio." />;
  if (!status) return <Gate text="Memuat BIX Studio…" />;
  if (!status.open) return <Gate text="BIX Studio sedang ditutup oleh Owner. Silakan kembali nanti." />;
  return <StudioCtx.Provider value={{ status, charge, reload: () => void reload() }}>{children}</StudioCtx.Provider>;
}

function Gate({ text }: { text: string }) {
  return <div className="rounded-2xl border border-primary/30 bg-card/60 p-6 text-center text-sm text-muted-foreground">{text}</div>;
}

export function StudioWalletBar() {
  const { status } = useStudio();
  if (!status) return null;
  return (
    <section className="rounded-2xl border border-primary/30 bg-card/60 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold tracking-[.3em] text-muted-foreground">STUDIO CREDIT</div>
          <div className="text-2xl font-black tabular-nums text-primary">{status.is_owner ? "Owner · tanpa batas" : status.balance.toLocaleString()}</div>
        </div>
        {!status.is_owner && <div className="text-xs text-muted-foreground">Dipakai hari ini {status.used_today}/{status.daily_limit}</div>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {FEATURES.filter((f) => status.features[f]).map((f) => <span key={f} className="rounded-full border border-border px-3 py-1">{LABEL[f]} · {status.prices[f] ?? 0} kredit</span>)}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">Studio Credit hanya hak memakai layanan kreatif BIX Studio. Bukan BIX, USDT, saldo staking, atau aset bernilai, dan tidak dapat ditarik. Hubungi Owner untuk membeli paket kredit.</p>
    </section>
  );
}

type Report = { config: Status & { costs: Record<string, number> }; sold_credits: number; paid_usd: number; used_credits: number; cost_credits: number; recent: { id: string; kind: string; feature: string | null; credits: number; paid_usd: number; created_at: string; code: string | null; refunded: boolean }[] };

export function StudioOwnerPanel() {
  const { status, reload } = useStudio();
  const [r, setR] = useState<Report | null>(null);
  const [cfg, setCfg] = useState<Report["config"] | null>(null);
  const [g, setG] = useState({ code: "", credits: "100", paid: "5", note: "" });
  const [msg, setMsg] = useState("");
  const load = async () => {
    const { data, error } = await supabase.rpc("bix_studio_report");
    if (error) return setMsg(error.message);
    const rep = data as unknown as Report; setR(rep); setCfg(rep.config);
  };
  useEffect(() => { if (status?.is_owner) void load(); }, [status?.is_owner]);
  if (!status?.is_owner || !r || !cfg) return null;
  const save = async () => {
    const { error } = await supabase.rpc("bix_studio_save", { p: cfg as unknown as Json });
    setMsg(error ? error.message : "Pengaturan Studio disimpan."); reload(); void load();
  };
  const grant = async () => {
    const { error } = await supabase.rpc("bix_studio_grant", { p_code: g.code, p_credits: Number(g.credits), p_paid_usd: Number(g.paid), p_note: g.note });
    setMsg(error ? error.message : `Kredit ditambahkan ke ${g.code}.`); if (!error) { setG({ ...g, code: "", note: "" }); void load(); }
  };
  const refund = async (id: string) => { const { error } = await supabase.rpc("bix_studio_refund", { p_entry: id }); setMsg(error ? error.message : "Kredit dikembalikan."); void load(); };
  const margin = r.used_credits - r.cost_credits;
  const setMap = (k: "prices" | "costs", f: string, v: string) => setCfg({ ...cfg, [k]: { ...cfg[k], [f]: Math.max(0, Math.round(Number(v) || 0)) } });
  return (
    <section className="space-y-4 rounded-2xl border border-primary/40 bg-card/70 p-4">
      <h2 className="text-lg font-black text-primary">KONTROL OWNER · STUDIO</h2>
      {msg && <p className="text-xs text-primary">{msg}</p>}
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        {[["Kredit terjual", r.sold_credits], ["Kas diterima", `$${Number(r.paid_usd).toFixed(2)}`], ["Kredit dipakai", r.used_credits], ["Estimasi margin", `${margin} kredit ≈ $${(margin * cfg.credit_usd).toFixed(2)}`]].map(([k, v]) => (
          <div key={k as string} className="rounded-xl border border-border p-3"><div className="text-muted-foreground">{k}</div><div className="font-bold tabular-nums">{v}</div></div>
        ))}
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={cfg.enabled} onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })} /> Studio dibuka</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={cfg.members_enabled} onChange={(e) => setCfg({ ...cfg, members_enabled: e.target.checked })} /> Member boleh memakai</label>
      </div>
      <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr className="text-muted-foreground"><th className="text-left">Fitur</th><th>Aktif</th><th>Harga</th><th>Biaya internal</th></tr></thead><tbody>
        {FEATURES.map((f) => <tr key={f}><td className="py-1">{LABEL[f]}</td><td className="text-center"><input type="checkbox" checked={!!cfg.features[f]} onChange={(e) => setCfg({ ...cfg, features: { ...cfg.features, [f]: e.target.checked } })} /></td>
          <td><Input type="number" min={0} value={cfg.prices[f] ?? 0} onChange={(e) => setMap("prices", f, e.target.value)} /></td>
          <td><Input type="number" min={0} value={cfg.costs[f] ?? 0} onChange={(e) => setMap("costs", f, e.target.value)} /></td></tr>)}
      </tbody></table></div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <label>Batas pemakaian/hari<Input type="number" min={0} value={cfg.daily_limit} onChange={(e) => setCfg({ ...cfg, daily_limit: Number(e.target.value) })} /></label>
        <label>Nilai 1 kredit (USD)<Input type="number" min={0} step="0.01" value={cfg.credit_usd} onChange={(e) => setCfg({ ...cfg, credit_usd: Number(e.target.value) })} /></label>
      </div>
      <Button onClick={save} className="w-full">Simpan pengaturan</Button>
      <div className="space-y-2 border-t border-border pt-3">
        <div className="text-sm font-bold">Tambah kredit setelah pembayaran diverifikasi</div>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Kode member" value={g.code} onChange={(e) => setG({ ...g, code: e.target.value })} />
          <Input type="number" placeholder="Kredit" value={g.credits} onChange={(e) => setG({ ...g, credits: e.target.value })} />
          <Input type="number" placeholder="Dibayar (USD)" value={g.paid} onChange={(e) => setG({ ...g, paid: e.target.value })} />
          <Input placeholder="Catatan / TxID" value={g.note} onChange={(e) => setG({ ...g, note: e.target.value })} />
        </div>
        <Button variant="outline" onClick={grant} disabled={!g.code} className="w-full">Tambah kredit</Button>
      </div>
      <div className="space-y-1 border-t border-border pt-3 text-xs">
        <div className="text-sm font-bold">Riwayat terbaru</div>
        {r.recent.map((x) => <div key={x.id} className="flex items-center justify-between gap-2"><span>{x.code ?? "—"} · {x.kind} {x.feature ?? ""} · <b className="tabular-nums">{x.credits > 0 ? "+" : ""}{x.credits}</b></span>
          {x.kind === "spend" && !x.refunded && <button className="text-primary underline" onClick={() => refund(x.id)}>Refund</button>}</div>)}
      </div>
    </section>
  );
}
