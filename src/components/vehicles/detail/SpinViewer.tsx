"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { PublicPhoto } from "@/lib/data/vehicles";
import styles from "./SpinViewer.module.css";

/**
 * Giro 360° a partir de uma SEQUÊNCIA REAL de fotos (quadros cadastrados como "giro", em ordem).
 * Só é oferecido quando há quadros suficientes — nunca simula rotação a partir de uma foto única.
 */
export function SpinViewer({ frames, name }: { frames: PublicPhoto[]; name: string }) {
  const [frame, setFrame] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const drag = useRef<{ x: number; frame: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const n = frames.length;
  const ready = loaded >= n;

  const set = (f: number) => setFrame(((f % n) + n) % n);

  return (
    <div className={styles.spin}>
      <div
        ref={ref}
        className={styles.stage}
        tabIndex={0}
        role="slider"
        aria-label={`Giro 360° de ${name} — fotos reais em sequência`}
        aria-valuemin={1}
        aria-valuemax={n}
        aria-valuenow={frame + 1}
        aria-valuetext={`Quadro ${frame + 1} de ${n}`}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") set(frame + 1);
          if (e.key === "ArrowLeft") set(frame - 1);
        }}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, frame };
          if (e.pointerType === "mouse") e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const width = ref.current?.clientWidth ?? 1;
          const step = width / (n * 1.1);
          set(drag.current.frame - Math.round((e.clientX - drag.current.x) / step));
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        {frames.map((p, i) => (
          <Image
            key={p.id}
            src={p.src}
            alt={i === frame ? p.alt || `${name} — quadro ${i + 1} do giro` : ""}
            fill
            sizes="(max-width: 980px) 100vw, 62vw"
            quality={75}
            loading="eager"
            className={styles.frame}
            data-active={i === frame || undefined}
            onLoad={() => setLoaded((c) => c + 1)}
            draggable={false}
          />
        ))}
        {!ready && (
          <p className={`mono ${styles.loading}`} role="status">
            Carregando quadros {Math.min(loaded, n)}/{n}
          </p>
        )}
      </div>
      <div className={styles.bar}>
        <Icon name="orbit" size={16} />
        <input
          type="range"
          min={0}
          max={n - 1}
          value={frame}
          onChange={(e) => set(Number(e.target.value))}
          aria-label="Posição do giro"
          className={styles.range}
        />
        <span className="mono">
          {String(frame + 1).padStart(2, "0")}/{n}
        </span>
      </div>
      <p className={styles.note}>Arraste para girar · sequência de {n} fotos reais do veículo</p>
    </div>
  );
}
