import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function ContentImage({ path, alt, fallbackSrc, className = 'mb-4 aspect-video w-full rounded-lg object-cover' }: { path?: string | undefined; alt: string; fallbackSrc?: string; className?: string }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!path) { setUrl(undefined); return; }
    let active = true;
    let objectUrl: string | undefined;
    setUrl(undefined);
    supabase.storage.from('bix-content').download(path).then(({ data }) => {
      if (!active || !data) return;
      objectUrl = URL.createObjectURL(data);
      setUrl(objectUrl);
    });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [path]);
  const source = url ?? fallbackSrc;
  return source ? <img src={source} alt={alt} loading="lazy" className={className}/> : null;
}