/**
 * Regras de escrita do estoque, compartilhadas entre o painel administrativo e os scripts de seed.
 * As rotinas de autorização ficam em quem chama (ações do painel).
 */
import { randomUUID } from "node:crypto";
import { and, asc, eq, ne } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { normalizeSearch } from "@/lib/filters";
import { processAndStoreImage } from "@/lib/images";
import { slugify, vehicleSlugBase } from "@/lib/slug";
import { storage } from "@/lib/storage";
import type { VehicleInput } from "@/lib/vehicle-input";
import type { PhotoAngle, PhotoKind } from "@/lib/db/schema";

const { vehicles, vehiclePhotos } = schema;

async function uniqueSlug(base: string, excludeId?: string) {
  const root = slugify(base) || "veiculo";
  let candidate = root;
  for (let i = 2; i < 200; i++) {
    const clash = await db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(excludeId ? and(eq(vehicles.slug, candidate), ne(vehicles.id, excludeId)) : eq(vehicles.slug, candidate))
      .limit(1);
    if (!clash.length) return candidate;
    candidate = `${root}-${i}`;
  }
  return `${root}-${randomUUID().slice(0, 6)}`;
}

function toRow(input: VehicleInput) {
  const { price, slug: _slug, ...rest } = input;
  return {
    ...rest,
    yearModel: input.yearModel!,
    priceCents: price,
    searchText: normalizeSearch([input.brand, input.model, input.version].filter(Boolean).join(" ")),
  };
}

export async function createVehicle(input: VehicleInput, extra: { isDemo?: boolean } = {}) {
  const id = randomUUID();
  const slug = await uniqueSlug(input.slug || vehicleSlugBase({ ...input, yearModel: input.yearModel! }));
  const nowMs = Date.now();
  await db.insert(vehicles).values({
    id,
    slug,
    ...toRow(input),
    isDemo: extra.isDemo ?? false,
    publishedAt: input.published ? nowMs : null,
    createdAt: nowMs,
    updatedAt: nowMs,
  });
  return { id, slug };
}

export async function updateVehicle(id: string, input: VehicleInput) {
  const [current] = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
  if (!current) throw new Error("Veículo não encontrado");
  const slug = input.slug && input.slug !== current.slug ? await uniqueSlug(input.slug, id) : current.slug;
  const nowMs = Date.now();
  await db
    .update(vehicles)
    .set({
      ...toRow(input),
      slug,
      publishedAt: input.published ? (current.publishedAt ?? nowMs) : current.publishedAt,
      updatedAt: nowMs,
    })
    .where(eq(vehicles.id, id));
  return { id, slug, previousSlug: current.slug };
}

export async function deleteVehicle(id: string) {
  const photos = await db.select().from(vehiclePhotos).where(eq(vehiclePhotos.vehicleId, id));
  const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id));
  await db.delete(vehicles).where(eq(vehicles.id, id));
  const keys = [...photos.map((p) => p.storageKey), vehicle?.model3dKey, vehicle?.model3dPosterKey].filter(Boolean) as string[];
  await Promise.allSettled(keys.map((k) => storage().delete(k)));
}

export async function addPhoto(
  vehicleId: string,
  file: Buffer,
  meta: { alt?: string | null; angle?: PhotoAngle | null; kind?: PhotoKind; focalX?: number; focalY?: number } = {},
) {
  const processed = await processAndStoreImage(file, `veiculos/${vehicleId}`);
  const existing = await db
    .select({ position: vehiclePhotos.position })
    .from(vehiclePhotos)
    .where(eq(vehiclePhotos.vehicleId, vehicleId))
    .orderBy(asc(vehiclePhotos.position));
  const position = existing.length ? existing[existing.length - 1].position + 1 : 0;
  const id = randomUUID();
  await db.insert(vehiclePhotos).values({
    id,
    vehicleId,
    ...processed,
    alt: meta.alt ?? null,
    angle: meta.angle ?? null,
    kind: meta.kind ?? "galeria",
    focalX: meta.focalX ?? 50,
    focalY: meta.focalY ?? 50,
    position,
  });
  await db.update(vehicles).set({ updatedAt: Date.now() }).where(eq(vehicles.id, vehicleId));
  return { id, ...processed, position };
}

export async function deletePhoto(photoId: string) {
  const [photo] = await db.select().from(vehiclePhotos).where(eq(vehiclePhotos.id, photoId)).limit(1);
  if (!photo) return null;
  await db.delete(vehiclePhotos).where(eq(vehiclePhotos.id, photoId));
  await storage().delete(photo.storageKey).catch(() => undefined);
  return photo.vehicleId;
}

export async function reorderPhotos(vehicleId: string, orderedIds: string[]) {
  const current = await db.select({ id: vehiclePhotos.id }).from(vehiclePhotos).where(eq(vehiclePhotos.vehicleId, vehicleId));
  const valid = new Set(current.map((p) => p.id));
  const ids = orderedIds.filter((id) => valid.has(id));
  await db.transaction(async (tx) => {
    for (const [index, id] of ids.entries()) {
      await tx.update(vehiclePhotos).set({ position: index }).where(eq(vehiclePhotos.id, id));
    }
  });
}
