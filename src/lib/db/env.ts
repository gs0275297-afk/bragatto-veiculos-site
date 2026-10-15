import { copyFileSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

/** Durante `npm run build` (prebuild ou next build), não em tempo de execução. */
export function isBuildPhase() {
  return process.env.NEXT_PHASE === "phase-production-build" || process.env.npm_lifecycle_event === "prebuild";
}

function remoteUrl() {
  return process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || "";
}

/**
 * Modo vitrine: publicado na Vercel sem banco remoto conectado. O estoque inicial é gerado
 * no build (somente leitura) e o painel fica desativado até Turso + Blob serem conectados.
 */
export function isVitrine() {
  return Boolean(process.env.VERCEL) && !remoteUrl();
}

const VITRINE_DB = "data/vitrine.db";

/**
 * Conexão do banco. Aceita os nomes próprios do projeto (DATABASE_URL/DATABASE_AUTH_TOKEN)
 * e os criados automaticamente pela integração Turso da Vercel (TURSO_DATABASE_URL/TURSO_AUTH_TOKEN).
 */
export function dbConfig() {
  const authToken = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || undefined;
  const remote = remoteUrl();
  if (remote) return { url: remote, authToken, isLocalFile: remote.startsWith("file:"), vitrine: false };

  if (isVitrine()) {
    if (isBuildPhase()) return { url: `file:./${VITRINE_DB}`, authToken: undefined, isLocalFile: true, vitrine: true };
    // em execução o pacote é somente leitura: usa uma cópia no diretório temporário (/tmp na Vercel)
    const bundled = path.join(/*turbopackIgnore: true*/ process.cwd(), VITRINE_DB);
    const tmp = path.join(os.tmpdir(), "bragatto-vitrine.db");
    if (!existsSync(tmp) && existsSync(bundled)) copyFileSync(bundled, tmp);
    return { url: `file:${tmp}`, authToken: undefined, isLocalFile: true, vitrine: true };
  }

  return { url: "file:./data/bragatto.db", authToken, isLocalFile: true, vitrine: false };
}
