import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { guardAdminRequest } from "@/lib/auth/route-guard";
import { MODEL3D_MAX_BYTES } from "@/lib/vehicle-input";

/**
 * Emite um token de upload direto (navegador → Vercel Blob) para o modelo 3D,
 * evitando o limite de tamanho das funções serverless. Só para usuários do painel,
 * só no caminho do veículo e só arquivos .glb dentro do limite.
 * Após o envio, o painel chama attachBlobModelAction, que valida o arquivo antes de associá-lo.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/admin/vehicles/[id]/model3d/blob">) {
  const guard = await guardAdminRequest(req);
  if ("response" in guard) return guard.response;
  const { id } = await ctx.params;
  const body = (await req.json()) as HandleUploadBody;

  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(`veiculos/${id}/3d/`) || !pathname.toLowerCase().endsWith(".glb")) {
          throw new Error("Caminho de upload inválido.");
        }
        return {
          allowedContentTypes: ["model/gltf-binary", "application/octet-stream"],
          maximumSizeInBytes: MODEL3D_MAX_BYTES,
          addRandomSuffix: true,
          cacheControlMaxAge: 31536000,
        };
      },
    });
    return Response.json(result);
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
}
