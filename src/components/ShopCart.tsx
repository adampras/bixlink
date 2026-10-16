import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Minus, Plus, ShoppingBag, Trash2, Truck, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { money } from '@/lib/bixlink';
import { COURIERS, cartSubtotal, cartUnits, shippingCost, type CartLine, type Region } from '@/lib/shipping';

export function ShopCart({ open, onClose, lines, setLines, userId, onOrdered }: { open: boolean; onClose: () => void; lines: CartLine[]; setLines: (l: CartLine[]) => void; userId?: string | undefined; onOrdered: () => void }) {
  const [step, setStep] = useState<'cart' | 'ship'>('cart');
  const [region, setRegion] = useState<Region>('local');
  const [courier, setCourier] = useState('jne-reg');
  const [form, setForm] = useState({ recipient: '', phone: '', address: '', city: '', country: 'Indonesia', postal_code: '' });
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const units = cartUnits(lines), subtotal = cartSubtotal(lines), ship = shippingCost(courier, units);
  const qty = (id: string, d: number) => setLines(lines.map(l => l.id === id ? { ...l, qty: Math.max(1, Math.min(99, l.qty + d)) } : l));
  const pickRegion = (r: Region) => { setRegion(r); setCourier(COURIERS.find(c => c.region === r)!.id); if (r === 'local') setForm(f => ({ ...f, country: 'Indonesia' })); };
  const submit = async () => {
    if (!userId) return;
    if (Object.values(form).some(v => !v.trim())) { toast.error('Complete all shipping fields'); return; }
    setBusy(true);
    const { error } = await supabase.from('bix_shop_orders').insert({ user_id: userId, items: lines, subtotal_usd: subtotal, region, courier: COURIERS.find(c => c.id === courier)!.name, shipping_usd: ship, ...Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim().slice(0, 300)])) as typeof form });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Order placed — awaiting store confirmation');
    setLines([]); setStep('cart'); onOrdered();
  };
  const field = (k: keyof typeof form, label: string) => <label className="grid gap-1 text-xs text-muted-foreground">{label}<input className="form-input" value={form[k]} maxLength={300} onChange={e => setForm({ ...form, [k]: e.target.value })} /></label>;
  return <div className="modal-backdrop" onClick={onClose}>
    <aside role="dialog" aria-modal="true" aria-label="Shopping cart" className="cart-drawer" onClick={e => e.stopPropagation()}>
      <header className="flex items-center justify-between border-b border-border pb-3"><h2 className="flex items-center gap-2 font-display text-lg font-bold"><ShoppingBag size={18} />{step === 'cart' ? `Cart · ${units}` : 'Shipping & checkout'}</h2><Button size="icon" variant="ghost" aria-label="Close cart" onClick={onClose}><X /></Button></header>
      {step === 'cart' ? <>
        <div className="flex-1 space-y-3 overflow-y-auto py-4">{lines.length ? lines.map(l => <div key={l.id} className="cart-line"><div className="min-w-0"><p className="truncate font-semibold">{l.name}</p><p className="numeric text-xs text-muted-foreground">{money(l.priceUsd)} each</p></div><div className="flex items-center gap-1"><Button size="icon" variant="outline" aria-label="Decrease" onClick={() => qty(l.id, -1)}><Minus size={14} /></Button><span className="numeric w-6 text-center">{l.qty}</span><Button size="icon" variant="outline" aria-label="Increase" onClick={() => qty(l.id, 1)}><Plus size={14} /></Button><Button size="icon" variant="ghost" aria-label="Remove" onClick={() => setLines(lines.filter(x => x.id !== l.id))}><Trash2 size={14} /></Button></div></div>) : <p className="py-10 text-center text-sm text-muted-foreground">Your cart is empty.</p>}</div>
        <footer className="space-y-3 border-t border-border pt-3"><div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><b className="numeric">{money(subtotal)}</b></div>{userId ? <Button className="w-full" disabled={!lines.length} onClick={() => setStep('ship')}><Truck size={16} />Continue to shipping</Button> : <Button asChild className="w-full"><Link to="/auth">Sign in to checkout</Link></Button>}</footer>
      </> : <>
        <div className="flex-1 space-y-4 overflow-y-auto py-4">
          <div className="grid grid-cols-2 gap-2">{(['local', 'international'] as Region[]).map(r => <Button key={r} variant={region === r ? 'default' : 'outline'} onClick={() => pickRegion(r)}>{r === 'local' ? 'Domestic' : 'International'}</Button>)}</div>
          <div className="grid gap-2">{COURIERS.filter(c => c.region === region).map(c => <label key={c.id} className={`courier-option ${courier === c.id ? 'is-active' : ''}`}><input type="radio" name="courier" checked={courier === c.id} onChange={() => setCourier(c.id)} /><span className="flex-1"><b>{c.name}</b><small className="block text-muted-foreground">{c.eta}</small></span><span className="numeric">{money(shippingCost(c.id, units))}</span></label>)}</div>
          <div className="grid gap-2">{field('recipient', 'Recipient name')}{field('phone', 'Phone / WhatsApp')}{field('address', 'Street address')}<div className="grid grid-cols-2 gap-2">{field('city', 'City')}{field('postal_code', 'Postal code')}</div>{field('country', 'Country')}</div>
        </div>
        <footer className="space-y-2 border-t border-border pt-3 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="numeric">{money(subtotal)}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Shipping (estimate)</span><span className="numeric">{money(ship)}</span></div><div className="flex justify-between text-base"><b>Total</b><b className="numeric">{money(subtotal + ship)}</b></div><p className="text-[11px] text-muted-foreground">The store confirms your order and sends payment instructions. No payment is charged here.</p><div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => setStep('cart')}>Back</Button><Button disabled={busy} onClick={submit}>{busy ? 'Placing…' : 'Place order'}</Button></div></footer>
      </>}
    </aside>
  </div>;
}
