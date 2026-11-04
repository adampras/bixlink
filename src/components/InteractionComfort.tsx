import { useEffect, useState } from 'react';
import { useLocation } from '@tanstack/react-router';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePublicConfig } from '@/lib/useMember';
import { touchEffectsEnabled } from '@/lib/interaction-comfort';

export function InteractionComfort() {
  const { data: config } = usePublicConfig();
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 480);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [pathname]);
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pressed = (event: PointerEvent) => {
      if (!touchEffectsEnabled(config?.readiness, motion.matches)) return;
      const target = event.target instanceof Element ? event.target.closest('button, a, [role="button"]') : null;
      if (!(target instanceof HTMLElement) || target.matches(':disabled, [aria-disabled="true"], [data-no-touch-effect], [role="switch"], [data-state][aria-checked]')) return;
      target.animate([
        { boxShadow: 'inset 0 0 0 1px var(--chart-3)', scale: '0.98' },
        { boxShadow: 'inset 0 0 0 0px transparent', scale: '1' },
      ], { duration: 260, easing: 'ease-out' });
    };
    document.addEventListener('pointerdown', pressed, { passive: true });
    return () => document.removeEventListener('pointerdown', pressed);
  }, [config?.readiness.touchEffectsEnabled]);
  if (pathname !== '/' || !scrolled) return null;
  return <Button size="icon" variant="outline" aria-label="Back to top" title="Back to top" className="home-scroll-top fixed left-3 z-40 size-11 rounded-full border-chart-3/50 bg-card text-chart-3 shadow-lg" onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })}><ArrowUp/></Button>;
}