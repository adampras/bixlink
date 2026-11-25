import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMember } from "@/lib/useMember";
import { BixZoomLogo } from "@/components/BixZoom";
import { ZoomRoom } from "@/components/BixZoomRoom";
import { Video, Plus, CalendarDays, MonitorUp, Trash2 } from "lucide-react";

export const Route = createFileRoute("/studio")({
  validateSearch: z.object({ room: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "BIXZOOM — Video Meeting BIXLINK" },
      { name: "description", content: "Rapat video BIXZOOM: buat, gabung, jadwalkan rapat dan bagikan layar langsung di BIXLINK." },
      { property: "og:title", content: "BIXZOOM — Video Meeting BIXLINK" },
      { property: "og:description", content: "Rapat video multi-peserta dengan share screen, chat dan mode melayang." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Zoom,
});

const ABC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => ABC[b % 32]).join("");
type Sched = { code: string; title: string; at: string };

function Zoom() {
  const { room } = Route.useSearch();
  const { user } = useMember();
  const [active, setActive] = useState<{ code: string; share: boolean } | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [sched, setSched] = useState<Sched[]>([]);
  const [form, setForm] = useState<{ title: string; at: string } | null>(null);
  useEffect(() => { try { setSched(JSON.parse(localStorage.getItem("bixzoom-sched") ?? "[]")); } catch { /* */ } }, []);
  useEffect(() => { if (room && /^[A-Z0-9]{6}$/.test(room.toUpperCase())) setCode(room.toUpperCase()); }, [room]);
  const saveSched = (s: Sched[]) => { setSched(s); localStorage.setItem("bixzoom-sched", JSON.stringify(s)); };

  const create = async (title: string): Promise<string | null> => {
    if (!user) { setMsg("Masuk akun dulu."); return null; }
    setBusy(true); setMsg("");
    const c = newCode();
    const { error } = await supabase.from("bix_call_rooms").insert({ host_id: user.id, title: title.slice(0, 60), code: c, video: true });
    setBusy(false);
    if (error) { setMsg("Gagal membuat rapat. Pastikan tier BIX CALL aktif."); return null; }
    return c;
  };
  const start = async (share: boolean) => { const c = await create("BIXZOOM Meeting"); if (c) setActive({ code: c, share }); };

  if (active && user) return <ZoomRoom code={active.code} me={user.id} startShare={active.share} onLeave={() => setActive(null)} />;

  const tiles = [
    { icon: Video, t: "New Meeting", c: "bg-[#ff7a1a]", on: () => void start(false) },
    { icon: Plus, t: "Join", c: "bg-primary", on: () => document.getElementById("zoom-code")?.focus() },
    { icon: CalendarDays, t: "Schedule", c: "bg-primary", on: () => setForm({ title: "", at: "" }) },
    { icon: MonitorUp, t: "Share Screen", c: "bg-primary", on: () => void start(true) },
  ];
  return (
    <main className="mx-auto max-w-xl space-y-5 px-4 py-6">
      <Link to="/" className="text-xs text-muted-foreground">← BIXLINK</Link>
      <header className="flex items-center gap-3"><BixZoomLogo size={40} /><div><h1 className="text-xl font-black tracking-wider text-primary">BIXZOOM</h1><p className="text-xs text-muted-foreground">Rapat video langsung di BIXLINK</p></div></header>
      {!user && <p className="rounded-xl border border-border p-3 text-sm">Silakan <Link to="/auth" className="font-bold text-primary underline">masuk</Link> untuk memulai atau bergabung rapat.</p>}
      <div className="grid grid-cols-4 gap-2">
        {tiles.map((x) => (
          <button key={x.t} type="button" disabled={busy || !user} onClick={x.on} className="flex flex-col items-center gap-1.5 disabled:opacity-50">
            <span className={`grid h-14 w-14 place-items-center rounded-2xl text-primary-foreground ${x.c}`}><x.icon size={24} /></span>
            <span className="text-[11px] font-semibold">{x.t}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-2 rounded-2xl border border-border bg-card p-3">
        <input id="zoom-code" className="h-11 flex-1 rounded-lg border border-input bg-background px-3 font-mono tracking-widest" placeholder="Meeting ID (6 karakter)" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} />
        <button type="button" disabled={code.length !== 6 || !user} onClick={() => setActive({ code, share: false })} className="rounded-lg bg-primary px-4 font-bold text-primary-foreground disabled:opacity-50">Join</button>
      </div>
      {msg && <p className="text-sm text-destructive">{msg}</p>}
      {form && (
        <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
          <b className="text-sm">Jadwalkan rapat</b>
          <input className="h-11 w-full rounded-lg border border-input bg-background px-3" placeholder="Judul rapat" maxLength={60} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input type="datetime-local" className="h-11 w-full rounded-lg border border-input bg-background px-3" value={form.at} onChange={(e) => setForm({ ...form, at: e.target.value })} />
          <div className="flex gap-2">
            <button type="button" className="flex-1 rounded-lg border border-border py-2" onClick={() => setForm(null)}>Batal</button>
            <button type="button" disabled={form.title.trim().length < 2 || !form.at || busy} className="flex-1 rounded-lg bg-primary py-2 font-bold text-primary-foreground disabled:opacity-50" onClick={async () => { const c = await create(form.title.trim()); if (c) { saveSched([{ code: c, title: form.title.trim(), at: form.at }, ...sched].slice(0, 20)); setForm(null); } }}>Simpan</button>
          </div>
        </div>
      )}
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-muted-foreground">Rapat terjadwal</h2>
        {sched.length === 0 && <p className="text-xs text-muted-foreground">Belum ada rapat terjadwal.</p>}
        {sched.map((s) => (
          <div key={s.code} className="flex items-center gap-2 rounded-xl border border-border bg-card p-3">
            <div className="flex-1"><b className="block text-sm">{s.title}</b><small className="text-xs text-muted-foreground">{new Date(s.at).toLocaleString("id-ID")} · ID {s.code}</small></div>
            <button type="button" className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground" onClick={() => setActive({ code: s.code, share: false })}>Mulai</button>
            <button type="button" aria-label="Hapus" onClick={() => saveSched(sched.filter((x) => x.code !== s.code))}><Trash2 size={16} /></button>
          </div>
        ))}
      </section>
    </main>
  );
}
