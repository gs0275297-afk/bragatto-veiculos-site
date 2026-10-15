import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 6;

/** Retorna `true` se a chave ainda pode tentar login. */
export async function canAttempt(key: string): Promise<boolean> {
  const [row] = await db.select().from(schema.loginAttempts).where(eq(schema.loginAttempts.key, key));
  if (!row) return true;
  if (Date.now() - row.windowStart > WINDOW_MS) return true;
  return row.count < MAX_ATTEMPTS;
}

export async function registerFailure(key: string) {
  const [row] = await db.select().from(schema.loginAttempts).where(eq(schema.loginAttempts.key, key));
  const nowMs = Date.now();
  if (!row || nowMs - row.windowStart > WINDOW_MS) {
    await db
      .insert(schema.loginAttempts)
      .values({ key, count: 1, windowStart: nowMs })
      .onConflictDoUpdate({ target: schema.loginAttempts.key, set: { count: 1, windowStart: nowMs } });
  } else {
    await db.update(schema.loginAttempts).set({ count: row.count + 1 }).where(eq(schema.loginAttempts.key, key));
  }
}

export async function clearFailures(key: string) {
  await db.delete(schema.loginAttempts).where(eq(schema.loginAttempts.key, key));
}
