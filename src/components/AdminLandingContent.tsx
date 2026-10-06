import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Plus, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateSetting } from '@/lib/bixlink.functions';
import { defaultLandingContent, type LandingContent } from '@/components/LandingExperience';

type Item = LandingContent['ecosystem'][number];

export function AdminLandingContent({ initialContent, onMessage, onSaved }: { initialContent?: LandingContent; onMessage: (message: string) => void; onSaved: () => Promise<void> }) {
  const [content, setContent] = useState<LandingContent>(initialContent ?? defaultLandingContent);
  const [saving, setSaving] = useState(false);
  const saveSetting = useServerFn(updateSetting);
  const updateItem = (group: 'ecosystem' | 'income', index: number, key: keyof Item, value: string) => setContent(current => ({ ...current, [group]: current[group].map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) }));
  const addItem = (group: 'ecosystem' | 'income') => setContent(current => ({ ...current, [group]: [...current[group], { title: '', description: '' }] }));
  const removeItem = (group: 'ecosystem' | 'income', index: number) => setContent(current => ({ ...current, [group]: current[group].filter((_, itemIndex) => itemIndex !== index) }));
  const save = async () => {
    setSaving(true);
    try {
      await saveSetting({ data: { key: 'landing_content', value: content } });
      await onSaved();
      onMessage('Landing ecosystem content saved.');
    } catch (error) {
      onMessage(error instanceof Error ? error.message : 'Could not save landing content.');
    } finally { setSaving(false); }
  };
  const editor = (group: 'ecosystem' | 'income', label: string) => <section className="admin-content-column">
    <div className="flex items-center justify-between gap-3"><div><div className="eyebrow">{label}</div><h3 className="mt-2 font-display text-xl font-bold">{group === 'ecosystem' ? 'Ecosystem pillars' : 'Income narrative'}</h3></div><Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => addItem(group)}><Plus/> Add</Button></div>
    <div className="mt-5 space-y-3">{content[group].map((item, index) => <div className="admin-content-item" key={`${group}-${index}`}><input className="form-input" aria-label={`${label} title ${index + 1}`} maxLength={60} placeholder="Title" value={item.title} onChange={event => updateItem(group, index, 'title', event.target.value)}/><textarea className="form-input min-h-24 resize-y" aria-label={`${label} description ${index + 1}`} maxLength={240} placeholder="Short factual description" value={item.description} onChange={event => updateItem(group, index, 'description', event.target.value)}/><Button type="button" size="icon" variant="ghost" className="text-destructive" aria-label={`Remove ${item.title || 'item'}`} onClick={() => removeItem(group, index)}><Trash2/></Button></div>)}</div>
  </section>;
  return <div className="mt-8"><div className="grid gap-5 lg:grid-cols-2">{editor('ecosystem', 'ECOSYSTEM')}{editor('income', 'INCOME SOURCES')}</div><div className="mt-5 flex justify-end"><Button type="button" className="rounded-full" disabled={saving} onClick={save}><Save/> {saving ? 'Saving…' : 'Save landing content'}</Button></div></div>;
}