import { useEffect, useState } from 'react';
import type { ProductType, DesignSide } from '@/types';
import { getMockupUrl, getBasePhotoUrl } from '@/services/mockups';

export function GarmentPhoto({ type, side = 'front', color, alt, className, preview }: {
  type: ProductType; side?: DesignSide; color: string; alt: string; className?: string; preview?: string;
}) {
  const [photo, setPhoto] = useState<{ key: string; url: string }>();
  const key = `${type}:${side}:${color}`;
  useEffect(() => {
    let cancelled = false;
    if (!preview) getMockupUrl(type, side, color).then(url => {
      if (!cancelled) setPhoto({ key, url });
    }).catch(console.error);
    return () => { cancelled = true; };
  }, [type, side, color, preview, key]);
  return <img src={preview || (photo?.key === key ? photo.url : getBasePhotoUrl(type, side))}
    alt={alt} className={className} decoding="async" />;
}
