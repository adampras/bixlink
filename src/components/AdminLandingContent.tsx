import { useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Plus, Save, Trash2, Upload, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { updateSetting } from '@/lib/bixlink.functions';
import { defaultLandingContent, defaultRoadmap, defaultSpaces, type LandingContent, type ContentItem } from '@/lib/landing-content';
import { supabase } from '@/integrations/supabase/client';
import { ContentImage } from '@/components/ContentImage';
import { useQueryClient } from '@tanstack/react-query';

type Group = 'ecosystem' | 'income' | 'spaces' | 'roadmap';

export function AdminLandingContent({ initialContent, onMessage, onSaved }: { initialContent?: LandingContent; onMessage: (message: string) => void; onSaved: () => Promise<void> }) {
  const [content, setContent] = useState<LandingContent>({ ...(initialContent ?? defaultLandingContent), spaces: initialContent?.spaces ?? defaultSpaces, roadmap: initialContent?.roadmap ?? defaultRoadmap });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string>();
  const qc = useQueryClient();
  const saveSetting = useServerFn(updateSetting);
  const updateItem = (group: Group, index: number, key: keyof ContentItem, value: string | boolean | undefined) => setContent(current => ({ ...current, [group]: (current[group] ?? []).map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) }));
  const addItem = (group: Group) => setContent(current => ({ ...current, [group]: [...(current[group] ?? []), { title: '', description: '', enabled: true }] }));
  const removeItem = (group: Group, index: number) => setContent(current => ({ ...current, [group]: (current[group] ?? []).filter((_, itemIndex) => itemIndex !== index) }));
  const upload = async (group: Group, index: number, file?: File) => {
    if (!file) return;
    const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
    const extension = extensions[file.type];
    if (!extension || file.size > 5 * 1024 * 1024) { onMessage('Choose JPG, PNG or WebP, maximum 5 MB.'); return; }
    setUploading(`${group}-${index}`);
    try {
      const path = `images/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from('bix-content').upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      updateItem(group, index, 'image', path);
      onMessage('Image uploaded. Save content to publish this change.');
    } catch (error) { onMessage(error instanceof Error ? error.message : 'Could not upload image.'); }
    finally { setUploading(undefined); }
  };
  const save = async () => {
    setSaving(true);
    try {
      await saveSetting({ data: { key: 'landing_content', value: content } });
      await onSaved();
      await qc.invalidateQueries({ queryKey: ['bix-public-config'] });
      onMessage('Landing ecosystem content saved.');
    } catch (error) {
      onMessage(error instanceof Error ? error.message : 'Could not save landing content.');
    } finally { setSaving(false); }
  };
  const editor = (group: Group, label: string) => <section className="min-w-0 border-t border-border py-6">
    <div className="flex items-center justify-between gap-3"><h3 className="font-display text-xl font-bold">{label}</h3><Button type="button" size="sm" variant="outline" disabled={(content[group]?.length ?? 0) >= 12} onClick={() => addItem(group)}><Plus/> Add</Button></div>
    <div className="mt-5 space-y-5">{(content[group] ?? []).map((item, index) => <div className="min-w-0 space-y-3 border-b border-border pb-5" key={`${group}-${index}`}>
      <div className="flex items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{index + 1} · {item.title || 'New item'}</span><div className="flex gap-2"><Button type="button" size="sm" variant={item.enabled === false ? 'outline' : 'default'} aria-label={`${label} visibility ${index + 1}`} aria-pressed={item.enabled !== false} onClick={() => updateItem(group, index, 'enabled', item.enabled === false)}>{item.enabled === false ? <EyeOff/> : <Eye/>}{item.enabled === false ? 'CLOSED' : 'OPEN'}</Button><Button type="button" size="icon" variant="ghost" className="text-destructive" aria-label={`Remove ${label} item ${index + 1}`} onClick={() => removeItem(group, index)}><Trash2/></Button></div></div>
      <ContentImage path={item.image} alt={item.title}/>
      <input className="form-input" aria-label={`${label} title ${index + 1}`} maxLength={60} placeholder="Title" value={item.title} onChange={event => updateItem(group, index, 'title', event.target.value)}/>
      {group === 'roadmap' && <input className="form-input" aria-label={`${label} quarter ${index + 1}`} maxLength={40} placeholder="Quarter / phase" value={item.quarter ?? ''} onChange={event => updateItem(group, index, 'quarter', event.target.value)}/>}
      <textarea className="form-input min-h-24 resize-y" aria-label={`${label} description ${index + 1}`} maxLength={240} placeholder="Short factual description" value={item.description} onChange={event => updateItem(group, index, 'description', event.target.value)}/>
      <div className="flex flex-wrap items-center gap-2"><Button asChild size="sm" variant="outline" disabled={Boolean(uploading)}><label className="cursor-pointer"><Upload/>{uploading === `${group}-${index}` ? 'Uploading…' : 'Upload image'}<input disabled={Boolean(uploading)} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" aria-label={`${label} image ${index + 1}`} onChange={event => { void upload(group, index, event.target.files?.[0]); event.target.value = ''; }}/></label></Button>{item.image && <Button type="button" size="sm" variant="ghost" onClick={() => updateItem(group, index, 'image', undefined)}>Remove image</Button>}</div>
    </div>)}</div>
  </section>;
  return <div className="mt-8"><div className="grid gap-x-8 lg:grid-cols-2">{editor('ecosystem', 'ECOSYSTEM')}{editor('income', 'INCOME SOURCES')}{editor('spaces', 'HOME & LANDING SPACES')}{editor('roadmap', 'ROADMAP')}</div><div className="sticky bottom-20 mt-5 flex justify-end bg-background py-4 md:bottom-0"><Button type="button" disabled={saving || Boolean(uploading)} onClick={save}><Save/> {saving ? 'Saving…' : 'Save landing content'}</Button></div></div>;
}