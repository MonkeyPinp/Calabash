export const PORTRAIT_JPEG_MIME_TYPE = 'image/jpeg';
export const PORTRAIT_JPEG_QUALITY = 0.75;

export interface CompressedPortrait {
  blob: Blob;
  mimeType: typeof PORTRAIT_JPEG_MIME_TYPE;
}

export async function compressPortraitToJpeg(input: Blob): Promise<CompressedPortrait> {
  const image = await loadImage(input);
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;

  const context = canvas.getContext('2d');
  if (!context || canvas.width <= 0 || canvas.height <= 0) {
    throw new Error('Could not prepare portrait compression canvas');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return {
    blob: await canvasToJpegBlob(canvas),
    mimeType: PORTRAIT_JPEG_MIME_TYPE,
  };
}

function loadImage(input: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(input);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not decode portrait image'));
    };
    image.src = url;
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error('Could not compress portrait image'));
      },
      PORTRAIT_JPEG_MIME_TYPE,
      PORTRAIT_JPEG_QUALITY,
    );
  });
}
