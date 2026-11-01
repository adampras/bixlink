import { Link } from '@tanstack/react-router';
import { Construction } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LandingClosed({ message }: { message?: string | undefined }) {
  return <main className="mx-auto flex min-h-[72vh] max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
    <div className="grid h-20 w-20 place-items-center rounded-full border border-primary/40 bg-card shadow-[0_0_40px_-10px_hsl(var(--primary))]"><Construction className="text-primary" size={34}/></div>
    <div className="eyebrow mt-7">UNDER RECONSTRUCTION</div>
    <h1 className="section-title mt-3">BIXLINK <span>SEGERA KEMBALI</span></h1>
    <p className="mt-4 text-sm leading-6 text-muted-foreground">{message || 'Halaman depan BIXLINK sedang diperbarui. Member tetap bisa masuk ke akun seperti biasa.'}</p>
    <Button asChild className="mt-8 rounded-full px-8"><Link to="/auth">Masuk Akun</Link></Button>
  </main>;
}
