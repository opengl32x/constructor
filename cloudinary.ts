/**
 * Cloudinary upload service.
 *
 * Uploads a file (image) to Cloudinary via the unsigned upload API.
 * The Cloudinary cloud name and upload preset are read from env vars:
 *   VITE_CLOUDINARY_CLOUD_NAME
 *   VITE_CLOUDINARY_UPLOAD_PRESET
 *
 * If these are not configured, falls back to a data URL (base64) so the
 * app remains functional for local development and portfolio demos.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ?? '';
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ?? '';

export function isCloudinaryConfigured(): boolean {
  return CLOUD_NAME.length > 0 && UPLOAD_PRESET.length > 0;
}

export interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
}

export async function uploadToCloudinary(
  file: File | Blob,
  displayName?: string,
): Promise<UploadResult> {
  if (!isCloudinaryConfigured()) {
    // Fallback: convert to data URL for local demo without Cloudinary keys
    const dataUrl = await blobToDataUrl(file);
    return {
      url: dataUrl,
      publicId: displayName ?? 'local-upload',
      width: 0,
      height: 0,
    };
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  if (displayName) formData.append('public_id', displayName);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData },
  );

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Cloudinary upload failed (${response.status}): ${errBody}`);
  }

  const json = await response.json();
  return {
    url: json.secure_url as string,
    publicId: json.public_id as string,
    width: json.width as number,
    height: json.height as number,
  };
}

/** Convert a Blob/File to a base64 data URL. */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Convert a data URL back to a Blob (for canvas export uploads). */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, base64] = dataUrl.split(',');
  const mime = meta.match(/:(.*?);/)?.[1] ?? 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
