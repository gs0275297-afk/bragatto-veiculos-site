import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { and, asc, desc, eq, gte, inArray, like, lte, ne, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import type { Vehicle, VehiclePhoto } from "@/lib/db/schema";
import { normalizeSearch, PAGE_SIZE, type ListingFilters } from "@/lib/filters";
import { storage } from "@/lib/storage";

export const VEHICLES_TAG = "vehicles";

const { vehicles: v, vehiclePhotos: ph } = schema;

export type PublicPhoto = {
  id: string;
  src: string;
  width: number;
  height: number;
  blurDataUrl: string | null;
  alt: string | null;
  angle: VehiclePhoto["angle"];
  focalX: number;
  focalY: number;
};

export type PublicModel3D = {
  url: string;
  format: NonNullable<Vehicle["model3dFormat"]>;
  kind: NonNullable<Vehicle["model3dKind"]>;
  source: string;
  posterSrc: string | null;
  sizeBytes: number | null;
};

type HiddenFields =
  | "internalNotes"
  | "searchText"
  | "published"
  | "createdAt"
  | "model3dEnabled"
  | "model3dKey"
  | "model3dUrl"
  | "model3dFormat"
  | "model3dKind"
  | "model3dSource"
  | "model3dPosterKey"
  | "model3dSizeBytes";

export type PublicVehicle = Omit<Vehicle, HiddenFields> & {
  photos: PublicPhoto[];
  /** Quadros do giro 360°; vazio quando não há quadros suficientes. */
  spin: PublicPhoto[];
  model3d: PublicModel3D | null;
};

/** Mínimo de quadros sequenciais para oferecer o giro 360°. */
export const MIN_SPIN_FRAMES = 12;

export type VehicleCardData = Pick<
  Vehicle,
  | "id"
  | "slug"
  | "brand"
  | "model"
  | "version"
  | "yearManufacture"
  | "yearModel"
  | "mileageKm"
  | "transmission"
  | "fuel"
  | "priceCents"
  | "status"
  | "isDemo"
  | "featured"
> & { cover: PublicPhoto | null; second: PublicPhoto | null; photoCount: number; has3d: boolean; has360: boolean };

/** Demonstração só aparece em desenvolvimento e quando explicitamente habilitada. */
const showDemo = () => process.env.NODE_ENV !== "production" && process.env.SHOW_DEMO_DATA === "true";

function visible(): SQL {
  const base = eq(v.published, true);
  return showDemo() ? base : and(base, eq(v.isDemo, false))!;
}

function toPublicPhoto(p: VehiclePhoto): PublicPhoto {
  return {
    id: p.id,
    src: storage().publicUrl(p.storageKey),
    width: p.width,
    height: p.height,
    blurDataUrl: p.blurDataUrl,
    alt: p.alt,
    angle: p.angle,
    focalX: p.focalX,
    focalY: p.focalY,
  };
}

/** O 3D só é público quando ativado, com arquivo/URL, tipo e origem informados. */
function publicModel3D(v: Vehicle): PublicModel3D | null {
  if (!v.model3dEnabled || !v.model3dFormat || !v.model3dKind || !v.model3dSource) return null;
  const url = v.model3dKey ? storage().publicUrl(v.model3dKey) : v.model3dUrl;
  if (!url) return null;
  return {
    url,
    format: v.model3dFormat,
    kind: v.model3dKind,
    source: v.model3dSource,
    posterSrc: v.model3dPosterKey ? storage().publicUrl(v.model3dPosterKey) : null,
    sizeBytes: v.model3dSizeBytes,
  };
}

async function photosFor(ids: string[]) {
  const map = new Map<string, VehiclePhoto[]>();
  if (!ids.length) return map;
  const rows = await db.select().from(ph).where(inArray(ph.vehicleId, ids)).orderBy(asc(ph.position), asc(ph.createdAt));
  for (const row of rows) {
    const list = map.get(row.vehicleId) ?? [];
    list.push(row);
    map.set(row.vehicleId, list);
  }
  return map;
}

async function toCards(rows: Vehicle[]): Promise<VehicleCardData[]> {
  const photos = await photosFor(rows.map((r) => r.id));
  return rows.map((r) => {
    const all = photos.get(r.id) ?? [];
    const list = all.filter((p) => p.kind === "galeria");
    return {
      id: r.id,
      slug: r.slug,
      brand: r.brand,
      model: r.model,
      version: r.version,
      yearManufacture: r.yearManufacture,
      yearModel: r.yearModel,
      mileageKm: r.mileageKm,
      transmission: r.transmission,
      fuel: r.fuel,
      priceCents: r.priceCents,
      status: r.status,
      isDemo: r.isDemo,
      featured: r.featured,
      cover: list[0] ? toPublicPhoto(list[0]) : null,
      second: list[1] ? toPublicPhoto(list[1]) : null,
      photoCount: list.length,
      has3d: publicModel3D(r) !== null,
      has360: all.filter((p) => p.kind === "giro").length >= MIN_SPIN_FRAMES,
    };
  });
}

function orderBy(sort: ListingFilters["ordem"]): SQL[] {
  switch (sort) {
    case "preco-asc":
      return [sql`${v.priceCents} is null`, asc(v.priceCents)];
    case "preco-desc":
      return [sql`${v.priceCents} is null`, desc(v.priceCents)];
    case "ano-desc":
      return [desc(v.yearModel), desc(v.yearManufacture)];
    case "ano-asc":
      return [asc(v.yearModel), asc(v.yearManufacture)];
    case "km-asc":
      return [sql`${v.mileageKm} is null`, asc(v.mileageKm)];
    default:
      return [desc(v.publishedAt), desc(v.createdAt)];
  }
}

export async function getListing(filters: ListingFilters) {
  "use cache";
  cacheTag(VEHICLES_TAG);
  cacheLife("hours");

  const where: (SQL | undefined)[] = [visible(), ne(v.status, "vendido")];
  if (filters.q) {
    for (const word of normalizeSearch(filters.q).split(" ").filter(Boolean)) {
      where.push(like(v.searchText, `%${word}%`));
    }
  }
  if (filters.marca) where.push(sql`lower(${v.brand}) = ${filters.marca.toLowerCase()}`);
  if (filters.precoMin) where.push(gte(v.priceCents, filters.precoMin * 100));
  if (filters.precoMax) where.push(lte(v.priceCents, filters.precoMax * 100));
  if (filters.anoMin) where.push(gte(v.yearModel, filters.anoMin));
  if (filters.anoMax) where.push(lte(v.yearModel, filters.anoMax));
  if (filters.kmMax) where.push(lte(v.mileageKm, filters.kmMax));
  if (filters.cambio.length) where.push(inArray(v.transmission, filters.cambio));
  if (filters.combustivel.length) where.push(inArray(v.fuel, filters.combustivel));

  const condition = and(...where);
  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(v).where(condition);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(filters.pagina, pages);
  const rows = await db
    .select()
    .from(v)
    .where(condition)
    .orderBy(...orderBy(filters.ordem))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  return { items: await toCards(rows), total, page, pages };
}

export type Facets = Awaited<ReturnType<typeof getFacets>>;

export async function getFacets() {
  "use cache";
  cacheTag(VEHICLES_TAG);
  cacheLife("hours");

  const rows = await db
    .select({
      brand: v.brand,
      yearModel: v.yearModel,
      priceCents: v.priceCents,
      mileageKm: v.mileageKm,
      transmission: v.transmission,
      fuel: v.fuel,
    })
    .from(v)
    .where(and(visible(), ne(v.status, "vendido")));

  const brands = new Map<string, number>();
  const years = new Set<number>();
  const transmissions = new Set<string>();
  const fuels = new Set<string>();
  let priceMin = Infinity;
  let priceMax = 0;
  for (const r of rows) {
    brands.set(r.brand, (brands.get(r.brand) ?? 0) + 1);
    years.add(r.yearModel);
    if (r.transmission) transmissions.add(r.transmission);
    if (r.fuel) fuels.add(r.fuel);
    if (r.priceCents != null) {
      priceMin = Math.min(priceMin, r.priceCents / 100);
      priceMax = Math.max(priceMax, r.priceCents / 100);
    }
  }
  return {
    total: rows.length,
    brands: [...brands.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR")).map(([name, count]) => ({ name, count })),
    years: [...years].sort((a, b) => b - a),
    priceRange: Number.isFinite(priceMin) ? { min: priceMin, max: priceMax } : null,
    transmissions: [...transmissions],
    fuels: [...fuels],
  };
}

export async function getVehicleBySlug(slug: string): Promise<PublicVehicle | null> {
  "use cache";
  cacheTag(VEHICLES_TAG);
  cacheLife("hours");

  const [row] = await db
    .select()
    .from(v)
    .where(and(visible(), eq(v.slug, slug)))
    .limit(1);
  if (!row) return null;
  const photos = (await photosFor([row.id])).get(row.id) ?? [];
  const spin = photos.filter((p) => p.kind === "giro");
  const {
    internalNotes: _n,
    searchText: _s,
    published: _p,
    createdAt: _c,
    model3dEnabled: _m1,
    model3dKey: _m2,
    model3dUrl: _m3,
    model3dFormat: _m4,
    model3dKind: _m5,
    model3dSource: _m6,
    model3dPosterKey: _m7,
    model3dSizeBytes: _m8,
    ...rest
  } = row;
  return {
    ...rest,
    photos: photos.filter((p) => p.kind === "galeria").map(toPublicPhoto),
    spin: spin.length >= MIN_SPIN_FRAMES ? spin.map(toPublicPhoto) : [],
    model3d: publicModel3D(row),
  };
}

/** Destaques para o hero: veículos marcados como destaque; completa com os mais recentes. */
export async function getShowcase(limit = 5) {
  "use cache";
  cacheTag(VEHICLES_TAG);
  cacheLife("hours");

  const rows = await db
    .select()
    .from(v)
    .where(and(visible(), ne(v.status, "vendido")))
    .orderBy(desc(v.featured), desc(v.publishedAt))
    .limit(limit);
  return (await toCards(rows)).filter((c) => c.cover);
}

export async function getLatest(limit = 6) {
  "use cache";
  cacheTag(VEHICLES_TAG);
  cacheLife("hours");

  const rows = await db
    .select()
    .from(v)
    .where(and(visible(), ne(v.status, "vendido")))
    .orderBy(desc(v.publishedAt), desc(v.createdAt))
    .limit(limit);
  return toCards(rows);
}

export async function getRelated(vehicleId: string, brand: string, limit = 3) {
  "use cache";
  cacheTag(VEHICLES_TAG);
  cacheLife("hours");

  const rows = await db
    .select()
    .from(v)
    .where(and(visible(), ne(v.status, "vendido"), ne(v.id, vehicleId)))
    .orderBy(sql`case when ${v.brand} = ${brand} then 0 else 1 end`, desc(v.publishedAt))
    .limit(limit);
  return toCards(rows);
}

export async function getAllPublishedSlugs() {
  "use cache";
  cacheTag(VEHICLES_TAG);
  cacheLife("hours");

  return db
    .select({ slug: v.slug, updatedAt: v.updatedAt, status: v.status })
    .from(v)
    .where(visible())
    .orderBy(desc(v.publishedAt));
}

/** Veículos citados em JSON-LD/listas do rodapé, sem fotos. */
export async function getBrandsInStock() {
  const facets = await getFacets();
  return facets.brands;
}

