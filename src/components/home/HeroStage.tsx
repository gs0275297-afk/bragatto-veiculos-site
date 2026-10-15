"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { PublicPhoto } from "@/lib/data/vehicles";
import styles from "./Hero.module.css";

export type StageItem = {
  slug: string;
  brand: string;
  model: string;
  name: string;
  specs: string[];
  price: string | null;
  photo: PublicPhoto;
};

const AUTOPLAY_MS = 7000;

/** Mostrador inspirado em velocímetro: cada marca é um veículo em destaque; o ponteiro indica o atual. */
function Gauge({ count, active }: { count: number; active: number }) {
  const start = -120;
  const sweep = 240;
  const angleFor = (i: number) => start + (count > 1 ? (sweep * i) / (count - 1) : sweep / 2);
  const minor = Array.from({ length: 25 }, (_, i) => start + (sweep * i) / 24);
  const needle = angleFor(active);
  const r = 46;
  const arcPath = (from: number, to: number) => {
    const p = (deg: number) => {
      const rad = ((deg - 90) * Math.PI) / 180;
      return [56 + r * Math.cos(rad), 56 + r * Math.sin(rad)];
    };
    const [x1, y1] = p(from);
    const [x2, y2] = p(to);
    return `M ${x1} ${y1} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  };
  return (
    <svg className={styles.gauge} viewBox="0 0 112 92" aria-hidden="true">
      <path d={arcPath(start, start + sweep)} className={styles.gaugeTrack} />
      <path d={arcPath(start, Math.max(start + 0.1, needle))} className={styles.gaugeFill} />
      {minor.map((a, i) => (
        <line key={i} x1="56" y1={56 - r + 5} x2="56" y2={56 - r + (i % 6 === 0 ? 11 : 8)} transform={`rotate(${a} 56 56)`} className={styles.gaugeTick} />
      ))}
      {Array.from({ length: count }, (_, i) => (
        <circle key={i} cx="56" cy={56 - r} r={i === active ? 2.6 : 1.6} transform={`rotate(${angleFor(i)} 56 56)`} className={i === active ? styles.gaugeDotOn : styles.gaugeDot} />
      ))}
      <g className={styles.needle} style={{ transform: `rotate(${needle}deg)` }}>
        <line x1="56" y1="60" x2="56" y2={56 - r + 12} />
      </g>
      <circle cx="56" cy="56" r="4" className={styles.hub} />
    </svg>
  );
}

export function HeroStage({ items }: { items: StageItem[] }) {
  const [active, setActive] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [mounted, setMounted] = useState<Set<number>>(() => new Set([0]));
  const [autoplay, setAutoplay] = useState(false);
  const [paused, setPaused] = useState(false);
  const [offscreen, setOffscreen] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const count = items.length;

  const go = (next: number) => {
    const target = (next + count) % count;
    if (target === active) return;
    setPrev(active);
    setActive(target);
    setMounted((m) => (m.has(target) ? m : new Set(m).add(target)));
  };

  // autoplay apenas sem movimento reduzido e com mais de um destaque
  useEffect(() => {
    if (count < 2) return;
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setAutoplay(!mq.matches);
    update();
    mq.addEventListener("change", update);
    const onVis = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      mq.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [count]);

  // pausa o avanço automático quando o palco sai da tela
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || count < 2) return;
    const io = new IntersectionObserver(([entry]) => setOffscreen(!entry.isIntersecting), { threshold: 0.2 });
    io.observe(frame);
    return () => io.disconnect();
  }, [count]);

  // pré-carrega o próximo destaque depois que o primeiro já apareceu
  useEffect(() => {
    if (count < 2) return;
    const t = setTimeout(() => setMounted((m) => (m.has((active + 1) % count) ? m : new Set(m).add((active + 1) % count))), 1800);
    return () => clearTimeout(t);
  }, [active, count]);

  // micro-paralaxe da foto acompanhando o cursor (desktop)
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    let raf = 0;
    const tick = () => {
      x += (tx - x) * 0.07;
      y += (ty - y) * 0.07;
      frame.style.setProperty("--px", x.toFixed(4));
      frame.style.setProperty("--py", y.toFixed(4));
      if (Math.abs(tx - x) > 0.001 || Math.abs(ty - y) > 0.001) raf = requestAnimationFrame(tick);
      else raf = 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent) => {
      const r = frame.getBoundingClientRect();
      tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
      kick();
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
      kick();
    };
    frame.addEventListener("pointermove", onMove, { passive: true });
    frame.addEventListener("pointerleave", onLeave);
    return () => {
      frame.removeEventListener("pointermove", onMove);
      frame.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  // gesto de arrastar no toque
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") touch.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(e.clientY - start.y)) go(active + (dx < 0 ? 1 : -1));
  };

  const item = items[active];

  return (
    <div
      className={styles.stage}
      role="region"
      aria-roledescription="carrossel"
      aria-label="Veículos em destaque"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        ref={frameRef}
        className={styles.frame}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (touch.current = null)}
      >
        {items.map((it, i) =>
          mounted.has(i) ? (
            <Link
              key={it.slug}
              href={`/veiculos/${it.slug}`}
              className={styles.slide}
              data-state={i === active ? "active" : i === prev ? "leaving" : "idle"}
              aria-hidden={i !== active}
              tabIndex={i === active ? 0 : -1}
              aria-label={`Ver ${it.brand} ${it.name}`}
              draggable={false}
            >
              <span className={styles.slideImg}>
                <Image
                  src={it.photo.src}
                  alt={it.photo.alt || `${it.brand} ${it.name}`}
                  fill
                  sizes="(max-width: 980px) 100vw, 62vw"
                  quality={85}
                  preload={i === 0}
                  placeholder={it.photo.blurDataUrl ? "blur" : "empty"}
                  blurDataURL={it.photo.blurDataUrl ?? undefined}
                  style={{ objectFit: "cover", objectPosition: `${it.photo.focalX}% ${it.photo.focalY}%` }}
                  draggable={false}
                />
              </span>
            </Link>
          ) : null,
        )}
        <div className={styles.shade} aria-hidden="true" />
        <div className={styles.frameCorners} aria-hidden="true" />

        <div className={styles.caption} aria-live="polite" key={item.slug}>
          <p className={`mono ${styles.capIndex}`}>
            <span>{String(active + 1).padStart(2, "0")}</span> / {String(count).padStart(2, "0")} — {item.brand}
          </p>
          <p className={styles.capTitle}>{item.name}</p>
          <p className={`mono ${styles.capSpecs}`}>{item.specs.join("  ·  ")}</p>
          <div className={styles.capFoot}>
            <p className={styles.capPrice}>{item.price ?? "Preço sob consulta"}</p>
            <Link href={`/veiculos/${item.slug}`} className={`link ${styles.capLink}`} prefetch={true}>
              Ver veículo <Icon name="arrow" size={16} />
            </Link>
          </div>
        </div>
      </div>

      {count > 1 && (
        <div className={styles.controls}>
          <Gauge count={count} active={active} />
          <ol className={styles.index}>
            {items.map((it, i) => (
              <li key={it.slug}>
                <button
                  type="button"
                  onClick={() => go(i)}
                  aria-current={i === active ? "true" : undefined}
                  aria-label={`Destaque ${i + 1} de ${count}: ${it.brand} ${it.name}`}
                >
                  <span className="mono">{String(i + 1).padStart(2, "0")}</span>
                  <span className={styles.indexName}>{it.model}</span>
                  <span className={styles.progress} aria-hidden="true">
                    {i === active && autoplay && (
                      <span
                        className={styles.progressBar}
                        style={{ animationDuration: `${AUTOPLAY_MS}ms`, animationPlayState: paused || offscreen ? "paused" : "running" }}
                        onAnimationEnd={() => go(active + 1)}
                      />
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <div className={styles.arrows}>
            <button type="button" onClick={() => go(active - 1)} aria-label="Destaque anterior">
              <Icon name="chevron-left" size={18} />
            </button>
            <button type="button" onClick={() => go(active + 1)} aria-label="Próximo destaque">
              <Icon name="chevron" size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
