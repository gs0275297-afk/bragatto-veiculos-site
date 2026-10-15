/**
 * Executado automaticamente antes de `next build` (script "prebuild" do npm).
 *
 * Fora da Vercel não faz nada — localmente use `npm run setup`.
 * Na Vercel:
 *  1. confere banco remoto (Turso) e armazenamento persistente (Vercel Blob ou S3);
 *  2. aplica as migrações;
 *  3. carrega o estoque inicial real UMA única vez (fica registrado em app_meta);
 *  4. cria o primeiro administrador a partir de ADMIN_EMAIL/ADMIN_PASSWORD, se ainda não houver usuários.
 */
import { randomUUID } from "node:crypto";
import { count, eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/libsql/migrator";
import { hashPassword, MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { db, schema } from "@/lib/db/client";
import { dbConfig } from "@/lib/db/env";
import { storageDriver } from "@/lib/storage";
import { isInitialSeedDone, markInitialSeedDone, seedInitialStock } from "./seed-lib";

function fail(lines: string[]): never {
  console.error(["", "✗ Configuração incompleta para a Vercel", ...lines.map((l) => `  ${l}`), ""].join("\n"));
  process.exit(1);
}

async function main() {
  if (!process.env.VERCEL) return;

  const { url, isLocalFile } = dbConfig();
  if (isLocalFile) {
    fail([
      "Falta o banco de dados. Na Vercel o disco não é persistente, então o SQLite local não funciona.",
      "No painel do projeto: Storage → Create Database → Turso (ou Marketplace → Turso Cloud) → conecte ao projeto.",
      "Isso cria TURSO_DATABASE_URL e TURSO_AUTH_TOKEN. (Também aceito: DATABASE_URL e DATABASE_AUTH_TOKEN.)",
      "Depois, faça Redeploy.",
    ]);
  }

  const driver = storageDriver();
  if (driver === "local") {
    fail([
      "Falta o armazenamento das fotos. Na Vercel os arquivos enviados não ficam salvos no servidor.",
      "No painel do projeto: Storage → Create → Blob → conecte ao projeto (cria BLOB_READ_WRITE_TOKEN).",
      "Alternativa: Cloudflare R2/S3 com STORAGE_DRIVER=s3 e as variáveis S3_* (veja .env.example).",
      "Depois, faça Redeploy.",
    ]);
  }

  console.log(`• banco: ${new URL(url).host} · armazenamento: ${driver}`);
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("✓ migrações aplicadas");

  if (!(await isInitialSeedDone())) {
    const [{ n }] = await db.select({ n: count() }).from(schema.vehicles);
    if (n === 0 && process.env.SKIP_INITIAL_SEED !== "true") {
      console.log("• carregando o estoque inicial (uma única vez)…");
      await seedInitialStock((m) => console.log(`  ${m}`));
    } else {
      await markInitialSeedDone(n === 0 ? "carga inicial ignorada (SKIP_INITIAL_SEED)" : "estoque já existente");
    }
  }

  const [{ users }] = await db.select({ users: count() }).from(schema.users);
  if (users === 0) {
    const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD;
    if (email && password) {
      if (password.length < MIN_PASSWORD_LENGTH) fail([`ADMIN_PASSWORD precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`]);
      await db.insert(schema.users).values({
        id: randomUUID(),
        email,
        name: process.env.ADMIN_NAME?.trim() || "Administrador",
        role: "owner",
        passwordHash: await hashPassword(password),
      });
      console.log(`✓ administrador criado (${email}). Troque a senha no painel e remova ADMIN_PASSWORD das variáveis.`);
    } else {
      console.warn("⚠ Nenhum usuário no painel. Defina ADMIN_EMAIL e ADMIN_PASSWORD e faça Redeploy para criar o primeiro acesso.");
    }
  } else if (process.env.ADMIN_PASSWORD) {
    const [exists] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, process.env.ADMIN_EMAIL ?? ""));
    if (exists) console.warn("⚠ ADMIN_PASSWORD continua definida, mas o usuário já existe — pode removê-la das variáveis.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
