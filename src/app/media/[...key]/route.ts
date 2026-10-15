import { promises as fs } from "node:fs";
import path from "node:path";
import { resolveLocalPath } from "@/lib/storage";

const TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".avif": "image/avif",
  ".glb": "model/gltf-binary",
};

/** Serve as fotos gravadas pelo driver de armazenamento local (STORAGE_DRIVER=local). */
export async function GET(_req: Request, ctx: RouteContext<"/media/[...key]">) {
  if (process.env.STORAGE_DRIVER === "s3") return new Response("Not found", { status: 404 });
  const { key } = await ctx.params;
  const type = TYPES[path.extname(key.at(-1) ?? "").toLowerCase()];
  if (!type) return new Response("Not found", { status: 404 });
  try {
    const file = await fs.readFile(resolveLocalPath(key.join("/")));
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": type,
        "Content-Length": String(file.length),
        // as chaves são únicas (UUID): o arquivo nunca muda
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

/** Usado pelo visualizador 3D para confirmar que o arquivo existe antes de baixá-lo. */
export async function HEAD(req: Request, ctx: RouteContext<"/media/[...key]">) {
  const res = await GET(req, ctx);
  return new Response(null, { status: res.status, headers: res.headers });
}
