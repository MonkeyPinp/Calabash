import { useEffect, useState } from 'react';
import { getPortrait } from '@/db/portraits';

export function usePortraitUrl(portraitId: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!portraitId) { setUrl(null); return; }
    let objUrl: string | null = null;
    let cancelled = false;

    getPortrait(portraitId).then((portrait) => {
      if (cancelled || !portrait) return;
      objUrl = URL.createObjectURL(portrait.blob);
      setUrl(objUrl);
    });

    return () => {
      cancelled = true;
      if (objUrl) URL.revokeObjectURL(objUrl);
      setUrl(null);
    };
  }, [portraitId]);

  return url;
}
