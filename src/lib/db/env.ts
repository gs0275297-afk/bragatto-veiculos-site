/**
 * Conexão do banco. Aceita os nomes próprios do projeto (DATABASE_URL/DATABASE_AUTH_TOKEN)
 * e os criados automaticamente pela integração Turso da Vercel (TURSO_DATABASE_URL/TURSO_AUTH_TOKEN).
 */
export function dbConfig() {
  const url = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || "file:./data/bragatto.db";
  const authToken = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || undefined;
  return { url, authToken, isLocalFile: url.startsWith("file:") };
}
