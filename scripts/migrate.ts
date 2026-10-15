import { mkdirSync } from "node:fs";
import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "@/lib/db/client";
import { dbConfig } from "@/lib/db/env";

async function main() {
  const { url, isLocalFile } = dbConfig();
  if (isLocalFile) mkdirSync("./data", { recursive: true });
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("✓ Banco de dados atualizado:", isLocalFile ? url : new URL(url).host);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
