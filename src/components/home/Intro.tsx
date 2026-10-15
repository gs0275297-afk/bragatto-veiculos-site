"use client";

import Image from "next/image";
import { useEffect } from "react";
import styles from "./Intro.module.css";

/**
 * Abertura de marca (≈1,8 s). Só aparece na primeira visita da sessão à home e nunca com
 * movimento reduzido — a decisão é tomada antes da pintura pelo script em app/layout.tsx.
 * Não bloqueia cliques nem o carregamento do hero, que já está renderizado por baixo.
 */
export function Intro() {
  useEffect(() => {
    if (!document.documentElement.hasAttribute("data-intro")) return;
    try {
      sessionStorage.setItem("bv-intro", "1");
    } catch {}
  }, []);

  return (
    <div className={styles.intro} aria-hidden="true">
      <div className={styles.inner}>
        <Image src="/brand/bragatto-logo.png" alt="" width={260} height={182} preload sizes="260px" className={styles.logo} />
        <span className={styles.line} />
        <p className={`mono ${styles.tag}`}>Três Lagoas · MS</p>
      </div>
    </div>
  );
}
