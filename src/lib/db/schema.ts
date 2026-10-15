import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const TRANSMISSIONS = ["manual", "automatico", "cvt", "automatizado"] as const;
export const FUELS = ["flex", "gasolina", "etanol", "diesel", "hibrido", "eletrico", "gnv"] as const;
export const STATUSES = ["disponivel", "reservado", "vendido"] as const;
export const PHOTO_ANGLES = [
  "frente",
  "dianteira-34",
  "lateral",
  "traseira-34",
  "traseira",
  "interior",
  "painel",
  "detalhe",
] as const;
/**
 * digitalizacao  = escaneamento/fotogrametria DESTE exemplar anunciado.
 * representativo = modelo licenciado do mesmo modelo/versão, exibido com aviso de que é ilustrativo.
 */
export const MODEL3D_KINDS = ["digitalizacao", "representativo"] as const;
export const MODEL3D_FORMATS = ["glb", "gltf"] as const;
/** galeria = fotos do anúncio; giro = quadros sequenciais para o giro 360° (mín. 12). */
export const PHOTO_KINDS = ["galeria", "giro"] as const;
export const ROLES = ["owner", "editor"] as const;

export type Transmission = (typeof TRANSMISSIONS)[number];
export type Fuel = (typeof FUELS)[number];
export type VehicleStatus = (typeof STATUSES)[number];
export type PhotoAngle = (typeof PHOTO_ANGLES)[number];
export type Model3DKind = (typeof MODEL3D_KINDS)[number];
export type Model3DFormat = (typeof MODEL3D_FORMATS)[number];
export type PhotoKind = (typeof PHOTO_KINDS)[number];
export type Role = (typeof ROLES)[number];

const now = sql`(unixepoch() * 1000)`;

export const vehicles = sqliteTable(
  "vehicles",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    brand: text("brand").notNull(),
    model: text("model").notNull(),
    version: text("version"),
    bodyType: text("body_type"),
    yearManufacture: integer("year_manufacture"),
    yearModel: integer("year_model").notNull(),
    mileageKm: integer("mileage_km"),
    transmission: text("transmission", { enum: TRANSMISSIONS }),
    fuel: text("fuel", { enum: FUELS }),
    color: text("color"),
    engine: text("engine"),
    doors: integer("doors"),
    /** Em centavos. `null` = preço sob consulta. */
    priceCents: integer("price_cents"),
    description: text("description"),
    /** JSON: string[] */
    features: text("features", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    /** Marca + modelo + versão normalizados (sem acentos, minúsculos) para a busca. */
    searchText: text("search_text").notNull().default(""),
    status: text("status", { enum: STATUSES }).notNull().default("disponivel"),
    published: integer("published", { mode: "boolean" }).notNull().default(false),
    featured: integer("featured", { mode: "boolean" }).notNull().default(false),
    /** Dados fictícios de desenvolvimento — nunca exibidos em produção. */
    isDemo: integer("is_demo", { mode: "boolean" }).notNull().default(false),
    /** Visível apenas no painel. */
    internalNotes: text("internal_notes"),
    /* ---- visualização 3D (opcional, por veículo) ---- */
    model3dEnabled: integer("model3d_enabled", { mode: "boolean" }).notNull().default(false),
    /** Arquivo enviado ao armazenamento do site (tem prioridade sobre a URL externa). */
    model3dKey: text("model3d_key"),
    /** URL https externa validada (CDN/bucket autorizado). */
    model3dUrl: text("model3d_url"),
    model3dFormat: text("model3d_format", { enum: MODEL3D_FORMATS }),
    model3dKind: text("model3d_kind", { enum: MODEL3D_KINDS }),
    /** Origem, autoria e licença do modelo — obrigatório para ativar. */
    model3dSource: text("model3d_source"),
    model3dPosterKey: text("model3d_poster_key"),
    model3dSizeBytes: integer("model3d_size_bytes"),
    publishedAt: integer("published_at"),
    createdAt: integer("created_at").notNull().default(now),
    updatedAt: integer("updated_at").notNull().default(now),
  },
  (t) => [
    uniqueIndex("vehicles_slug_idx").on(t.slug),
    index("vehicles_listing_idx").on(t.published, t.status),
  ],
);

export const vehiclePhotos = sqliteTable(
  "vehicle_photos",
  {
    id: text("id").primaryKey(),
    vehicleId: text("vehicle_id")
      .notNull()
      .references(() => vehicles.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    blurDataUrl: text("blur_data_url"),
    alt: text("alt"),
    angle: text("angle", { enum: PHOTO_ANGLES }),
    kind: text("kind", { enum: PHOTO_KINDS }).notNull().default("galeria"),
    /** Ponto focal em % (0–100) usado como object-position. */
    focalX: real("focal_x").notNull().default(50),
    focalY: real("focal_y").notNull().default(50),
    position: integer("position").notNull().default(0),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [index("vehicle_photos_vehicle_idx").on(t.vehicleId, t.position)],
);

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: ROLES }).notNull().default("editor"),
    lastLoginAt: integer("last_login_at"),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

export const sessions = sqliteTable(
  "sessions",
  {
    /** SHA-256 do token guardado no cookie. O token em si nunca é salvo. */
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at").notNull(),
    createdAt: integer("created_at").notNull().default(now),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const loginAttempts = sqliteTable("login_attempts", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  windowStart: integer("window_start").notNull(),
});

export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
export type VehiclePhoto = typeof vehiclePhotos.$inferSelect;
export type User = typeof users.$inferSelect;
