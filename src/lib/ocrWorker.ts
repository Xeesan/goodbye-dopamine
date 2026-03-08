import Tesseract, { createWorker, Worker } from 'tesseract.js';

let cachedWorker: Worker | null = null;
let workerReady = false;

/**
 * Get or create a cached Tesseract worker for faster repeated OCR.
 */
export async function getWorker(): Promise<Worker> {
  if (cachedWorker && workerReady) return cachedWorker;

  // Terminate old worker if it exists but isn't ready
  if (cachedWorker) {
    try { await cachedWorker.terminate(); } catch {}
  }

  const worker = await createWorker('eng', 1, {
    // Use default CDN paths — Tesseract.js handles this
  });

  // Set parameters for timetable/schedule OCR
  await worker.setParameters({
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-/:.,() \n',
    tessedit_pageseg_mode: Tesseract.PSM.AUTO,
    preserve_interword_spaces: '1',
  });

  cachedWorker = worker;
  workerReady = true;
  return worker;
}

/**
 * Preprocess image for better OCR: grayscale + contrast boost.
 * Returns a canvas data URL.
 */
export function preprocessImage(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(dataUrl); return; }

      // Draw original
      ctx.drawImage(img, 0, 0);

      // Get pixel data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Convert to grayscale + increase contrast
      const contrast = 1.5; // contrast multiplier
      const intercept = 128 * (1 - contrast);

      for (let i = 0; i < data.length; i += 4) {
        // Grayscale
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        // Apply contrast
        let val = gray * contrast + intercept;
        // Clamp
        val = val < 0 ? 0 : val > 255 ? 255 : val;
        data[i] = val;
        data[i + 1] = val;
        data[i + 2] = val;
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl); // fallback to original
    img.src = dataUrl;
  });
}

/**
 * Run OCR with preprocessing and cached worker.
 */
export async function recognizeImage(
  dataUrl: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const processed = await preprocessImage(dataUrl);
  const worker = await getWorker();

  const result = await worker.recognize(processed, {}, {
    text: true,
  });

  return result.data.text;
}

/**
 * Terminate the cached worker (call on unmount if needed).
 */
export async function terminateWorker() {
  if (cachedWorker) {
    try { await cachedWorker.terminate(); } catch {}
    cachedWorker = null;
    workerReady = false;
  }
}
