import { z } from "zod";
import { FUELS, MODEL3D_KINDS, PHOTO_ANGLES, PHOTO_KINDS, STATUSES, TRANSMISSIONS } from "@/lib/db/schema";

const currentYear = new Date().getFullYear();

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres`)
    .transform((s) => (s === "" ? null : s))
    .nullable()
    .optional()
    .transform((s) => s ?? null);

const optionalInt = (min: number, max: number, label: string) =>
  z
    .union([z.string(), z.number()])
    .optional()
    .nullable()
    .transform((val, ctx) => {
      if (val == null) return null;
      const raw = typeof val === "number" ? String(val) : val.replace(/\D/g, "");
      if (raw === "") return null;
      const n = Number(raw);
      if (!Number.isInteger(n) || n < min || n > max) {
        ctx.addIssue({ code: "custom", message: `${label} inválido` });
        return z.NEVER;
      }
      return n;
    });

/** Aceita "84.900", "84900", "84.900,00" ou "R$ 84.900". Retorna centavos. */
export function parsePriceToCents(value: string): number | null {
  const cleaned = value.replace(/[^\d,.]/g, "");
  if (!cleaned) return null;
  const hasCents = /,\d{1,2}$/.test(cleaned);
  const [intPart, centsPart = "0"] = hasCents ? cleaned.split(",") : [cleaned.replace(/,/g, ""), "0"];
  const reais = Number(intPart.replace(/\./g, ""));
  if (!Number.isFinite(reais)) return null;
  return reais * 100 + Number(centsPart.padEnd(2, "0").slice(0, 2));
}

const enumOrNull = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .union([z.enum(values), z.literal("")])
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.boolean()])
  .optional()
  .transform((v) => v === true || v === "on" || v === "true");

export const vehicleInputSchema = z
  .object({
    brand: z.string().trim().min(2, "Informe a marca").max(40),
    model: z.string().trim().min(1, "Informe o modelo").max(60),
    version: optionalText(80),
    bodyType: optionalText(30),
    yearManufacture: optionalInt(1950, currentYear + 1, "Ano de fabricação"),
    yearModel: optionalInt(1950, currentYear + 2, "Ano do modelo").refine((v) => v != null, "Informe o ano do modelo"),
    mileageKm: optionalInt(0, 2_000_000, "Quilometragem"),
    transmission: enumOrNull(TRANSMISSIONS),
    fuel: enumOrNull(FUELS),
    color: optionalText(30),
    engine: optionalText(40),
    doors: optionalInt(2, 6, "Número de portas"),
    price: z
      .string()
      .optional()
      .transform((s, ctx) => {
        if (!s || !s.trim()) return null;
        const cents = parsePriceToCents(s);
        if (cents == null || cents <= 0 || cents > 100_000_000_00) {
          ctx.addIssue({ code: "custom", message: "Preço inválido" });
          return z.NEVER;
        }
        return cents;
      }),
    description: optionalText(4000),
    features: z
      .string()
      .optional()
      .transform((s) =>
        (s ?? "")
          .split(/\r?\n/)
          .map((l) => l.replace(/^[-–•✓✔\s]+/, "").trim())
          .filter(Boolean)
          .slice(0, 60),
      ),
    status: z.enum(STATUSES).default("disponivel"),
    published: checkbox,
    featured: checkbox,
    internalNotes: optionalText(2000),
    slug: optionalText(90),
  })
  .superRefine((v, ctx) => {
    if (v.yearManufacture && v.yearModel && (v.yearModel < v.yearManufacture || v.yearModel > v.yearManufacture + 1)) {
      ctx.addIssue({ code: "custom", path: ["yearModel"], message: "Ano do modelo deve ser igual ou 1 ano após a fabricação" });
    }
  });

export type VehicleInput = z.output<typeof vehicleInputSchema>;

export const photoUpdateSchema = z.object({
  id: z.string().min(1),
  alt: optionalText(160),
  angle: enumOrNull(PHOTO_ANGLES),
  kind: z.enum(PHOTO_KINDS).default("galeria"),
  focalX: z.coerce.number().min(0).max(100),
  focalY: z.coerce.number().min(0).max(100),
});

export const BODY_TYPES = ["Hatch", "Sedã", "SUV", "Picape", "Minivan", "Cupê", "Conversível", "Perua", "Utilitário"];

export const MODEL3D_MAX_BYTES = Number(process.env.MODEL3D_MAX_MB ?? 40) * 1024 * 1024;

/** Metadados do modelo 3D editáveis no painel (o arquivo/URL tem fluxo próprio de validação). */
export const model3dMetaSchema = z
  .object({
    model3dEnabled: checkbox,
    model3dKind: enumOrNull(MODEL3D_KINDS),
    model3dSource: optionalText(300),
  })
  .superRefine((v, ctx) => {
    if (v.model3dEnabled && !v.model3dKind)
      ctx.addIssue({ code: "custom", path: ["model3dKind"], message: "Informe se é digitalização deste veículo ou modelo ilustrativo" });
    if (v.model3dEnabled && !v.model3dSource)
      ctx.addIssue({ code: "custom", path: ["model3dSource"], message: "Informe a origem e a licença do modelo" });
  });
