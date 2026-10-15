import { randomUUID } from "node:crypto";
import { revalidateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { guardAdminRequest } from "@/lib/auth/route-guard";
import { db, schema } from "@/lib/db/client";
import { VEHICLES_TAG } from "@/lib/data/vehicles";
import { ACCEPTED_TYPES, MAX_UPLOAD_BYTES, processAndStoreImage } from "@/lib/images";
import { validateGlb } from "@/lib/model3d";
import { storage } from "@/lib/storage";

/**
 * Upload do modelo 3D (GLB autocontido) ou do poster do visualizador.
 * Substituir = enviar de novo: o arquivo anterior é removido do armazenamento.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/admin/vehicles/[id]/model3d">) {
  const guard = await guardAdminRequest(req);
  if ("response" in guard) return guard.response;
  const { id } = await ctx.params;

  const [vehicle] = await db.select().from(schema.vehicles).where(eq(schema.vehicles.id, id));
  if (!vehicle) return Response.json({ error: "Veículo não encontrado." }, { status: 404 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const target = form?.get("target") === "poster" ? "poster" : "model";
  if (!(file instanceof File)) return Response.json({ error: "Nenhum arquivo enviado." }, { status: 400 });

  if (target === "poster") {
    if (!ACCEPTED_TYPES.includes(file.type)) return Response.json({ error: "Poster deve ser JPG, PNG, WebP ou AVIF." }, { status: 415 });
    if (file.size > MAX_UPLOAD_BYTES) return Response.json({ error: "Imagem acima de 15 MB." }, { status: 413 });
    const processed = await processAndStoreImage(Buffer.from(await file.arrayBuffer()), `veiculos/${id}/3d`);
    if (vehicle.model3dPosterKey) await storage().delete(vehicle.model3dPosterKey).catch(() => undefined);
    await db.update(schema.vehicles).set({ model3dPosterKey: processed.storageKey, updatedAt: Date.now() }).where(eq(schema.vehicles.id, id));
    revalidateTag(VEHICLES_TAG, { expire: 0 });
    return Response.json({ ok: true, src: storage().publicUrl(processed.storageKey) });
  }

  if (!file.name.toLowerCase().endsWith(".glb")) {
    return Response.json({ error: "Envie um arquivo .glb (glTF binário autocontido). Para .gltf com arquivos externos, use a opção de URL." }, { status: 415 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const check = validateGlb(buffer);
  if (!check.ok) return Response.json({ error: check.error }, { status: 422 });

  const key = `veiculos/${id}/3d/${randomUUID()}.glb`;
  await storage().put(key, buffer, "model/gltf-binary");
  if (vehicle.model3dKey) await storage().delete(vehicle.model3dKey).catch(() => undefined);
  await db
    .update(schema.vehicles)
    .set({ model3dKey: key, model3dUrl: null, model3dFormat: "glb", model3dSizeBytes: buffer.length, updatedAt: Date.now() })
    .where(eq(schema.vehicles.id, id));
  revalidateTag(VEHICLES_TAG, { expire: 0 });
  return Response.json({ ok: true, url: storage().publicUrl(key), sizeBytes: buffer.length });
}
