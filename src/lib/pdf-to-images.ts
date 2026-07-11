'use client';

export async function convertPdfToImages(file: File): Promise<string[]> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    const pdfjsVersion = '4.3.136';
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const images: string[] = [];

    // Max 5 pages
    const pageCount = Math.min(pdf.numPages, 5);

    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 }); // Downscale slightly to keep payload small

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) continue;

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport,
        canvas: canvas as any,
      }).promise;

      // Extract image as base64 JPEG
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const base64 = dataUrl.split(',')[1];
      images.push(base64);

      // Clean up canvas
      canvas.remove();
    }

    return images;
  } catch (err) {
    console.error('Error rendering PDF:', err);
    throw new Error('Failed to render PDF pages to images');
  }
}
