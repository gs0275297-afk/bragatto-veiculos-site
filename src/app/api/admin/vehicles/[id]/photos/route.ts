import { revalidateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { guardAdminRequest } from "@/lib/auth/route-guard";
import { db, schema } from "@/lib/db/client";
import { VEHICLES_TAG } from "@/lib/data/vehicles";
import { ACCEPTED_TYPES, MAX_UPLOAD_BYTES } from "@/lib/images";
import { storage } from "@/lib/storage";
import { addPhoto } from "@/lib/vehicle-service";

/** Upload de UMA foto por requisição (o painel envia em sequência, com progresso). */
export async function POST(req: Request, ctx: RouteContext<"/api/admin/vehicles/[id]/photos">) {
  const guard = await guardAdminRequest(req);
  if ("response" in guard) return guard.response;
  const { id } = await ctx.params;

  const [vehicle] = await db.select({ id: schema.vehicles.id }).from(schema.vehicles).where(eq(schema.vehicles.id, id));
  if (!vehicle) return Response.json({ error: "Veículo não encontrado." }, { status: 404 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const kind = form?.get("kind") === "giro" ? "giro" : "galeria";
  if (!(file instanceof File)) return Response.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
  if (!ACCEPTED_TYPES.includes(file.type)) return Response.json({ error: "Formato não aceito. Use JPG, PNG, WebP ou AVIF." }, { status: 415 });
  if (file.size > MAX_UPLOAD_BYTES) return Response.json({ error: "Foto acima de 15 MB." }, { status: 413 });

  try {
    const photo = await addPhoto(id, Buffer.from(await file.arrayBuffer()), { kind });
    revalidateTag(VEHICLES_TAG, { expire: 0 });
    return Response.json({ ...photo, src: storage().publicUrl(photo.storageKey), kind });
  } catch (err) {
    console.error("[upload foto]", err);
    return Response.json({ error: "Não foi possível processar esta imagem." }, { status: 422 });
  }
}
