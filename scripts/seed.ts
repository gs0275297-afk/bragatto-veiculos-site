/**
 * Carga inicial do estoque com os dados REAIS fornecidos pela loja
 * (publicações do Instagram @bragattoveiculos + fotos tratadas em seed/photos).
 *
 * - Nenhum dado foi inventado. Campos não informados ficam vazios e não aparecem no site.
 * - Preços não informados nas publicações ficam como "sob consulta".
 * - Itens que dependem de confirmação da loja estão anotados em `internalNotes` (visível só no painel).
 *
 * Execução idempotente: veículos cujo slug já existe são ignorados.
 * Uso: npm run db:seed
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import type { PhotoAngle } from "@/lib/db/schema";
import { vehicleSlugBase } from "@/lib/slug";
import { vehicleInputSchema } from "@/lib/vehicle-input";
import { addPhoto, createVehicle } from "@/lib/vehicle-service";
import { angleLabel } from "@/lib/vehicle-labels";

type SeedPhoto = { file: string; angle: PhotoAngle; focal?: [number, number] };
type SeedVehicle = {
  data: Record<string, unknown>;
  photos: SeedPhoto[];
  /** Data da publicação original no Instagram (ordena "mais recentes"). */
  postedAt?: string;
};

const CONFIRMAR =
  "Dados extraídos da publicação no Instagram. Confirmar disponibilidade, quilometragem atual e preço antes de divulgar.";

const VEHICLES: SeedVehicle[] = [
  {
    postedAt: "2026-08-14T12:00:00-04:00",
    data: {
      brand: "Chevrolet",
      model: "Tracker",
      version: "Premier 1.2 Turbo",
      bodyType: "SUV",
      yearModel: "2023",
      mileageKm: "64167",
      transmission: "automatico",
      fuel: "flex",
      color: "Preto",
      engine: "1.2 Turbo",
      description:
        "Chevrolet Tracker Premier 1.2 Turbo 2023, flex, com 64 mil km. Versão equipada com teto solar, bancos em couro, chave presencial, carregador de celular por indução e kit multimídia com CarPlay, conforme itens informados pela loja.",
      features: [
        "Ar-condicionado",
        "Vidros e travas elétricas",
        "Airbag",
        "Kit multimídia com CarPlay",
        "Start/Stop",
        "Carregador de celular por indução",
        "Bancos em couro",
        "Teto solar",
        "Chave presencial",
      ].join("\n"),
      status: "disponivel",
      published: true,
      featured: true,
      internalNotes: `${CONFIRMAR} Câmbio automático identificado pelas fotos (alavanca e painel) — a legenda não cita o câmbio. Km do hodômetro na foto: 64.167.`,
    },
    photos: [
      { file: "tracker-01", angle: "dianteira-34", focal: [52, 58] },
      { file: "tracker-02", angle: "frente", focal: [48, 52] },
      { file: "tracker-03", angle: "dianteira-34", focal: [60, 55] },
      { file: "tracker-04", angle: "interior", focal: [50, 45] },
      { file: "tracker-05", angle: "painel", focal: [50, 60] },
    ],
  },
  {
    postedAt: "2026-07-21T12:00:00-04:00",
    data: {
      brand: "Honda",
      model: "Civic",
      version: "EXS 1.8",
      bodyType: "Sedã",
      yearManufacture: "2007",
      yearModel: "2008",
      mileageKm: "266726",
      transmission: "automatico",
      fuel: "flex",
      color: "Cinza",
      engine: "1.8",
      description:
        "Honda Civic EXS 1.8 automático 2007/2008, flex, com 266.726 km. Entre os itens informados pela loja estão bancos em couro, câmera de ré, kit multimídia e volante multifuncional.",
      features: [
        "Ar-condicionado",
        "Direção hidráulica",
        "Kit multimídia",
        "Volante multifuncional",
        "Airbag",
        "Bancos em couro",
        "Vidros elétricos",
        "Travas elétricas",
        "Volante com regulagem",
        "Retrovisores elétricos",
        "Câmera de ré",
      ].join("\n"),
      status: "disponivel",
      published: true,
      featured: false,
      internalNotes: CONFIRMAR,
    },
    photos: [
      { file: "civic-01", angle: "dianteira-34", focal: [50, 62] },
      { file: "civic-02", angle: "dianteira-34", focal: [55, 60] },
      { file: "civic-03", angle: "frente", focal: [50, 62] },
      { file: "civic-04", angle: "interior", focal: [45, 50] },
      { file: "civic-05", angle: "interior", focal: [50, 55] },
    ],
  },
  {
    postedAt: "2026-07-20T12:00:00-04:00",
    data: {
      brand: "Chevrolet",
      model: "Onix",
      version: "LT 1.0",
      bodyType: "Hatch",
      yearManufacture: "2013",
      yearModel: "2013",
      mileageKm: "120487",
      transmission: "manual",
      fuel: "flex",
      color: "Preto",
      engine: "1.0",
      description:
        "Chevrolet Onix LT 1.0 hatch 2013/2013, flex, com 120 mil km. Itens informados pela loja: ar-condicionado, direção hidráulica, vidros e travas elétricas, airbag e som.",
      features: ["Ar-condicionado", "Direção hidráulica", "Vidros elétricos", "Travas elétricas", "Airbag", "Som"].join("\n"),
      status: "disponivel",
      published: true,
      featured: false,
      internalNotes: `${CONFIRMAR} Câmbio manual identificado pela foto do interior. Km do hodômetro na foto: 120.487.`,
    },
    photos: [
      { file: "onix-lt-01", angle: "dianteira-34", focal: [50, 62] },
      { file: "onix-lt-02", angle: "dianteira-34", focal: [55, 60] },
      { file: "onix-lt-03", angle: "frente", focal: [50, 64] },
      { file: "onix-lt-04", angle: "traseira-34", focal: [40, 62] },
      { file: "onix-lt-05", angle: "interior", focal: [50, 50] },
      { file: "onix-lt-06", angle: "interior", focal: [40, 55] },
      { file: "onix-lt-07", angle: "interior", focal: [55, 55] },
      { file: "onix-lt-08", angle: "painel", focal: [60, 55] },
    ],
  },
  {
    postedAt: "2026-07-20T13:00:00-04:00",
    data: {
      brand: "Chevrolet",
      model: "Onix Sedan",
      version: "LTZ 1.0 Turbo",
      bodyType: "Sedã",
      yearManufacture: "2024",
      yearModel: "2025",
      mileageKm: "61016",
      transmission: "automatico",
      fuel: "flex",
      color: "Azul",
      engine: "1.0 Turbo",
      description:
        "Chevrolet Onix Sedan LTZ 1.0 Turbo automático 2024/2025, flex, com 61.016 km. Itens informados pela loja incluem chave presencial, sensor e câmera de ré, Isofix, kit multimídia e volante multifuncional.",
      features: [
        "Ar-condicionado",
        "Vidros elétricos",
        "Isofix",
        "Bancos em couro",
        "Airbag",
        "Volante multifuncional",
        "Kit multimídia",
        "Start/Stop",
        "Chave presencial",
        "Sensor de ré",
        "Câmera de ré",
      ].join("\n"),
      status: "disponivel",
      published: true,
      featured: true,
      internalNotes: `${CONFIRMAR} A legenda original cita "Direção" sem especificar o tipo — confirmar e adicionar aos opcionais.`,
    },
    photos: [
      { file: "onix-ltz-01", angle: "dianteira-34", focal: [50, 60] },
      { file: "onix-ltz-02", angle: "frente", focal: [50, 55] },
      { file: "onix-ltz-03", angle: "interior", focal: [55, 55] },
      { file: "onix-ltz-04", angle: "interior", focal: [55, 50] },
      { file: "onix-ltz-05", angle: "painel", focal: [50, 45] },
    ],
  },
  {
    data: {
      brand: "Citroën",
      model: "C4 Cactus",
      version: "Feel Pack 1.6",
      bodyType: "SUV",
      yearModel: "2022",
      mileageKm: "50000",
      transmission: "automatico",
      color: "Branco",
      engine: "1.6",
      price: "84.900",
      description:
        "Citroën C4 Cactus Feel Pack 1.6 automático 2022, com 50.000 km. Segundo a loja, o veículo está revisado e com quatro pneus novos.",
      features: ["4 pneus novos (informado pela loja)", "Revisado (informado pela loja)"].join("\n"),
      status: "disponivel",
      published: false,
      featured: false,
      internalNotes:
        "RASCUNHO — não publicado. As fotos foram feitas em outra loja (Arsênio Veículos: letreiros e molduras de placa — as molduras foram desfocadas). Confirmar o direito de uso das imagens ou substituir por fotos próprias antes de publicar. Combustível não informado na publicação.",
    },
    photos: [
      { file: "cactus-01", angle: "dianteira-34", focal: [50, 58] },
      { file: "cactus-02", angle: "frente", focal: [45, 55] },
      { file: "cactus-03", angle: "dianteira-34", focal: [45, 55] },
      { file: "cactus-04", angle: "traseira-34", focal: [45, 60] },
    ],
  },
];

async function main() {
  const photosDir = path.resolve("seed/photos");
  for (const item of VEHICLES) {
    const input = vehicleInputSchema.parse(item.data);
    const slug = vehicleSlugBase({ ...input, yearModel: input.yearModel! });
    const existing = await db.select({ id: schema.vehicles.id }).from(schema.vehicles).where(eq(schema.vehicles.slug, slug));
    if (existing.length) {
      console.log(`• já existe: ${slug}`);
      continue;
    }
    const { id } = await createVehicle(input);
    if (item.postedAt) {
      const t = new Date(item.postedAt).getTime();
      await db
        .update(schema.vehicles)
        .set({ publishedAt: input.published ? t : null, createdAt: t })
        .where(eq(schema.vehicles.id, id));
    }
    const name = [input.brand, input.model, input.version].filter(Boolean).join(" ");
    for (const photo of item.photos) {
      const buffer = await readFile(path.join(photosDir, `${photo.file}.jpg`));
      await addPhoto(id, buffer, {
        angle: photo.angle,
        alt: `${name} ${input.color ? input.color.toLowerCase() : ""} — ${angleLabel[photo.angle].toLowerCase()}`.replace(/\s+/g, " "),
        focalX: photo.focal?.[0],
        focalY: photo.focal?.[1],
      });
    }
    console.log(`✓ ${slug} (${item.photos.length} fotos)${input.published ? "" : " — rascunho"}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
