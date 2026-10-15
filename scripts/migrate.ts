import { mkdirSync } from "node:fs";
import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "@/lib/db/client";

async function main() {
  const url = process.env.DATABASE_URL ?? "file:./data/bragatto.db";
  if (url.startsWith("file:")) mkdirSync("./data", { recursive: true });
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("✓ Banco de dados atualizado:", url.startsWith("file:") ? url : url.replace(/\/\/.*@/, "//***@"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
