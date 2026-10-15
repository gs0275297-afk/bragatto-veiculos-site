"use client";

import { useId, useState } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import type { PublicModel3D, PublicPhoto } from "@/lib/data/vehicles";
import { Model3DViewer } from "@/components/vehicles/viewer3d/Model3DViewer";
import { Gallery } from "./Gallery";
import { SpinViewer } from "./SpinViewer";
import styles from "./VehicleMedia.module.css";

type Mode = "fotos" | "360" | "3d";

/**
 * Alterna entre fotos reais, giro 360° (se houver sequência) e 3D (se houver modelo válido).
 * Abas que não se aplicam ao anúncio simplesmente não aparecem.
 * O 3D é desmontado ao sair da aba — o que libera todos os recursos WebGL.
 */
export function VehicleMedia({
  photos,
  spin,
  model3d,
  name,
}: {
  photos: PublicPhoto[];
  spin: PublicPhoto[];
  model3d: PublicModel3D | null;
  name: string;
}) {
  const id = useId();
  const modes: { id: Mode; label: string; icon: IconName }[] = [
    { id: "fotos", label: `Fotos${photos.length ? ` (${photos.length})` : ""}`, icon: "grid" },
    ...(spin.length ? [{ id: "360" as const, label: "Giro 360°", icon: "orbit" as const }] : []),
    ...(model3d ? [{ id: "3d" as const, label: "Visualizar em 3D", icon: "cube" as const }] : []),
  ];
  const [mode, setMode] = useState<Mode>(model3d ? "3d" : "fotos");

  return (
    <div className={styles.media}>
      {modes.length > 1 && (
        <div className={styles.tabs} role="tablist" aria-label="Modo de visualização">
          {modes.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              id={`${id}-tab-${m.id}`}
              aria-selected={mode === m.id}
              aria-controls={`${id}-panel-${m.id}`}
              className={styles.tab}
              onClick={() => setMode(m.id)}
            >
              <Icon name={m.icon} size={16} /> {m.label}
            </button>
          ))}
        </div>
      )}

      <div className={styles.panels}>
        <div
          role="tabpanel"
          id={`${id}-panel-fotos`}
          aria-labelledby={`${id}-tab-fotos`}
          hidden={mode !== "fotos"}
          className={styles.panel}
        >
          <Gallery photos={photos} name={name} />
        </div>
        {spin.length > 0 && mode === "360" && (
          <div role="tabpanel" id={`${id}-panel-360`} aria-labelledby={`${id}-tab-360`} className={styles.panel}>
            <SpinViewer frames={spin} name={name} />
          </div>
        )}
        {model3d && mode === "3d" && (
          <div role="tabpanel" id={`${id}-panel-3d`} aria-labelledby={`${id}-tab-3d`} className={styles.panel}>
            <Model3DViewer
              model={model3d}
              vehicleName={name}
              fallbackPoster={photos[0]?.src ?? null}
              onShowPhotos={() => setMode("fotos")}
            />
          </div>
        )}
      </div>
    </div>
  );
}
