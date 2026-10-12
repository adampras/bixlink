import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Group = { title: string; tabs: [string, string][] };
export function AdminNavigation({ groups, tab, onSelect }: { groups: Group[]; tab: string; onSelect: (tab: string) => void }) {
  const [query, setQuery] = useState('');
  const selectedGroup = groups.find(group => group.tabs.some(([name]) => name === tab)) ?? groups[0];
  const term = query.trim().toLowerCase();
  const visible = term ? groups.map(group => ({ ...group, tabs: group.tabs.filter(([name, keywords]) => `${name} ${keywords}`.toLowerCase().includes(term)) })).filter(group => group.tabs.length > 0) : selectedGroup ? [selectedGroup] : [];
  return <nav aria-label="Owner sections" className="admin-navigation mt-6 min-w-0 border-b border-border pb-5">
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-border bg-card px-3">
      <Search size={16} className="shrink-0 text-primary"/>
      <input aria-label="Cari menu admin" className="min-w-0 bg-transparent py-3 text-sm outline-none" placeholder="Cari menu admin…" value={query} onChange={event => setQuery(event.target.value)}/>
      {query ? <Button size="icon" variant="ghost" aria-label="Hapus pencarian" className="size-8" onClick={() => setQuery('')}><X size={14}/></Button> : <span className="size-8"/>}
    </div>
    <div role="group" aria-label="Kategori admin" className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
      {groups.map(group => <Button key={group.title} variant={selectedGroup?.title === group.title ? 'default' : 'outline'} aria-pressed={selectedGroup?.title === group.title} className="h-auto min-h-11 whitespace-normal px-2 text-xs" onClick={() => { const first = group.tabs[0]; if (first) onSelect(first[0]); setQuery(''); }}>{group.title}</Button>)}
    </div>
    <div className="mt-4 space-y-4">{visible.map(group => <div key={group.title}>
      {term && <h2 className="mb-2 text-xs font-bold text-muted-foreground">{group.title}</h2>}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{group.tabs.map(([name]) => <Button key={name} size="sm" variant={tab === name ? 'secondary' : 'ghost'} aria-pressed={tab === name} className="h-auto min-h-10 whitespace-normal border border-border px-2 text-xs" onClick={() => { onSelect(name); setQuery(''); }}>{name}</Button>)}</div>
    </div>)}</div>
    {!visible.length && <p role="status" className="mt-4 text-sm text-muted-foreground">Menu tidak ditemukan.</p>}
  </nav>;
}