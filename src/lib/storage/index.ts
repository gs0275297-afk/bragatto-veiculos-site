import { promises as fs } from "node:fs";
import path from "node:path";
import { del, put } from "@vercel/blob";
import { AwsClient } from "aws4fetch";
import { isBuildPhase } from "@/lib/db/env";

/**
 * Armazenamento de imagens e modelos 3D.
 *
 * - `local`: grava em UPLOAD_DIR e serve pela rota /media/[...key].
 *   Adequado para servidor próprio/VPS com disco persistente.
 * - `vercel-blob`: Vercel Blob (ativado automaticamente quando existe BLOB_READ_WRITE_TOKEN).
 * - `s3`: qualquer serviço compatível com S3 (Cloudflare R2, AWS S3, Backblaze B2...).
 * - `static`: modo vitrine na Vercel sem armazenamento conectado — os arquivos são gerados
 *   no build em public/vitrine e servidos como estáticos; nada pode ser enviado depois.
 * Em hospedagem serverless (Vercel) o disco não é persistente: use `vercel-blob` ou `s3`.
 */
export type StorageDriver = "local" | "s3" | "vercel-blob" | "static";

export function storageDriver(): StorageDriver {
  const explicit = process.env.STORAGE_DRIVER;
  if (explicit === "local" || explicit === "s3" || explicit === "vercel-blob") return explicit;
  if (process.env.BLOB_READ_WRITE_TOKEN) return "vercel-blob";
  if (process.env.S3_BUCKET && process.env.S3_ENDPOINT) return "s3";
  return process.env.VERCEL ? "static" : "local";
}

/** URL pública base do Vercel Blob: https://<store>.public.blob.vercel-storage.com */
export function blobPublicBase(): string | null {
  if (process.env.BLOB_PUBLIC_BASE_URL) return process.env.BLOB_PUBLIC_BASE_URL.replace(/\/$/, "");
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  // formato do token: vercel_blob_rw_<storeId>_<segredo>
  const storeId = (token.split("_")[3] ?? "").replace(/^store_/, "").toLowerCase();
  return storeId ? `https://${storeId}.public.blob.vercel-storage.com` : null;
}
export interface Storage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string;
}

export const uploadDir = path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? "./data/uploads");

function safeKey(key: string) {
  const normalized = path.posix.normalize(key).replace(/^\/+/, "");
  if (normalized.startsWith("..") || normalized.includes("\0")) throw new Error("Chave de arquivo inválida");
  return normalized;
}

export function resolveLocalPath(key: string): string {
  const full = path.resolve(uploadDir, safeKey(key));
  if (!full.startsWith(uploadDir + path.sep)) throw new Error("Chave de arquivo inválida");
  return full;
}

const localStorage: Storage = {
  async put(key, body) {
    const full = resolveLocalPath(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, body);
  },
  async delete(key) {
    await fs.rm(resolveLocalPath(key), { force: true });
  },
  publicUrl(key) {
    return `/media/${safeKey(key)}`;
  },
};

function createS3Storage(): Storage {
  const required = ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_PUBLIC_URL"] as const;
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`STORAGE_DRIVER=s3 requer as variáveis: ${missing.join(", ")}`);
  }
  const client = new AwsClient({
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    region: process.env.S3_REGION || "auto",
    service: "s3",
  });
  const endpoint = process.env.S3_ENDPOINT!.replace(/\/$/, "");
  const bucket = process.env.S3_BUCKET!;
  const publicBase = process.env.S3_PUBLIC_URL!.replace(/\/$/, "");
  const objectUrl = (key: string) => `${endpoint}/${bucket}/${safeKey(key)}`;

  return {
    async put(key, body, contentType) {
      const res = await client.fetch(objectUrl(key), {
        method: "PUT",
        body: new Uint8Array(body),
        headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable" },
      });
      if (!res.ok) throw new Error(`Falha no upload (${res.status}): ${await res.text()}`);
    },
    async delete(key) {
      const res = await client.fetch(objectUrl(key), { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error(`Falha ao remover arquivo (${res.status})`);
    },
    publicUrl(key) {
      return `${publicBase}/${safeKey(key)}`;
    },
  };
}

function createBlobStorage(): Storage {
  const base = blobPublicBase();
  if (!process.env.BLOB_READ_WRITE_TOKEN || !base) {
    throw new Error("STORAGE_DRIVER=vercel-blob requer BLOB_READ_WRITE_TOKEN (crie um Blob store no painel da Vercel).");
  }
  return {
    async put(key, body, contentType) {
      await put(safeKey(key), body, {
        access: "public",
        contentType,
        addRandomSuffix: false,
        allowOverwrite: true,
        cacheControlMaxAge: 31536000,
      });
    },
    async delete(key) {
      await del(`${base}/${safeKey(key)}`);
    },
    publicUrl(key) {
      return `${base}/${safeKey(key)}`;
    },
  };
}

export class ReadOnlyStorageError extends Error {
  constructor() {
    super("Envio de arquivos desativado: conecte um armazenamento (Vercel Blob ou S3) ao projeto.");
  }
}

/** Arquivos gravados em public/vitrine durante o build e servidos como estáticos. */
const staticStorage: Storage = {
  async put(key, body) {
    if (!isBuildPhase()) throw new ReadOnlyStorageError();
    const full = path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "vitrine", safeKey(key));
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, body);
  },
  async delete() {
    throw new ReadOnlyStorageError();
  },
  publicUrl(key) {
    return `/vitrine/${safeKey(key)}`;
  },
};

let instance: Storage | undefined;

export function storage(): Storage {
  if (!instance) {
    const driver = storageDriver();
    instance =
      driver === "s3"
        ? createS3Storage()
        : driver === "vercel-blob"
          ? createBlobStorage()
          : driver === "static"
            ? staticStorage
            : localStorage;
  }
  return instance;
}
