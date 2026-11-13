import { PrescriptionAnalysis } from '../types';

export const analyzePrescriptionImage = async (
  base64Image: string,
  mimeType = 'image/jpeg',
  signal?: AbortSignal
): Promise<PrescriptionAnalysis> => {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageData: base64Image,
      mimeType,
    }),
    signal,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage =
      payload && typeof payload.error === 'string'
        ? payload.error
        : 'حدث خطأ أثناء التواصل مع خادم التحليل.';
    throw new Error(errorMessage);
  }

  return payload as PrescriptionAnalysis;
};
