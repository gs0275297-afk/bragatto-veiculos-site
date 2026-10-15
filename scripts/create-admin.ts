/**
 * Cria (ou redefine a senha de) um usuário do painel administrativo.
 * A senha é digitada no terminal e armazenada apenas como hash (scrypt).
 *
 * Uso: npm run admin:create
 *      npm run admin:create -- --email=fulano@loja.com --name="Fulano" --role=owner
 */
import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { hashPassword, MIN_PASSWORD_LENGTH } from "@/lib/auth/password";

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

async function askHidden(question: string) {
  let muted = false;
  const output = new Writable({
    write(chunk, encoding, cb) {
      if (!muted) process.stdout.write(chunk, encoding);
      cb();
    },
  });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  process.stdout.write(question);
  muted = true;
  const answer = await rl.question("");
  rl.close();
  process.stdout.write("\n");
  return answer;
}

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const email = (arg("email") ?? (await rl.question("E-mail: "))).trim().toLowerCase();
  const name = (arg("name") ?? (await rl.question("Nome: "))).trim();
  const roleArg = arg("role") ?? (await rl.question("Perfil [owner/editor] (owner): ")).trim();
  rl.close();
  const role = roleArg === "editor" ? "editor" : "owner";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-mail inválido");
  if (!name) throw new Error("Informe o nome");

  const password = await askHidden(`Senha (mín. ${MIN_PASSWORD_LENGTH} caracteres): `);
  if (password.length < MIN_PASSWORD_LENGTH) throw new Error("Senha muito curta");
  const confirm = await askHidden("Confirme a senha: ");
  if (password !== confirm) throw new Error("As senhas não conferem");

  const passwordHash = await hashPassword(password);
  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (existing) {
    await db.update(schema.users).set({ name, role, passwordHash }).where(eq(schema.users.id, existing.id));
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, existing.id));
    console.log(`✓ Usuário atualizado: ${email} (${role})`);
  } else {
    await db.insert(schema.users).values({ id: randomUUID(), email, name, role, passwordHash });
    console.log(`✓ Usuário criado: ${email} (${role})`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("✗", err instanceof Error ? err.message : err);
    process.exit(1);
  });
