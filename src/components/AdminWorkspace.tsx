import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

/** Related tools share one menu entry without mounting duplicate editors. */
export function AdminWorkspace({ label, panels }: { label: string; panels: { title: string; content: ReactNode }[] }) {
  const [selected, setSelected] = useState(0);
  return <section className="mt-6 min-w-0">
    <div role="group" aria-label={label} className="flex flex-wrap gap-2 border-b border-border pb-4">
      {panels.map((panel, index) => <Button key={panel.title} variant={selected === index ? 'default' : 'outline'} aria-pressed={selected === index} className="h-auto min-h-11 whitespace-normal" onClick={() => setSelected(index)}>{panel.title}</Button>)}
    </div>
    <div key={selected}>{panels[selected]?.content}</div>
  </section>;
}