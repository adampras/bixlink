import { useEffect, useState } from 'react';
import { BadgeCheck, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

type F = { full_name: string; birth_date: string; gender: string; country: string; city: string; phone: string; address: string };
const EMPTY: F = { full_name: '', birth_date: '', gender: '', country: '', city: '', phone: '', address: '' };

/** Member personal data (own row only via RLS); feeds the Exchanger readiness badge. */
export function IdentityProfileForm({ userId }: { userId?: string | undefined }) {
  const [f, setF] = useState<F>(EMPTY);
  const [saved, setSaved] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!userId) return;
    supabase.from('bix_identity_profiles').select('*').eq('user_id', userId).maybeSingle().then(({ data }) => {
      if (data) { setSaved(true); setF({ full_name: data.full_name ?? '', birth_date: data.birth_date ?? '', gender: data.gender ?? '', country: data.country ?? '', city: data.city ?? '', phone: data.phone ?? '', address: data.address ?? '' }); }
    });
  }, [userId]);
  if (!userId) return null;
  const set = (k: keyof F) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF(v => ({ ...v, [k]: e.target.value }));
  const save = async () => {
    setMsg('');
    if (f.full_name.trim().length < 3) return setMsg('Nama lengkap minimal 3 huruf.');
    setBusy(true);
    const { error } = await supabase.from('bix_identity_profiles').upsert({ user_id: userId, full_name: f.full_name.trim(), birth_date: f.birth_date || null, gender: f.gender || null, country: f.country.trim() || null, city: f.city.trim() || null, phone: f.phone.trim() || null, address: f.address.trim() || null, updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) return setMsg('Gagal menyimpan. Periksa data lalu coba lagi.');
    setSaved(true); setMsg('Data diri tersimpan ✓');
  };
  const done = [f.full_name, f.birth_date, f.gender, f.country, f.city, f.phone].filter(Boolean).length;
  return <div className="id-form grid gap-2">
    <div className="flex items-center justify-between text-xs"><span className="font-bold">{saved ? <><BadgeCheck size={13} className="mr-1 inline text-chart-2"/>Data tersimpan</> : 'Belum lengkap'}</span><span className="numeric text-muted-foreground">{done}/6 terisi</span></div>
    <div className="h-1.5 overflow-hidden rounded-full bg-muted"><i className="block h-full bg-primary transition-all" style={{ width: `${(done / 6) * 100}%` }}/></div>
    <input className="form-input" placeholder="Nama lengkap sesuai KTP/Paspor" value={f.full_name} onChange={set('full_name')}/>
    <div className="grid grid-cols-2 gap-2">
      <input className="form-input" type="date" aria-label="Tanggal lahir" value={f.birth_date} onChange={set('birth_date')}/>
      <select className="form-input" aria-label="Jenis kelamin" value={f.gender} onChange={set('gender')}><option value="">Jenis kelamin</option><option value="male">Laki-laki</option><option value="female">Perempuan</option><option value="other">Lainnya</option></select>
      <input className="form-input" placeholder="Negara" value={f.country} onChange={set('country')}/>
      <input className="form-input" placeholder="Kota" value={f.city} onChange={set('city')}/>
    </div>
    <input className="form-input" inputMode="tel" placeholder="No. WhatsApp aktif" value={f.phone} onChange={set('phone')}/>
    <input className="form-input" placeholder="Alamat (opsional)" value={f.address} onChange={set('address')}/>
    {msg && <p className={`text-xs ${msg.includes('✓') ? 'text-chart-2' : 'text-destructive'}`}>{msg}</p>}
    <Button type="button" disabled={busy} onClick={save} className="h-11 rounded-full bg-primary font-black text-primary-foreground"><Save size={15}/>{busy ? 'Menyimpan…' : 'Simpan data diri'}</Button>
  </div>;
}
