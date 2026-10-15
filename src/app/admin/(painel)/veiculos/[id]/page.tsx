import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Icon } from "@/components/ui/Icon";
import { Model3DManager } from "@/components/admin/Model3DManager";
import { PhotoManager } from "@/components/admin/PhotoManager";
import { VehicleForm } from "@/components/admin/VehicleForm";
import { deleteVehicleAction } from "@/app/admin/actions";
import { requireUser } from "@/lib/auth/session";
import { getAdminVehicle } from "@/lib/data/admin";
import { allowedModelHosts } from "@/lib/model3d";
import { storageDriver } from "@/lib/storage";
import { MODEL3D_MAX_BYTES } from "@/lib/vehicle-input";

export const metadata: Metadata = { title: "Editar veículo" };

export default function EditVehiclePage(props: PageProps<"/admin/veiculos/[id]">) {
  return (
    <Suspense fallback={<p>Carregando…</p>}>
      <Editor {...props} />
    </Suspense>
  );
}

async function Editor({ params, searchParams }: PageProps<"/admin/veiculos/[id]">) {
  await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const v = await getAdminVehicle(id);
  if (!v) notFound();
  const name = [v.brand, v.model, v.version].filter(Boolean).join(" ");
  const cover = v.photos.find((p) => p.kind === "galeria");
  const driver = storageDriver();
  const uploadMode = driver === "vercel-blob" ? "direct-blob" : "server";
  // em serverless (Vercel) com envio pelo servidor, cada requisição é limitada a ~4,5 MB
  const maxModelMb = Math.round(MODEL3D_MAX_BYTES / 1048576);
  const effectiveMaxMb = process.env.VERCEL && uploadMode === "server" ? Math.min(4, maxModelMb) : maxModelMb;

  return (
    <>
      <div className="a-head">
        <div>
          <h1 className="a-title">{name}</h1>
          <p className="a-sub">
            {v.published ? "Publicado" : "Rascunho"} · última alteração {new Date(v.updatedAt).toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="a-actions" style={{ marginTop: 0 }}>
          {v.published && (
            <a href={`/veiculos/${v.slug}`} target="_blank" rel="noopener noreferrer" className="a-link-btn">
              <Icon name="eye" size={14} /> Ver no site
            </a>
          )}
          <Link href="/admin" className="a-link-btn">
            Voltar à lista
          </Link>
        </div>
      </div>

      {sp.criado && (
        <p className="a-notice" data-tone="ok" role="status">
          Veículo criado como {v.published ? "publicado" : "rascunho"}. Agora envie as fotos.
        </p>
      )}
      {sp.erro === "confirmacao" && (
        <p className="a-notice" data-tone="error" role="alert">
          Para excluir, digite EXCLUIR no campo de confirmação.
        </p>
      )}
      {v.internalNotes && (
        <p className="a-notice" data-tone="warn">
          <Icon name="key" size={16} /> <span>{v.internalNotes}</span>
        </p>
      )}

      <VehicleForm vehicle={v} />

      <div style={{ marginTop: 16 }}>
        <PhotoManager
          vehicleId={v.id}
          initial={v.photos.map((p) => ({ id: p.id, src: p.src, alt: p.alt, angle: p.angle, kind: p.kind, focalX: p.focalX, focalY: p.focalY }))}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <Model3DManager
          vehicleId={v.id}
          vehicleName={name}
          fallbackPoster={cover?.src ?? null}
          maxMb={effectiveMaxMb}
          allowedHosts={allowedModelHosts()}
          uploadMode={uploadMode}
          state={{
            enabled: v.model3dEnabled,
            kind: v.model3dKind,
            source: v.model3dSource,
            isUploaded: Boolean(v.model3dKey),
            publicUrl: v.model3dPublicUrl,
            format: v.model3dFormat,
            sizeBytes: v.model3dSizeBytes,
            posterSrc: v.model3dPosterSrc,
          }}
        />
      </div>

      <section className="a-card" style={{ marginTop: 16, borderColor: "rgb(255 43 53 / 0.3)" }} aria-labelledby="perigo">
        <h2 className="a-card-title" id="perigo">
          Excluir veículo <small>Remove o anúncio, as fotos e o modelo 3D. Não pode ser desfeito.</small>
        </h2>
        <p className="a-help" style={{ marginBottom: 12 }}>
          Para tirar do ar temporariamente, prefira despublicar ou marcar como vendido.
        </p>
        <form action={deleteVehicleAction} className="a-inline-form" style={{ flexWrap: "wrap" }}>
          <input type="hidden" name="id" value={v.id} />
          <input name="confirm" className="a-input" style={{ maxWidth: 220 }} placeholder="Digite EXCLUIR" aria-label="Confirmação: digite EXCLUIR" autoComplete="off" />
          <button type="submit" className="a-link-btn" data-danger>
            <Icon name="trash" size={14} /> Excluir definitivamente
          </button>
        </form>
      </section>
    </>
  );
}
