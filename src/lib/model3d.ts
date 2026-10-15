import "server-only";
import { blobPublicBase } from "@/lib/storage";
import { MODEL3D_MAX_BYTES } from "@/lib/vehicle-input";

/** Extensões glTF suportadas pelo visualizador (as demais "requeridas" são recusadas). */
const SUPPORTED_REQUIRED_EXTENSIONS = new Set([
  "KHR_draco_mesh_compression",
  "EXT_meshopt_compression",
  "KHR_mesh_quantization",
  "KHR_texture_transform",
  "KHR_materials_unlit",
  "KHR_materials_emissive_strength",
  "KHR_materials_clearcoat",
  "KHR_materials_transmission",
  "KHR_materials_ior",
  "KHR_materials_specular",
  "KHR_materials_volume",
  "KHR_materials_sheen",
  "KHR_materials_iridescence",
  "KHR_materials_anisotropy",
  "EXT_texture_webp",
]);

export type GlbCheck = { ok: true } | { ok: false; error: string };

/**
 * Valida um arquivo GLB (glTF 2.0 binário, autocontido):
 * cabeçalho "glTF", versão 2, tamanho declarado, chunk JSON válido com asset.version 2.x
 * e apenas extensões obrigatórias que o visualizador suporta.
 */
export function validateGlb(buf: Buffer): GlbCheck {
  if (buf.length > MODEL3D_MAX_BYTES) return { ok: false, error: `Arquivo acima do limite de ${Math.round(MODEL3D_MAX_BYTES / 1048576)} MB.` };
  if (buf.length < 20 || buf.toString("ascii", 0, 4) !== "glTF") return { ok: false, error: "O arquivo não é um GLB (glTF binário)." };
  const version = buf.readUInt32LE(4);
  if (version !== 2) return { ok: false, error: `Versão glTF ${version} não suportada (use glTF 2.0).` };
  const declared = buf.readUInt32LE(8);
  if (declared !== buf.length) return { ok: false, error: "Arquivo GLB incompleto ou corrompido." };
  const chunkLength = buf.readUInt32LE(12);
  const chunkType = buf.toString("ascii", 16, 20);
  if (chunkType !== "JSON" || 20 + chunkLength > buf.length) return { ok: false, error: "Estrutura GLB inválida." };
  let json: { asset?: { version?: string }; extensionsRequired?: string[]; buffers?: { uri?: string }[]; images?: { uri?: string }[] };
  try {
    json = JSON.parse(buf.toString("utf8", 20, 20 + chunkLength));
  } catch {
    return { ok: false, error: "Conteúdo glTF ilegível." };
  }
  if (!json.asset?.version?.startsWith("2")) return { ok: false, error: "glTF sem versão 2.0 declarada." };
  const unsupported = (json.extensionsRequired ?? []).filter((e) => !SUPPORTED_REQUIRED_EXTENSIONS.has(e));
  if (unsupported.length) return { ok: false, error: `Extensões não suportadas: ${unsupported.join(", ")}.` };
  const external = [...(json.buffers ?? []), ...(json.images ?? [])].some((r) => r.uri && !r.uri.startsWith("data:"));
  if (external) return { ok: false, error: "O GLB referencia arquivos externos. Exporte um GLB autocontido." };
  return { ok: true };
}

/** Hosts autorizados para modelos externos: o armazenamento do site + MODEL3D_ALLOWED_HOSTS. */
export function allowedModelHosts(): string[] {
  const hosts = (process.env.MODEL3D_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  if (process.env.S3_PUBLIC_URL) hosts.push(new URL(process.env.S3_PUBLIC_URL).hostname.toLowerCase());
  const blob = blobPublicBase();
  if (blob) hosts.push(new URL(blob).hostname);
  return hosts;
}

/**
 * Valida uma URL externa de modelo: https, host autorizado, extensão .glb/.gltf e
 * disponibilidade real (HEAD), com tipo e tamanho coerentes.
 */
export async function validateModelUrl(raw: string): Promise<
  { ok: true; url: string; format: "glb" | "gltf"; sizeBytes: number | null } | { ok: false; error: string }
> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, error: "URL inválida." };
  }
  if (url.protocol !== "https:") return { ok: false, error: "Use uma URL https://." };
  const hosts = allowedModelHosts();
  if (!hosts.includes(url.hostname.toLowerCase()))
    return {
      ok: false,
      error: hosts.length
        ? `Host não autorizado. Permitidos: ${hosts.join(", ")}.`
        : "Nenhum host externo autorizado. Configure MODEL3D_ALLOWED_HOSTS ou envie o arquivo GLB.",
    };
  const ext = url.pathname.toLowerCase().split(".").pop();
  if (ext !== "glb" && ext !== "gltf") return { ok: false, error: "A URL deve terminar em .glb ou .gltf." };

  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(8000) });
    if (!res.ok) return { ok: false, error: `O arquivo não respondeu (HTTP ${res.status}).` };
    const type = res.headers.get("content-type") ?? "";
    if (type && /text\/html/i.test(type)) return { ok: false, error: "A URL aponta para uma página, não para um arquivo 3D." };
    const len = Number(res.headers.get("content-length") ?? "") || null;
    if (len && len > MODEL3D_MAX_BYTES) return { ok: false, error: `Arquivo acima do limite de ${Math.round(MODEL3D_MAX_BYTES / 1048576)} MB.` };
    return { ok: true, url: url.toString(), format: ext, sizeBytes: len };
  } catch {
    return { ok: false, error: "Não foi possível acessar a URL (tempo esgotado ou bloqueio)." };
  }
}
