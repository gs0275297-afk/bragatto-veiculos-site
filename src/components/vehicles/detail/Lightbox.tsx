"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { PublicPhoto } from "@/lib/data/vehicles";
import { angleLabel } from "@/lib/vehicle-labels";
import styles from "./Gallery.module.css";

/**
 * Visualização ampliada em <dialog> nativo (foco preso, Esc fecha).
 * Toque/clique na foto alterna o zoom 2,5×; com zoom, a foto pode ser arrastada/rolada.
 */
export function Lightbox({
  photos,
  start,
  name,
  onClose,
}: {
  photos: PublicPhoto[];
  start: number;
  name: string;
  onClose: (lastIndex: number) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(start);
  const [zoomed, setZoomed] = useState(false);
  const indexRef = useRef(start);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    indexRef.current = index;
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    const track = trackRef.current;
    if (!dialog || !track) return;
    if (!dialog.open) dialog.showModal();
    track.scrollLeft = start * track.clientWidth;
    document.body.style.overflow = "hidden";
    const onCancel = (e: Event) => {
      e.preventDefault();
      onCloseRef.current(indexRef.current);
    };
    dialog.addEventListener("cancel", onCancel);
    return () => {
      dialog.removeEventListener("cancel", onCancel);
      document.body.style.overflow = "";
    };
  }, [start]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setIndex(Math.round(track.scrollLeft / Math.max(1, track.clientWidth))));
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, []);

  const go = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    setZoomed(false);
    const target = Math.max(0, Math.min(photos.length - 1, i));
    track.scrollTo({ left: target * track.clientWidth, behavior: "smooth" });
  };

  const toggleZoom = (e: React.MouseEvent<HTMLDivElement>) => {
    const box = e.currentTarget;
    if (zoomed) {
      setZoomed(false);
      return;
    }
    const rect = box.getBoundingClientRect();
    const fx = (e.clientX - rect.left) / rect.width;
    const fy = (e.clientY - rect.top) / rect.height;
    setZoomed(true);
    requestAnimationFrame(() => {
      box.scrollLeft = fx * box.scrollWidth - rect.width / 2;
      box.scrollTop = fy * box.scrollHeight - rect.height / 2;
    });
  };

  const current = photos[index];

  return (
    <dialog
      ref={dialogRef}
      className={styles.lightbox}
      aria-label={`Fotos ampliadas de ${name}`}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
    >
      <div className={styles.lbBar}>
        <span className="mono">
          {String(index + 1).padStart(2, "0")} / {String(photos.length).padStart(2, "0")}
          {current?.angle && <span className={styles.angle}> · {angleLabel[current.angle]}</span>}
        </span>
        <span className={`mono ${styles.lbHint}`}>{zoomed ? "Toque para reduzir" : "Toque na foto para ampliar"}</span>
        <button type="button" className={styles.lbClose} onClick={() => onClose(index)} aria-label="Fechar">
          <Icon name="close" size={22} />
        </button>
      </div>

      <div ref={trackRef} className={styles.lbTrack} data-zoomed={zoomed || undefined}>
        {photos.map((p, i) => (
          <div
            key={p.id}
            className={styles.lbSlide}
            data-zoomed={(zoomed && i === index) || undefined}
            onClick={i === index ? toggleZoom : undefined}
          >
            <div className={styles.lbImgWrap}>
              <Image
                src={p.src}
                alt={p.alt || `${name} — foto ${i + 1}`}
                fill
                sizes={zoomed && i === index ? "250vw" : "100vw"}
                quality={85}
                loading={Math.abs(i - start) <= 1 ? "eager" : "lazy"}
                className={styles.lbImg}
              />
            </div>
          </div>
        ))}
      </div>

      {photos.length > 1 && !zoomed && (
        <>
          <button type="button" className={`${styles.arrow} ${styles.prev}`} onClick={() => go(index - 1)} disabled={index === 0} aria-label="Foto anterior">
            <Icon name="chevron-left" size={22} />
          </button>
          <button type="button" className={`${styles.arrow} ${styles.next}`} onClick={() => go(index + 1)} disabled={index >= photos.length - 1} aria-label="Próxima foto">
            <Icon name="chevron" size={22} />
          </button>
        </>
      )}
    </dialog>
  );
}
