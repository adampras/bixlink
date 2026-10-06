import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function ContentImage({ path, alt }: { path?: string; alt: string }) {
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
  return url ? <img src={url} alt={alt} loading="lazy" className="mb-4 aspect-video w-full rounded-lg object-cover"/> : null;
}