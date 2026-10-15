"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { PublicPhoto } from "@/lib/data/vehicles";
import { angleLabel } from "@/lib/vehicle-labels";
import { Lightbox } from "./Lightbox";
import styles from "./Gallery.module.css";

/**
 * Galeria das fotos reais: trilho com rolagem por toque (scroll-snap), miniaturas,
 * setas, teclado e visualização ampliada. As fotos são exibidas inteiras (sem corte).
 */
export function Gallery({ photos, name }: { photos: PublicPhoto[]; name: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const count = photos.length;

  const goTo = useCallback(
    (i: number, behavior: ScrollBehavior = "smooth") => {
      const track = trackRef.current;
      if (!track) return;
      const target = Math.max(0, Math.min(count - 1, i));
      const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
      track.scrollTo({ left: target * track.clientWidth, behavior: reduce ? "auto" : behavior });
    },
    [count],
  );

  // índice ativo a partir da rolagem do trilho
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setIndex(Math.round(track.scrollLeft / Math.max(1, track.clientWidth))));
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      track.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // mantém a miniatura ativa visível
  useEffect(() => {
    const thumb = thumbsRef.current?.children[index] as HTMLElement | undefined;
    thumb?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [index]);

  if (!count) {
    return (
      <div className={styles.empty}>
        <Icon name="grid" size={28} />
        <p className="mono">Fotos em breve</p>
      </div>
    );
  }

  const current = photos[Math.min(index, count - 1)];

  return (
    <div
      className={styles.gallery}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault();
          goTo(index + 1);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          goTo(index - 1);
        }
      }}
    >
      <div className={styles.stage}>
        <div ref={trackRef} className={styles.track} tabIndex={0} aria-label={`Fotos de ${name}. Use as setas para navegar.`} role="group" aria-roledescription="galeria">
          {photos.map((p, i) => (
            <figure key={p.id} className={styles.slide} aria-label={`Foto ${i + 1} de ${count}`}>
              <Image src={p.src} alt="" fill sizes="(max-width: 980px) 100vw, 62vw" quality={60} className={styles.backdrop} aria-hidden="true" loading={i === 0 ? "eager" : "lazy"} />
              <button type="button" className={styles.zoomHit} onClick={() => setLightbox(i)} aria-label={`Ampliar foto ${i + 1}`}>
                <Image
                  src={p.src}
                  alt={p.alt || `${name} — foto ${i + 1}`}
                  fill
                  sizes="(max-width: 980px) 100vw, 62vw"
                  quality={85}
                  preload={i === 0}
                  loading={i === 0 ? undefined : "lazy"}
                  placeholder={p.blurDataUrl ? "blur" : "empty"}
                  blurDataURL={p.blurDataUrl ?? undefined}
                  className={styles.photo}
                />
              </button>
            </figure>
          ))}
        </div>

        {count > 1 && (
          <>
            <button type="button" className={`${styles.arrow} ${styles.prev}`} onClick={() => goTo(index - 1)} disabled={index === 0} aria-label="Foto anterior">
              <Icon name="chevron-left" size={20} />
            </button>
            <button type="button" className={`${styles.arrow} ${styles.next}`} onClick={() => goTo(index + 1)} disabled={index >= count - 1} aria-label="Próxima foto">
              <Icon name="chevron" size={20} />
            </button>
          </>
        )}

        <div className={styles.hud}>
          <span className="mono" aria-live="polite">
            <b>{String(index + 1).padStart(2, "0")}</b> / {String(count).padStart(2, "0")}
            {current.angle && <span className={styles.angle}> · {angleLabel[current.angle]}</span>}
          </span>
          <button type="button" className={styles.expand} onClick={() => setLightbox(index)}>
            <Icon name="expand" size={16} /> <span>Ampliar</span>
          </button>
        </div>
      </div>

      {count > 1 && (
        <div ref={thumbsRef} className={`${styles.thumbs} thumbs-strip`} role="tablist" aria-label="Miniaturas">
          {photos.map((p, i) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Ver foto ${i + 1}${p.angle ? ` (${angleLabel[p.angle]})` : ""}`}
              className={styles.thumb}
              onClick={() => goTo(i)}
            >
              <Image
                src={p.src}
                alt=""
                fill
                sizes="112px"
                quality={60}
                style={{ objectFit: "cover", objectPosition: `${p.focalX}% ${p.focalY}%` }}
              />
            </button>
          ))}
        </div>
      )}

      {lightbox !== null && (
        <Lightbox
          photos={photos}
          start={lightbox}
          name={name}
          onClose={(last) => {
            setLightbox(null);
            goTo(last, "auto");
          }}
        />
      )}
    </div>
  );
}
