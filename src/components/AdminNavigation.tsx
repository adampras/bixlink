import { useState, type ReactNode } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type AdminGroup = { title: string; tone: 'gold' | 'cyan' | 'emerald' | 'violet' | 'rose' | 'slate'; hint: string; tabs: [string, string][] };

/** Color-coded category columns; each column lists its own menus so nothing is hidden behind a second click. */
export function AdminNavigation({ groups, tab, onSelect }: { groups: AdminGroup[]; tab: string; onSelect: (tab: string) => void }) {
  const [query, setQuery] = useState('');
  const term = query.trim().toLowerCase();
  const visible = groups.map(g => ({ ...g, tabs: term ? g.tabs.filter(([n, k]) => `${n} ${k} ${g.title}`.toLowerCase().includes(term)) : g.tabs })).filter(g => g.tabs.length);
  return <nav aria-label="Owner sections" className="admin-navigation mt-6 min-w-0 border-b border-border pb-5">
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-border bg-card px-3">
      <Search size={16} className="shrink-0 text-primary"/>
      <input aria-label="Cari menu admin" className="min-w-0 bg-transparent py-3 text-sm outline-none" placeholder="Cari menu admin…" value={query} onChange={e => setQuery(e.target.value)}/>
      {query ? <Button size="icon" variant="ghost" aria-label="Hapus pencarian" className="size-8" onClick={() => setQuery('')}><X size={14}/></Button> : <span className="size-8"/>}
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map(g => <section key={g.title} className={`admin-cat admin-cat--${g.tone}`}>
        <header><b>{g.title}</b><small>{g.hint}</small></header>
        <div className="grid grid-cols-2 gap-1.5">{g.tabs.map(([name]) => <button key={name} type="button" aria-pressed={tab === name} className="admin-cat-btn" onClick={() => { onSelect(name); setQuery(''); }}>{name}</button>)}</div>
      </section>)}
    </div>
    {!visible.length && <p role="status" className="mt-4 text-sm text-muted-foreground">Menu tidak ditemukan.</p>}
  </nav>;
}

/** Collapsible section for long lists/history so the page stays short. */
export function AdminFold({ title, tone = 'slate', badge, defaultOpen = false, children }: { title: string; tone?: AdminGroup['tone']; badge?: ReactNode; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return <section className={`admin-fold admin-cat--${tone} mt-4`}>
    <button type="button" aria-expanded={open} className="admin-fold-head" onClick={() => setOpen(o => !o)}>
      <span className="admin-fold-dot"/><b>{title}</b>{badge !== undefined && <span className="admin-fold-badge">{badge}</span>}
      <span className="ml-auto text-xs">{open ? 'Tutup' : 'Buka'}</span><ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`}/>
    </button>
    {open && <div className="admin-fold-body">{children}</div>}
  </section>;
}
