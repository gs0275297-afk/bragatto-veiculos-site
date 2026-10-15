import { mkdirSync } from "node:fs";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { dbConfig } from "./env";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { __libsql?: Client };

function createLibsqlClient() {
  const { url, authToken, isLocalFile } = dbConfig();
  if (isLocalFile) mkdirSync(path.dirname(/*turbopackIgnore: true*/ url.slice(5)), { recursive: true });
  return createClient({ url, authToken });
}

const client = globalForDb.__libsql ?? createLibsqlClient();
if (process.env.NODE_ENV !== "production") globalForDb.__libsql = client;

export const db = drizzle(client, { schema });
export { schema };
