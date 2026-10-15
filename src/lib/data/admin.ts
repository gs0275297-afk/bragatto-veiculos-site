import "server-only";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { storage } from "@/lib/storage";

const { vehicles: v, vehiclePhotos: ph, users } = schema;

/** Consultas do painel — sem cache, sempre atualizadas. Chame apenas após requireUser(). */
export async function listAdminVehicles() {
  const rows = await db
    .select({
      id: v.id,
      slug: v.slug,
      brand: v.brand,
      model: v.model,
      version: v.version,
      yearManufacture: v.yearManufacture,
      yearModel: v.yearModel,
      priceCents: v.priceCents,
      status: v.status,
      published: v.published,
      featured: v.featured,
      isDemo: v.isDemo,
      model3dEnabled: v.model3dEnabled,
      hasModel: sql<number>`(vehicles.model3d_key is not null or vehicles.model3d_url is not null)`,
      updatedAt: v.updatedAt,
      // subconsultas com nomes explícitos (o Drizzle omite o nome da tabela em consultas simples)
      cover: sql<string | null>`(select p.storage_key from vehicle_photos p where p.vehicle_id = vehicles.id and p.kind = 'galeria' order by p.position limit 1)`,
      photoCount: sql<number>`(select count(*) from vehicle_photos p where p.vehicle_id = vehicles.id)`,
    })
    .from(v)
    .orderBy(desc(v.updatedAt));
  return rows.map((r) => ({ ...r, hasModel: Boolean(r.hasModel), coverSrc: r.cover ? storage().publicUrl(r.cover) : null }));
}

export async function getAdminVehicle(id: string) {
  const [row] = await db.select().from(v).where(eq(v.id, id)).limit(1);
  if (!row) return null;
  const photos = await db.select().from(ph).where(eq(ph.vehicleId, id)).orderBy(asc(ph.position), asc(ph.createdAt));
  return {
    ...row,
    model3dPublicUrl: row.model3dKey ? storage().publicUrl(row.model3dKey) : row.model3dUrl,
    model3dPosterSrc: row.model3dPosterKey ? storage().publicUrl(row.model3dPosterKey) : null,
    photos: photos.map((p) => ({ ...p, src: storage().publicUrl(p.storageKey) })),
  };
}

export type AdminVehicle = NonNullable<Awaited<ReturnType<typeof getAdminVehicle>>>;
export type AdminPhoto = AdminVehicle["photos"][number];

export async function listUsers() {
  return db
    .select({ id: users.id, email: users.email, name: users.name, role: users.role, lastLoginAt: users.lastLoginAt, createdAt: users.createdAt })
    .from(users)
    .orderBy(asc(users.createdAt));
}
