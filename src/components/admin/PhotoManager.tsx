"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { deletePhotoAction, reorderPhotosAction, updatePhotoAction } from "@/app/admin/actions";
import { PHOTO_ANGLES, type PhotoAngle, type PhotoKind } from "@/lib/db/schema";
import { angleLabel } from "@/lib/vehicle-labels";

export type ManagedPhoto = {
  id: string;
  src: string;
  alt: string | null;
  angle: PhotoAngle | null;
  kind: PhotoKind;
  focalX: number;
  focalY: number;
};

type Upload = { name: string; progress: number; error?: string; done?: boolean };

const MIN_SPIN = 12;

function uploadFile(url: string, file: File, kind: PhotoKind, onProgress: (p: number) => void) {
  return new Promise<ManagedPhoto>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      let body: { error?: string } & Partial<ManagedPhoto> = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as ManagedPhoto);
      else reject(new Error(body.error ?? `Falha no envio (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Falha de conexão"));
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);
    xhr.send(fd);
  });
}

export function PhotoManager({ vehicleId, initial }: { vehicleId: string; initial: ManagedPhoto[] }) {
  const router = useRouter();
  const [photos, setPhotos] = useState(initial);
  const [tab, setTab] = useState<PhotoKind>("galeria");
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [over, setOver] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<string, "salvando" | "salvo" | "erro">>({});
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const list = photos.filter((p) => p.kind === tab);
  const spinCount = photos.filter((p) => p.kind === "giro").length;

  const persistOrder = (next: ManagedPhoto[]) => {
    setPhotos(next);
    const ordered = [...next.filter((p) => p.kind === "galeria"), ...next.filter((p) => p.kind === "giro")].map((p) => p.id);
    startTransition(async () => {
      await reorderPhotosAction(vehicleId, ordered);
    });
  };

  const move = (id: string, to: number) => {
    const sub = [...list];
    const from = sub.findIndex((p) => p.id === id);
    if (from < 0 || to < 0 || to >= sub.length) return;
    const [item] = sub.splice(from, 1);
    sub.splice(to, 0, item);
    persistOrder([...photos.filter((p) => p.kind !== tab), ...sub]);
  };

  const patch = (id: string, changes: Partial<ManagedPhoto>, immediate = false) => {
    const next = photos.map((p) => (p.id === id ? { ...p, ...changes } : p));
    setPhotos(next);
    const photo = next.find((p) => p.id === id)!;
    clearTimeout(timers.current[id]);
    const run = async () => {
      setSaving((s) => ({ ...s, [id]: "salvando" }));
      try {
        await updatePhotoAction({
          id,
          alt: photo.alt ?? "",
          angle: photo.angle ?? "",
          kind: photo.kind,
          focalX: photo.focalX,
          focalY: photo.focalY,
        });
        setSaving((s) => ({ ...s, [id]: "salvo" }));
      } catch {
        setSaving((s) => ({ ...s, [id]: "erro" }));
      }
    };
    if (immediate) run();
    else timers.current[id] = setTimeout(run, 600);
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta foto definitivamente?")) return;
    setPhotos((p) => p.filter((x) => x.id !== id));
    await deletePhotoAction(id);
    router.refresh();
  };

  const onFiles = async (files: FileList | File[]) => {
    const arr = [...files].filter((f) => f.type.startsWith("image/"));
    if (!arr.length) return;
    const kind = tab;
    setUploads(arr.map((f) => ({ name: f.name, progress: 0 })));
    for (const [i, file] of arr.entries()) {
      try {
        const photo = await uploadFile(`/api/admin/vehicles/${vehicleId}/photos`, file, kind, (p) =>
          setUploads((u) => u.map((x, j) => (j === i ? { ...x, progress: p } : x))),
        );
        setPhotos((p) => [...p, { ...photo, kind }]);
        setUploads((u) => u.map((x, j) => (j === i ? { ...x, progress: 1, done: true } : x)));
      } catch (err) {
        setUploads((u) => u.map((x, j) => (j === i ? { ...x, error: (err as Error).message } : x)));
      }
    }
    router.refresh();
  };

  return (
    <section className="a-card" aria-labelledby="fotos-title">
      <h2 className="a-card-title" id="fotos-title">
        Fotos <small>A primeira foto do anúncio é a capa. Clique na imagem para definir o ponto focal do recorte.</small>
      </h2>

      <div className="a-actions" style={{ marginTop: 0, marginBottom: 14 }} role="tablist">
        {(["galeria", "giro"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            className="a-link-btn"
            style={tab === k ? { borderColor: "var(--red)", color: "var(--text)" } : undefined}
            onClick={() => setTab(k)}
          >
            {k === "galeria" ? "Fotos do anúncio" : "Sequência 360°"}{" "}
            <span className="mono">{photos.filter((p) => p.kind === k).length}</span>
          </button>
        ))}
      </div>

      {tab === "giro" && (
        <p className="a-notice" data-tone={spinCount >= MIN_SPIN ? "ok" : "warn"}>
          O giro 360° só aparece no site com pelo menos {MIN_SPIN} quadros reais, fotografados em volta do carro, na ordem do giro
          (mesma distância e altura). Atualmente: {spinCount}.
        </p>
      )}

      <label
        className="a-drop"
        data-over={over || undefined}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setOver(true);
          }
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          if (!e.dataTransfer.files.length) return;
          e.preventDefault();
          setOver(false);
          onFiles(e.dataTransfer.files);
        }}
      >
        <Icon name="upload" size={24} />
        <strong>Arraste fotos aqui ou clique para selecionar</strong>
        <span className="a-help">JPG, PNG, WebP ou AVIF · até 15 MB cada · metadados (inclusive GPS) são removidos</span>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple onChange={(e) => e.target.files && onFiles(e.target.files)} />
      </label>

      {uploads.length > 0 && (
        <ul className="a-upload-list" aria-live="polite">
          {uploads.map((u, i) => (
            <li key={i}>
              <span>{u.name}</span>
              <span>{u.error ? <span className="a-error">{u.error}</span> : u.done ? "Enviada" : `${Math.round(u.progress * 100)}%`}</span>
              <span className="a-progress">
                <span style={{ width: `${u.progress * 100}%` }} />
              </span>
            </li>
          ))}
        </ul>
      )}

      {list.length === 0 ? (
        <p className="a-help" style={{ marginTop: 16 }}>
          Nenhuma foto nesta seção.
        </p>
      ) : (
        <ol className="a-photos">
          {list.map((p, i) => (
            <li
              key={p.id}
              className="a-photo"
              draggable
              data-dragging={dragId === p.id || undefined}
              data-over={(overId === p.id && dragId !== p.id) || undefined}
              onDragStart={(e) => {
                setDragId(p.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                setOverId(p.id);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId) move(dragId, i);
                setDragId(null);
                setOverId(null);
              }}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
            >
              <div
                className="a-photo-img"
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  patch(p.id, {
                    focalX: Math.round(((e.clientX - r.left) / r.width) * 100),
                    focalY: Math.round(((e.clientY - r.top) / r.height) * 100),
                  }, true);
                }}
                title="Clique para definir o ponto focal"
              >
                <Image src={p.src} alt={p.alt ?? ""} fill sizes="240px" style={{ objectFit: "cover", objectPosition: `${p.focalX}% ${p.focalY}%` }} draggable={false} />
                <span className="a-focal" style={{ left: `${p.focalX}%`, top: `${p.focalY}%` }} aria-hidden="true" />
                {tab === "galeria" && i === 0 && <span className="a-cover-badge">Capa</span>}
                {tab === "giro" && <span className="a-cover-badge">Quadro {i + 1}</span>}
              </div>
              <div className="a-photo-body">
                <input
                  className="a-input"
                  value={p.alt ?? ""}
                  onChange={(e) => patch(p.id, { alt: e.target.value })}
                  placeholder="Descrição da foto (acessibilidade)"
                  aria-label="Descrição da foto"
                  maxLength={160}
                />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  <select className="a-select" value={p.angle ?? ""} onChange={(e) => patch(p.id, { angle: (e.target.value || null) as PhotoAngle | null }, true)} aria-label="Ângulo">
                    <option value="">Ângulo…</option>
                    {PHOTO_ANGLES.map((a) => (
                      <option key={a} value={a}>
                        {angleLabel[a]}
                      </option>
                    ))}
                  </select>
                  <select className="a-select" value={p.kind} onChange={(e) => patch(p.id, { kind: e.target.value as PhotoKind }, true)} aria-label="Seção da foto">
                    <option value="galeria">Anúncio</option>
                    <option value="giro">Giro 360°</option>
                  </select>
                </div>
                <div className="a-photo-tools">
                  <div style={{ display: "flex", gap: 4 }}>
                    <button type="button" className="a-icon-btn" onClick={() => move(p.id, i - 1)} disabled={i === 0} aria-label="Mover para antes">
                      <Icon name="arrow-left" size={16} />
                    </button>
                    <button type="button" className="a-icon-btn" onClick={() => move(p.id, i + 1)} disabled={i === list.length - 1} aria-label="Mover para depois">
                      <Icon name="arrow" size={16} />
                    </button>
                    {tab === "galeria" && i > 0 && (
                      <button type="button" className="a-link-btn" onClick={() => move(p.id, 0)}>
                        Tornar capa
                      </button>
                    )}
                  </div>
                  <button type="button" className="a-icon-btn" data-danger onClick={() => remove(p.id)} aria-label="Excluir foto">
                    <Icon name="trash" size={16} />
                  </button>
                </div>
                {saving[p.id] && (
                  <span className={saving[p.id] === "erro" ? "a-error" : "a-help"}>
                    {saving[p.id] === "salvando" ? "Salvando…" : saving[p.id] === "salvo" ? "Salvo" : "Erro ao salvar"}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
