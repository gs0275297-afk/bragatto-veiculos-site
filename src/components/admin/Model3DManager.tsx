"use client";

import { useRouter } from "next/navigation";
import { startTransition, useActionState, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Model3DViewer } from "@/components/vehicles/viewer3d/Model3DViewer";
import { upload as uploadToBlob } from "@vercel/blob/client";
import {
  attachBlobModelAction,
  removeModel3dAction,
  saveModel3dMetaAction,
  setModel3dUrlAction,
  type FormState,
} from "@/app/admin/actions";
import { prepareImageForUpload } from "@/lib/client-image";
import type { Model3DFormat, Model3DKind } from "@/lib/db/schema";

export type Model3DAdminState = {
  enabled: boolean;
  kind: Model3DKind | null;
  source: string | null;
  isUploaded: boolean;
  publicUrl: string | null;
  format: Model3DFormat | null;
  sizeBytes: number | null;
  posterSrc: string | null;
};

const mb = (b: number | null) => (b ? `${(b / 1048576).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB` : "tamanho não informado");

function send(url: string, file: File, target: "model" | "poster", onProgress: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let msg = `Falha no envio (${xhr.status})`;
      try {
        msg = JSON.parse(xhr.responseText).error ?? msg;
      } catch {}
      reject(new Error(msg));
    };
    xhr.onerror = () => reject(new Error("Falha de conexão"));
    const fd = new FormData();
    fd.append("file", file);
    fd.append("target", target);
    xhr.send(fd);
  });
}

export function Model3DManager({
  vehicleId,
  vehicleName,
  fallbackPoster,
  state: s,
  maxMb,
  allowedHosts,
  uploadMode,
}: {
  vehicleId: string;
  vehicleName: string;
  fallbackPoster: string | null;
  state: Model3DAdminState;
  maxMb: number;
  allowedHosts: string[];
  /** direct-blob: o arquivo vai do navegador direto ao Vercel Blob (sem limite de 4,5 MB da função). */
  uploadMode: "server" | "direct-blob";
}) {
  const router = useRouter();
  const [metaState, metaAction, metaPending] = useActionState<FormState, FormData>(saveModel3dMetaAction, {});
  const [urlState, urlAction, urlPending] = useActionState<FormState, FormData>(setModel3dUrlAction, {});
  const [upload, setUpload] = useState<{ target: string; progress: number; error?: string } | null>(null);
  const [preview, setPreview] = useState(false);
  const hasModel = Boolean(s.publicUrl);

  const onUpload = async (file: File | undefined, target: "model" | "poster") => {
    if (!file) return;
    if (target === "model" && !file.name.toLowerCase().endsWith(".glb")) {
      setUpload({ target, progress: 0, error: "Selecione um arquivo .glb." });
      return;
    }
    if (target === "model" && file.size > maxMb * 1048576) {
      setUpload({ target, progress: 0, error: `Arquivo acima de ${maxMb} MB. Otimize o modelo (Draco/Meshopt, texturas ≤ 2048 px).` });
      return;
    }
    setUpload({ target, progress: 0 });
    try {
      if (target === "model" && uploadMode === "direct-blob") {
        const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
        const blob = await uploadToBlob(`veiculos/${vehicleId}/3d/${safeName}`, file, {
          access: "public",
          contentType: "model/gltf-binary",
          handleUploadUrl: `/api/admin/vehicles/${vehicleId}/model3d/blob`,
          multipart: file.size > 8 * 1048576,
          onUploadProgress: ({ percentage }) => setUpload({ target, progress: percentage / 100 }),
        });
        const result = await attachBlobModelAction(vehicleId, blob.url);
        if (!result.ok) throw new Error(result.message ?? "Arquivo recusado.");
      } else {
        const ready = target === "poster" ? await prepareImageForUpload(file) : file;
        await send(`/api/admin/vehicles/${vehicleId}/model3d`, ready, target, (p) => setUpload({ target, progress: p }));
      }
      setUpload(null);
      setPreview(false);
      router.refresh();
    } catch (err) {
      setUpload({ target, progress: 0, error: (err as Error).message });
    }
  };

  const submit = (dispatch: (fd: FormData) => void) => (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const data = new FormData(ev.currentTarget);
    startTransition(() => dispatch(data));
  };

  return (
    <section className="a-card" aria-labelledby="m3d-title">
      <h2 className="a-card-title" id="m3d-title">
        Visualização 3D <small>Opcional. Sem modelo, o anúncio mostra apenas as fotos — sem botão de 3D.</small>
      </h2>

      <dl className="a-model-status">
        <dt>Modelo</dt>
        <dd>
          {hasModel ? (
            <span className="a-pill" data-tone="ok">
              {s.isUploaded ? "Arquivo enviado" : "URL externa"} · {s.format?.toUpperCase()} · {mb(s.sizeBytes)}
            </span>
          ) : (
            <span className="a-pill" data-tone="off">
              Nenhum modelo associado
            </span>
          )}
        </dd>
        <dt>No site</dt>
        <dd>
          <span className="a-pill" data-tone={s.enabled && hasModel ? "ok" : "off"}>
            {s.enabled && hasModel ? "Visualizador ativo" : "Visualizador desativado"}
          </span>
        </dd>
        {hasModel && !s.isUploaded && (
          <>
            <dt>URL</dt>
            <dd className="mono" style={{ fontSize: 12 }}>
              {s.publicUrl}
            </dd>
          </>
        )}
      </dl>

      <p className="a-notice" data-tone="warn">
        Use apenas modelos com autorização de uso comercial. Nunca apresente um modelo genérico como se fosse este exemplar:
        marque “ilustrativo” sempre que o modelo não for uma digitalização deste veículo.
      </p>

      <div className="a-grid">
        <div className="a-field a-col-6">
          <span className="a-label">{hasModel ? "Substituir por arquivo GLB" : "Enviar arquivo GLB"}</span>
          <label className="a-drop" style={{ padding: 18 }}>
            <Icon name="cube" size={22} />
            <strong>Selecionar .glb</strong>
            <span className="a-help">glTF 2.0 binário autocontido · até {maxMb} MB · Draco e Meshopt suportados</span>
            <input type="file" accept=".glb,model/gltf-binary" onChange={(e) => onUpload(e.target.files?.[0], "model")} />
          </label>
          {upload?.target === "model" && (
            <div aria-live="polite">
              {upload.error ? (
                <span className="a-error">{upload.error}</span>
              ) : (
                <>
                  <span className="a-help">Enviando e validando… {Math.round(upload.progress * 100)}%</span>
                  <span className="a-progress">
                    <span style={{ width: `${upload.progress * 100}%` }} />
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        <form className="a-field a-col-6" onSubmit={submit(urlAction)} data-error={urlState.errors?.model3dUrl ? "" : undefined}>
          <input type="hidden" name="id" value={vehicleId} />
          <label className="a-label" htmlFor="m3d-url">
            Ou usar URL externa (https)
          </label>
          <input id="m3d-url" name="model3dUrl" className="a-input" placeholder="https://cdn.exemplo.com/modelos/veiculo.glb" inputMode="url" />
          {urlState.errors?.model3dUrl ? (
            <span className="a-error">{urlState.errors.model3dUrl}</span>
          ) : urlState.ok ? (
            <span className="a-help" style={{ color: "var(--success)" }}>
              {urlState.message}
            </span>
          ) : (
            <span className="a-help">
              Hosts autorizados: {allowedHosts.length ? allowedHosts.join(", ") : "nenhum (configure MODEL3D_ALLOWED_HOSTS)"}. O arquivo é verificado antes de salvar.
            </span>
          )}
          <button type="submit" className="a-link-btn" style={{ justifySelf: "start" }} disabled={urlPending}>
            {urlPending ? "Verificando…" : "Validar e associar URL"}
          </button>
        </form>
      </div>

      <form onSubmit={submit(metaAction)} style={{ marginTop: 24 }}>
        <input type="hidden" name="id" value={vehicleId} />
        {metaState.message && (
          <p className="a-notice" data-tone={metaState.ok ? "ok" : "error"} role={metaState.ok ? "status" : "alert"}>
            {metaState.message}
          </p>
        )}
        <div className="a-grid">
          <fieldset className="a-field a-col-6" style={{ border: 0, padding: 0, margin: 0 }} data-error={metaState.errors?.model3dKind ? "" : undefined}>
            <legend className="a-label" style={{ marginBottom: 6 }}>
              O que este modelo representa? <em>*</em>
            </legend>
            <label className="a-check">
              <input type="radio" name="model3dKind" value="digitalizacao" defaultChecked={s.kind === "digitalizacao"} />
              <span>
                <strong>Digitalização deste veículo</strong>
                <span>Escaneamento/fotogrametria do exemplar anunciado.</span>
              </span>
            </label>
            <label className="a-check" style={{ marginTop: 6 }}>
              <input type="radio" name="model3dKind" value="representativo" defaultChecked={s.kind === "representativo"} />
              <span>
                <strong>Modelo ilustrativo licenciado</strong>
                <span>Mesmo modelo, mas não este exemplar — o site exibe um aviso.</span>
              </span>
            </label>
            {metaState.errors?.model3dKind && <span className="a-error">{metaState.errors.model3dKind}</span>}
          </fieldset>
          <div className="a-field a-col-6" data-error={metaState.errors?.model3dSource ? "" : undefined}>
            <label className="a-label" htmlFor="m3d-source">
              Origem, autor e licença <em>*</em>
            </label>
            <textarea
              id="m3d-source"
              name="model3dSource"
              className="a-textarea"
              rows={3}
              defaultValue={s.source ?? ""}
              placeholder="Ex.: Digitalização própria (Bragatto, out/2026) — ou — Autor X, licença comercial nº…"
            />
            {metaState.errors?.model3dSource ? (
              <span className="a-error">{metaState.errors.model3dSource}</span>
            ) : (
              <span className="a-help">Exibido discretamente junto ao visualizador.</span>
            )}
            <label className="a-check" data-error={metaState.errors?.model3dEnabled ? "" : undefined}>
              <input type="checkbox" name="model3dEnabled" defaultChecked={s.enabled} />
              <span>
                <strong>Exibir visualizador 3D no anúncio</strong>
                <span>Só funciona com modelo associado, tipo e origem preenchidos.</span>
              </span>
            </label>
            {metaState.errors?.model3dEnabled && <span className="a-error">{metaState.errors.model3dEnabled}</span>}
          </div>
        </div>
        <div className="a-actions">
          <button type="submit" className="btn btn-primary btn-sm" disabled={metaPending}>
            {metaPending ? "Salvando…" : "Salvar configuração 3D"}
          </button>
          {hasModel && (
            <button type="button" className="a-link-btn" onClick={() => setPreview((v) => !v)}>
              <Icon name="eye" size={14} /> {preview ? "Fechar pré-visualização" : "Pré-visualizar modelo"}
            </button>
          )}
          <label className="a-link-btn" style={{ cursor: "pointer" }}>
            <Icon name="upload" size={14} /> {s.posterSrc ? "Trocar poster" : "Enviar poster (opcional)"}
            <input type="file" hidden accept="image/jpeg,image/png,image/webp,image/avif" onChange={(e) => onUpload(e.target.files?.[0], "poster")} />
          </label>
          {upload?.target === "poster" && (upload.error ? <span className="a-error">{upload.error}</span> : <span className="a-help">Enviando poster…</span>)}
        </div>
      </form>

      {hasModel && (
        <form
          action={removeModel3dAction}
          onSubmit={(e) => {
            if (!confirm("Remover o modelo 3D deste veículo? O arquivo enviado será apagado.")) e.preventDefault();
          }}
          className="a-actions"
        >
          <input type="hidden" name="id" value={vehicleId} />
          <button type="submit" className="a-link-btn" data-danger>
            <Icon name="trash" size={14} /> Remover modelo 3D
          </button>
        </form>
      )}

      {preview && s.publicUrl && s.format && (
        <div className="a-preview3d">
          <Model3DViewer
            model={{
              url: s.publicUrl,
              format: s.format,
              kind: s.kind ?? "representativo",
              source: s.source ?? "não informada",
              posterSrc: s.posterSrc,
              sizeBytes: s.sizeBytes,
            }}
            vehicleName={vehicleName}
            fallbackPoster={fallbackPoster}
            onShowPhotos={() => setPreview(false)}
          />
        </div>
      )}
    </section>
  );
}
