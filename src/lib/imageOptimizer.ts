/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ProcessedImageResult {
  webpUrl: string;        // Optimized Desktop WebP (Data URL, max ~1600px, ~82% quality)
  mobileWebpUrl: string;  // Ultra-lightweight Mobile WebP (Data URL, max ~800px, ~75% quality)
  filename: string;
  originalSizeKb: number;
  webpSizeKb: number;
  mobileSizeKb: number;
}

/**
 * Converts any image file (JPG, PNG, GIF, TIFF, BMP, WebP) into an optimized WebP format
 * and generates a high-efficiency mobile version for low bandwidth devices.
 */
export async function processAndOptimizeImageFile(file: File): Promise<ProcessedImageResult> {
  const originalSizeKb = Math.round(file.size / 1024);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        try {
          // 1. Desktop / Standard WebP (Max width 1600px, quality 0.82)
          const desktopDataUrl = renderToCanvasWebP(img, 1600, 0.82);

          // 2. Mobile / Ultra-lightweight WebP (Max width 800px, quality 0.75)
          const mobileDataUrl = renderToCanvasWebP(img, 800, 0.75);

          const webpSizeKb = Math.round((desktopDataUrl.length * 0.75) / 1024);
          const mobileSizeKb = Math.round((mobileDataUrl.length * 0.75) / 1024);

          resolve({
            webpUrl: desktopDataUrl,
            mobileWebpUrl: mobileDataUrl,
            filename: file.name.replace(/\.[^/.]+$/, "") + ".webp",
            originalSizeKb,
            webpSizeKb,
            mobileSizeKb,
          });
        } catch (err) {
          console.error("Failed canvas WebP transformation:", err);
          const fallback = (e.target?.result as string) || "";
          resolve({
            webpUrl: fallback,
            mobileWebpUrl: fallback,
            filename: file.name,
            originalSizeKb,
            webpSizeKb: originalSizeKb,
            mobileSizeKb: originalSizeKb,
          });
        }
      };

      img.onerror = (err) => {
        console.error("Failed to load image for WebP optimization:", err);
        reject(new Error("Não foi possível carregar a imagem para conversão em WebP."));
      };

      img.src = (e.target?.result as string) || "";
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Renders an Image element onto an HTML5 Canvas scaled to maxDimensions and exports as image/webp
 */
function renderToCanvasWebP(img: HTMLImageElement, maxWidth: number, quality: number): string {
  const canvas = document.createElement("canvas");
  let width = img.width;
  let height = img.height;

  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }

  canvas.width = Math.max(width, 1);
  canvas.height = Math.max(height, 1);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D Context not available");
  }

  // Draw image onto canvas
  ctx.drawImage(img, 0, 0, width, height);

  // Export as WebP format
  const webpDataUrl = canvas.toDataURL("image/webp", quality);

  // If browser doesn't support canvas image/webp export, it falls back to image/png
  // Check if WebP supported or return fallback
  return webpDataUrl;
}
