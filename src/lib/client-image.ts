/**
 * Reduz fotos grandes no navegador antes do envio.
 * Necessário em hospedagem serverless (Vercel limita cada requisição a ~4,5 MB) e
 * acelera uploads pelo celular. O servidor ainda normaliza a imagem (WebP, sem metadados).
 */
const TARGET_BYTES = 3.6 * 1024 * 1024;
const MAX_SIDE = 2400;

export async function prepareImageForUpload(file: File): Promise<File> {
  if (file.size <= TARGET_BYTES) return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file; // formato que o navegador não decodifica: o servidor decide
  }
  try {
    for (const [side, quality] of [
      [MAX_SIDE, 0.9],
      [MAX_SIDE, 0.82],
      [2000, 0.82],
      [1600, 0.8],
    ] as const) {
      const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
      if (blob && blob.size <= TARGET_BYTES) {
        return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
      }
    }
    return file;
  } finally {
    bitmap.close();
  }
}
