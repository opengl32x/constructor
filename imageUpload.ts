/**
 * Local-first image import: no network needed, so it can't fail on Cloudinary
 * config. Validates, downsizes to <=2000px, re-encodes, returns a data URL.
 */
const MAX_SIDE = 2000;
const MAX_BYTES = 20 * 1024 * 1024;

export async function prepareImageFile(file: File): Promise<string> {
  const isImg = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg|bmp|avif)$/i.test(file.name);
  if (!isImg) throw new Error('Выберите файл изображения (PNG, JPG, WEBP, SVG).');
  if (/hei[cf]/i.test(file.type + file.name))
    throw new Error('HEIC не поддерживается браузером — сохраните фото как JPG или PNG.');
  if (file.size > MAX_BYTES) throw new Error('Файл больше 20 МБ.');

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('Не удалось прочитать изображение: файл повреждён или формат не поддерживается.'));
      i.src = url;
    });
    const w0 = img.naturalWidth || 1000;
    const h0 = img.naturalHeight || 1000;
    const k = Math.min(1, MAX_SIDE / Math.max(w0, h0));
    const c = document.createElement('canvas');
    c.width = Math.round(w0 * k);
    c.height = Math.round(h0 * k);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    const alpha = /png|webp|gif|svg/.test(file.type);
    return c.toDataURL(alpha ? 'image/png' : 'image/jpeg', 0.92);
  } finally {
    URL.revokeObjectURL(url);
  }
}
