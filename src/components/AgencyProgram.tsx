import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Globe2, Building2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { agencyAmountValid, normalizeAgency, type AgencyApplication } from '@/lib/agency';

const usd = (n: number) => `$${Number(n).toLocaleString('en-US')}`;

export function AgencyProgram({ userId }: { userId?: string | undefined }) {
  const qc = useQueryClient();
  const cfgQ = useQuery({ queryKey: ['agency-config'], queryFn: async () => normalizeAgency((await supabase.rpc('bix_agency_config')).data) });
  const mine = useQuery({ queryKey: ['agency-mine', userId], enabled: !!userId, queryFn: async () => ((await supabase.from('bix_agency_applications').select('*').eq('user_id', userId!).order('created_at', { ascending: false }).limit(1)).data ?? [])[0] as AgencyApplication | undefined });
  const [tier, setTier] = useState<'national' | 'city'>('city');
  const [country, setCountry] = useState(''); const [city, setCity] = useState(''); const [contact, setContact] = useState('');
  const [amount, setAmount] = useState('');
  const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const cfg = cfgQ.data;
  if (!cfg?.enabled) return null;
  const t = cfg[tier];
  const amt = Number(amount);
  const submit = async () => {
    setMsg('');
    if (!agencyAmountValid(cfg, tier, amt)) { setMsg(`Komitmen harus antara ${usd(t.minUsd)} – ${usd(t.maxUsd)}.`); return; }
    setBusy(true);
    const { error } = await supabase.rpc('bix_agency_apply', { p_tier: tier, p_country: country, p_city: city, p_contact: contact, p_usd: amt });
    setBusy(false);
    if (error) { setMsg(error.message); return; }
    setMsg('Pengajuan terkirim. Admin akan meninjau dan menerbitkan lisensi keagenan Anda.');
    await qc.invalidateQueries({ queryKey: ['agency-mine'] });
  };
  const input = 'w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm';
  const m = mine.data;
  return <section className="mt-10 rounded-2xl border border-chart-3/40 bg-card/70 p-5 sm:p-7">
    <div className="eyebrow text-chart-3">BIX REGIONAL AGENCY</div>
    <h2 className="mt-1 font-display text-2xl font-black">Become an Official Regional Agent</h2>
    <p className="mt-1 text-xs text-muted-foreground">Jalur khusus presale untuk perwakilan resmi BIXLINK di negara atau kota Anda. Pengajuan ditinjau Admin; tidak ada pembayaran otomatis dari formulir ini.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {(['national', 'city'] as const).filter(k => cfg[k].enabled).map(k => { const x = cfg[k]; const Icon = k === 'national' ? Globe2 : Building2; return <button key={k} type="button" onClick={() => setTier(k)} className={`rounded-xl border p-4 text-left transition ${tier === k ? 'border-chart-3 bg-chart-3/10' : 'border-border'}`}>
        <Icon className="text-chart-3" size={20}/>
        <div className="mt-2 font-display font-black">{k === 'national' ? 'National Sovereign Partner' : 'City Custody Hub'}</div>
        <div className="numeric mt-1 text-sm text-chart-3">{usd(x.minUsd)} – {usd(x.maxUsd)}</div>
        <div className="mt-1 text-[11px] text-muted-foreground">Agency override {x.overridePct}% · {k === 'national' ? `${x.perCountry ?? 1} slot / negara` : `${x.perCity ?? 3} slot / kota`}</div>
      </button>; })}
    </div>
    {m && (m.status === 'pending' || m.status === 'approved') ? <div className="mt-5 rounded-xl border border-chart-2/40 bg-chart-2/10 p-4 text-sm">
      <ShieldCheck className="text-chart-2"/>
      <p className="mt-2 font-bold">{m.status === 'approved' ? 'Lisensi keagenan aktif' : 'Pengajuan sedang ditinjau'}</p>
      <p className="numeric text-xs text-muted-foreground">{m.tier === 'national' ? 'National' : 'City'} · {m.country}{m.city ? ` · ${m.city}` : ''} · {usd(m.commitment_usd)}{m.license_no ? ` · ${m.license_no}` : ''}</p>
    </div> : userId ? <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <input className={input} placeholder="Negara" value={country} onChange={e => setCountry(e.target.value)} maxLength={60}/>
      {tier === 'city' && <input className={input} placeholder="Kota" value={city} onChange={e => setCity(e.target.value)} maxLength={60}/>}
      <input className={input} placeholder="WhatsApp / Telegram" value={contact} onChange={e => setContact(e.target.value)} maxLength={120}/>
      <input className={input} type="number" inputMode="decimal" placeholder={`Komitmen USD (${usd(t.minUsd)}–${usd(t.maxUsd)})`} value={amount} onChange={e => setAmount(e.target.value)}/>
      <Button disabled={busy} onClick={submit} className="rounded-full sm:col-span-2">Ajukan sebagai Agen</Button>
    </div> : <p className="mt-4 text-sm text-muted-foreground">Masuk untuk mengajukan keagenan.</p>}
    {msg && <p role="status" className="mt-3 text-sm text-chart-3">{msg}</p>}
  </section>;
}
