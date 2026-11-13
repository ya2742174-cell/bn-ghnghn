import { CompressionMetrics } from '../types';

export interface CompressedImageResult {
  dataUrl: string;
  base64Data: string;
  mimeType: string;
  metrics: CompressionMetrics;
}

const MAX_DIMENSION = 1400;
const JPEG_QUALITY = 0.82;
const WEBP_QUALITY = 0.82;

function loadImageFromFile(file: File): Promise<{
  source: ImageBitmap | HTMLImageElement;
  width: number;
  height: number;
  cleanup: () => void;
}> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file)
      .then((bitmap) => ({
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close(),
      }))
      .catch(() => loadViaHtmlImage(file));
  }
  return loadViaHtmlImage(file);
}

function loadViaHtmlImage(file: File): Promise<{
  source: HTMLImageElement;
  width: number;
  height: number;
  cleanup: () => void;
}> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({
        source: img,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        cleanup: () => URL.revokeObjectURL(objectUrl),
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('تعذر قراءة ملف الصورة. تأكد من أن الملف صورة صالحة.'));
    };
    img.src = objectUrl;
  });
}

function estimateBase64Bytes(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] || dataUrl;
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

export async function compressPrescriptionImage(
  file: File
): Promise<CompressedImageResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('يرجى اختيار ملف صورة صالح (JPG أو PNG أو WebP).');
  }

  const loaded = await loadImageFromFile(file);

  try {
    const longestSide = Math.max(loaded.width, loaded.height);
    const scale = longestSide > MAX_DIMENSION ? MAX_DIMENSION / longestSide : 1;
    const targetWidth = Math.max(1, Math.round(loaded.width * scale));
    const targetHeight = Math.max(1, Math.round(loaded.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      throw new Error('تعذر تهيئة معالج ضغط الصور في المتصفح.');
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(loaded.source, 0, 0, targetWidth, targetHeight);

    let dataUrl = canvas.toDataURL('image/webp', WEBP_QUALITY);
    let mimeType = 'image/webp';

    if (!dataUrl.startsWith('data:image/webp')) {
      dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
      mimeType = 'image/jpeg';
    }

    const compressedBytes = estimateBase64Bytes(dataUrl);
    const originalBytes = file.size;

    if (compressedBytes > originalBytes && scale === 1) {
      const jpegFallback = canvas.toDataURL('image/jpeg', 0.78);
      const jpegBytes = estimateBase64Bytes(jpegFallback);
      if (jpegBytes < compressedBytes) {
        dataUrl = jpegFallback;
        mimeType = 'image/jpeg';
      }
    }

    const finalBytes = estimateBase64Bytes(dataUrl);
    const savedPercent =
      originalBytes > 0
        ? Math.max(0, Math.round(((originalBytes - finalBytes) / originalBytes) * 100))
        : 0;

    return {
      dataUrl,
      base64Data: dataUrl.split(',')[1] || dataUrl,
      mimeType,
      metrics: {
        originalBytes,
        compressedBytes: finalBytes,
        savedPercent,
        width: targetWidth,
        height: targetHeight,
        mimeType,
      },
    };
  } finally {
    loaded.cleanup();
  }
}

export function formatBytesArabic(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}
