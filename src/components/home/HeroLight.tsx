"use client";

import { useEffect, useRef } from "react";
import styles from "./Hero.module.css";

/**
 * Luz de estúdio que acompanha o cursor (apenas em dispositivos com mouse).
 * Atualiza variáveis CSS com interpolação em requestAnimationFrame — sem re-render do React.
 */
export function HeroLight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const section = el?.parentElement;
    if (!el || !section) return;
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let tx = 0.62;
    let ty = 0.35;
    let x = tx;
    let y = ty;
    let raf = 0;
    let running = false;

    const tick = () => {
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      el.style.setProperty("--lx", `${(x * 100).toFixed(2)}%`);
      el.style.setProperty("--ly", `${(y * 100).toFixed(2)}%`);
      if (Math.abs(tx - x) > 0.0005 || Math.abs(ty - y) > 0.0005) raf = requestAnimationFrame(tick);
      else running = false;
    };
    const onMove = (e: PointerEvent) => {
      const r = section.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width;
      ty = (e.clientY - r.top) / r.height;
      if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };
    section.addEventListener("pointermove", onMove, { passive: true });
    el.dataset.active = "";
    return () => {
      section.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={ref} className={styles.light} aria-hidden="true" />;
}
