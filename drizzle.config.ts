import { defineConfig } from "drizzle-kit";
import { dbConfig } from "./src/lib/db/env";

const { url, authToken } = dbConfig();

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: { url, authToken },
});
