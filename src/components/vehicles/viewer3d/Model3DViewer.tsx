"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { PublicModel3D } from "@/lib/data/vehicles";
import type { ViewerHandle } from "./engine";
import { Model3DControls } from "./Model3DControls";
import { Model3DStatus } from "./Model3DStatus";
import styles from "./Model3D.module.css";

type Phase = "idle" | "checking" | "loading" | "ready" | "error" | "unsupported";

const mb = (bytes: number | null) => (bytes ? `${(bytes / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB` : null);

/**
 * Visualizador 3D de um veículo. Nada de Three.js é baixado até o visitante pedir.
 * Antes de carregar, confirma que o arquivo existe (HEAD). Em qualquer falha, oferece as fotos reais.
 */
export function Model3DViewer({
  model,
  vehicleName,
  fallbackPoster,
  onShowPhotos,
}: {
  model: PublicModel3D;
  vehicleName: string;
  fallbackPoster: string | null;
  onShowPhotos: () => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<ViewerHandle | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string>("");
  const [hint, setHint] = useState<"drag" | "wheel" | null>("drag");
  const [attempt, setAttempt] = useState(0);
  const wheelHintTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const load = useCallback(() => {
    setAttempt((a) => a + 1);
  }, []);

  useEffect(() => {
    if (attempt === 0) return;
    let cancelled = false;
    const container = stageRef.current;
    if (!container) return;

    (async () => {
      setError("");
      setProgress(null);
      setPhase("checking");
      const { createViewer, webglAvailable } = await import("./engine");
      if (cancelled) return;
      if (!webglAvailable()) {
        setPhase("unsupported");
        return;
      }
      try {
        const head = await fetch(model.url, { method: "HEAD" });
        if (!head.ok) throw new Error(`HTTP ${head.status}`);
      } catch {
        if (!cancelled) {
          setError("O arquivo do modelo 3D não está disponível no momento.");
          setPhase("error");
        }
        return;
      }
      if (cancelled) return;
      setPhase("loading");
      const mobile = matchMedia("(pointer: coarse)").matches;
      try {
        const handle = await createViewer({
          url: model.url,
          container,
          reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
          maxTextureSize: mobile ? 2048 : 4096,
          pixelRatioCap: mobile ? 1.5 : 2,
          onProgress: (r) => !cancelled && setProgress(r),
          onInteract: () => setHint(null),
          onWheelWithoutModifier: () => {
            setHint("wheel");
            clearTimeout(wheelHintTimer.current);
            wheelHintTimer.current = setTimeout(() => setHint(null), 1800);
          },
          onContextLost: () => {
            setError("A visualização 3D foi interrompida pelo navegador.");
            setPhase("error");
          },
        });
        if (cancelled) {
          handle.dispose();
          return;
        }
        handleRef.current = handle;
        // diagnóstico opcional (memória WebGL): localStorage.setItem("bv3d-debug", "1")
        try {
          if (process.env.NODE_ENV !== "production" || localStorage.getItem("bv3d-debug") === "1")
            (window as unknown as { __bv3d?: ViewerHandle }).__bv3d = handle;
        } catch {}
        setPhase("ready");
      } catch (err) {
        console.error("[3D] falha ao carregar o modelo", err);
        if (!cancelled) {
          setError("Não foi possível abrir o modelo 3D neste dispositivo.");
          setPhase("error");
        }
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(wheelHintTimer.current);
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, [attempt, model.url]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const h = handleRef.current;
    if (!h) return;
    const map: Record<string, () => void> = {
      ArrowLeft: () => h.rotateBy(Math.PI / 12),
      ArrowRight: () => h.rotateBy(-Math.PI / 12),
      "+": () => h.zoomBy(0.85),
      "=": () => h.zoomBy(0.85),
      "-": () => h.zoomBy(1.18),
      "0": () => h.reset(),
      Home: () => h.reset(),
    };
    const fn = map[e.key];
    if (fn) {
      e.preventDefault();
      fn();
      setHint(null);
    }
  };

  const poster = model.posterSrc ?? fallbackPoster;
  const disclaimer =
    model.kind === "digitalizacao"
      ? "Digitalização 3D deste veículo."
      : `Modelo 3D ilustrativo de ${vehicleName}. Pode não reproduzir cor, versão, rodas e estado de conservação deste exemplar — confira as fotos reais.`;

  return (
    <div className={styles.viewer} data-phase={phase}>
      <div className={styles.stageWrap}>
      <div
        ref={stageRef}
        className={styles.stage}
        tabIndex={phase === "ready" ? 0 : -1}
        role={phase === "ready" ? "application" : undefined}
        aria-roledescription={phase === "ready" ? "visualizador 3D" : undefined}
        aria-label={
          phase === "ready"
            ? `Modelo 3D de ${vehicleName}. Setas giram, + e − aproximam, 0 restaura a visão inicial.`
            : undefined
        }
        onKeyDown={onKeyDown}
      >
        {phase !== "ready" && poster && (
          <Image src={poster} alt="" fill sizes="(max-width: 980px) 100vw, 60vw" className={styles.poster} aria-hidden="true" />
        )}
      </div>

      {phase === "idle" && (
        <div className={styles.overlay}>
          <button type="button" className="btn btn-light" onClick={load}>
            <Icon name="cube" size={18} /> Carregar visualização 3D
            {mb(model.sizeBytes) && <span className={`mono ${styles.size}`}>{mb(model.sizeBytes)}</span>}
          </button>
          <p className={styles.overlayNote}>O modelo é baixado somente agora, sob demanda.</p>
        </div>
      )}

      {(phase === "checking" || phase === "loading") && <Model3DStatus progress={progress} checking={phase === "checking"} />}

      {(phase === "error" || phase === "unsupported") && (
        <div className={styles.overlay} role="alert">
          <p className={styles.errorTitle}>
            {phase === "unsupported" ? "Este navegador não oferece suporte a 3D." : error}
          </p>
          <div className={styles.overlayActions}>
            {phase === "error" && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={load}>
                Tentar novamente
              </button>
            )}
            <button type="button" className="btn btn-light btn-sm" onClick={onShowPhotos}>
              <Icon name="grid" size={16} /> Ver fotos do veículo
            </button>
          </div>
        </div>
      )}

      {phase === "ready" && (
        <>
          <Model3DControls
            onReset={() => handleRef.current?.reset()}
            onZoomIn={() => handleRef.current?.zoomBy(0.85)}
            onZoomOut={() => handleRef.current?.zoomBy(1.18)}
          />
          {hint && (
            <p className={`mono ${styles.hint}`} aria-hidden="true">
              {hint === "drag" ? (
                <>
                  <Icon name="orbit" size={16} /> Arraste para girar · pinça ou Ctrl + rolagem para aproximar
                </>
              ) : (
                <>Use Ctrl + rolagem (ou ⌘) para aproximar</>
              )}
            </p>
          )}
        </>
      )}

      </div>

      <p className={styles.disclaimer} data-kind={model.kind}>
        <Icon name="cube" size={14} /> {disclaimer} <span className={styles.source}>Origem: {model.source}</span>
      </p>
    </div>
  );
}
