/**
 * Dados FICTÍCIOS para testar filtros, ordenação e paginação durante o desenvolvimento.
 *
 * - Todos os registros recebem `isDemo = true` e a versão "DEMONSTRAÇÃO".
 * - Só aparecem no site com SHOW_DEMO_DATA=true e fora de produção (NODE_ENV !== "production").
 * - Não têm fotos: nenhuma imagem real é associada a um veículo inexistente.
 *
 * Uso:  npm run db:seed-demo            (cria)
 *       npm run db:seed-demo -- --remove (remove todos os registros de demonstração)
 */
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { vehicleInputSchema } from "@/lib/vehicle-input";
import { createVehicle, deleteVehicle } from "@/lib/vehicle-service";

const MODELS: [string, string, string, string][] = [
  ["Volkswagen", "Polo", "Hatch", "1.0"],
  ["Fiat", "Argo", "Hatch", "1.3"],
  ["Toyota", "Corolla", "Sedã", "2.0"],
  ["Hyundai", "HB20", "Hatch", "1.0"],
  ["Jeep", "Renegade", "SUV", "1.8"],
  ["Renault", "Kwid", "Hatch", "1.0"],
  ["Volkswagen", "T-Cross", "SUV", "1.0 TSI"],
  ["Fiat", "Toro", "Picape", "1.3 Turbo"],
  ["Toyota", "Hilux", "Picape", "2.8"],
  ["Honda", "HR-V", "SUV", "1.5"],
  ["Nissan", "Kicks", "SUV", "1.6"],
  ["Ford", "Ranger", "Picape", "3.2"],
  ["Chevrolet", "S10", "Picape", "2.8"],
  ["Peugeot", "208", "Hatch", "1.6"],
  ["Volkswagen", "Saveiro", "Picape", "1.6"],
  ["Hyundai", "Creta", "SUV", "1.6"],
];

// gerador determinístico para que os dados sejam reproduzíveis
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = <T,>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];

async function remove() {
  const rows = await db.select({ id: schema.vehicles.id }).from(schema.vehicles).where(eq(schema.vehicles.isDemo, true));
  for (const r of rows) await deleteVehicle(r.id);
  console.log(`✓ ${rows.length} registros de demonstração removidos`);
}

async function create() {
  for (const [brand, model, bodyType, engine] of MODELS) {
    const year = 2012 + Math.floor(rand() * 13);
    const input = vehicleInputSchema.parse({
      brand,
      model,
      version: "DEMONSTRAÇÃO",
      bodyType,
      engine,
      yearManufacture: String(year),
      yearModel: String(year + (rand() > 0.5 ? 1 : 0)),
      mileageKm: String(Math.round((5 + rand() * 180) * 1000)),
      transmission: pick(["manual", "automatico", "cvt"] as const),
      fuel: pick(["flex", "flex", "gasolina", "diesel"] as const),
      price: rand() > 0.15 ? String(Math.round(35 + rand() * 210) * 1000) : "",
      description: "Registro fictício de demonstração para testes do site. Não corresponde a um veículo real.",
      features: "Item de demonstração",
      status: rand() > 0.85 ? "reservado" : "disponivel",
      published: true,
      internalNotes: "DADO FICTÍCIO — gerado por scripts/seed-demo.ts",
    });
    await createVehicle(input, { isDemo: true });
  }
  console.log(`✓ ${MODELS.length} registros de demonstração criados (visíveis apenas com SHOW_DEMO_DATA=true em desenvolvimento)`);
}

(process.argv.includes("--remove") ? remove() : create())
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
