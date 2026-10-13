import type { ProductType, ProductColor, DesignSide } from '@/types';

// Same-origin photo assets keep Fabric exports readable (no CORS-tainted canvas).
const sources = new Map<string, Promise<HTMLImageElement>>();
const rendered = new Map<string, Promise<string>>();
export const getBasePhotoUrl = (type: ProductType, side: DesignSide) =>
  `${import.meta.env.BASE_URL}garments/${type}-${side}.webp`;

function loadPhoto(url: string): Promise<HTMLImageElement> {
  const cached = sources.get(url);
  if (cached) return cached;
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => { sources.delete(url); reject(new Error(`Cannot load garment: ${url}`)); };
    image.src = url;
  });
  sources.set(url, promise);
  return promise;
}

/** Recolour the neutral photographic fabric while preserving texture and alpha.
 * Output remains 400:480 to preserve saved artwork coordinates. Guides are
 * separate Fabric objects, never baked into the product photograph.
 */
export function getMockupUrl(type: ProductType, side: DesignSide, color: string): Promise<string> {
  const normalized = /^#[0-9a-f]{6}$/i.test(color) ? color : '#9e9e9e';
  const key = `${type}:${side}:${normalized}`;
  const cached = rendered.get(key);
  if (cached) return cached;
  const promise = loadPhoto(getBasePhotoUrl(type, side)).then(image => {
    const canvas = document.createElement('canvas');
    canvas.width = 800; canvas.height = 960;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    if (type === 'cap') ctx.drawImage(image, 0, -10, 800, 720);
    else ctx.drawImage(image, 0, 0, 800, 960);
    const pixels = ctx.getImageData(0, 0, 800, 960);
    const rgb = [1, 3, 5].map(i => parseInt(normalized.slice(i, i + 2), 16));
    for (let i = 0; i < pixels.data.length; i += 4) {
      if (!pixels.data[i + 3]) continue;
      const light = (pixels.data[i] * .2126 + pixels.data[i + 1] * .7152 + pixels.data[i + 2] * .0722) / 180;
      for (let channel = 0; channel < 3; channel++) {
        // A small reflected-light term retains visible folds in black fabric.
        pixels.data[i + channel] = Math.min(255, rgb[channel] * light + Math.max(0, light - .72) * 16);
      }
    }
    ctx.putImageData(pixels, 0, 0);
    return canvas.toDataURL('image/png');
  }).catch(error => { rendered.delete(key); throw error; });
  if (rendered.size >= 24) rendered.delete(rendered.keys().next().value!);
  rendered.set(key, promise);
  return promise;
}

export function getMockupColors(productType: ProductType): ProductColor[] {
  const all: Record<ProductType, ProductColor[]> = {
    hoodie: [
      { name: 'Чёрный', hex: '#1a1a1a' },
      { name: 'Тёмно-серый', hex: '#3d3d3d' },
      { name: 'Светло-серый', hex: '#9e9e9e' },
      { name: 'Бежевый', hex: '#d4c5a9' },
      { name: 'Хаки', hex: '#5d6b4e' },
      { name: 'Бордовый', hex: '#6d2027' },
      { name: 'Синий', hex: '#1f3a5f' },
      { name: 'Белый', hex: '#f5f5f5' },
    ],
    tshirt: [
      { name: 'Чёрный', hex: '#1a1a1a' },
      { name: 'Белый', hex: '#f5f5f5' },
      { name: 'Тёмно-синий', hex: '#1a2a44' },
      { name: 'Бордовый', hex: '#6d2027' },
      { name: 'Хаки', hex: '#5d6b4e' },
      { name: 'Светло-серый', hex: '#9e9e9e' },
      { name: 'Оранжевый', hex: '#d97834' },
      { name: 'Розовый', hex: '#e8b4bc' },
    ],
    sweatshirt: [
      { name: 'Чёрный', hex: '#1a1a1a' },
      { name: 'Тёмно-серый', hex: '#3d3d3d' },
      { name: 'Светло-серый', hex: '#9e9e9e' },
      { name: 'Кремовый', hex: '#ede5d6' },
      { name: 'Оливковый', hex: '#5d6b4e' },
      { name: 'Синий', hex: '#1f3a5f' },
      { name: 'Бордовый', hex: '#6d2027' },
      { name: 'Белый', hex: '#f5f5f5' },
    ],
    cap: [
      { name: 'Чёрный', hex: '#1a1a1a' },
      { name: 'Белый', hex: '#f5f5f5' },
      { name: 'Тёмно-синий', hex: '#1a2a44' },
      { name: 'Бордовый', hex: '#6d2027' },
      { name: 'Хаки', hex: '#5d6b4e' },
      { name: 'Красный', hex: '#c0392b' },
    ],
  };
  return all[productType];
}
