import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { storage } from "@/lib/storage";

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export type ProcessedImage = {
  storageKey: string;
  width: number;
  height: number;
  blurDataUrl: string;
};

/**
 * Normaliza a foto enviada pela loja:
 * - corrige a orientação (EXIF) e remove metadados (inclusive localização GPS);
 * - limita o lado maior a 2400 px sem ampliar;
 * - converte para WebP de alta qualidade (o Next/Image gera AVIF/WebP responsivos a partir dele);
 * - cria um placeholder minúsculo para evitar "pulos" de layout durante o carregamento.
 * Não aplica filtros que alterem a aparência do veículo.
 */
export async function processAndStoreImage(input: Buffer, folder: string): Promise<ProcessedImage> {
  const pipeline = sharp(input, { failOn: "error" }).rotate();
  const { data, info } = await pipeline
    .resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 86, effort: 5 })
    .toBuffer({ resolveWithObject: true });

  const blur = await sharp(data).resize(24, 24, { fit: "inside" }).webp({ quality: 40 }).toBuffer();

  const storageKey = `${folder}/${randomUUID()}.webp`;
  await storage().put(storageKey, data, "image/webp");

  return {
    storageKey,
    width: info.width,
    height: info.height,
    blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
  };
}
