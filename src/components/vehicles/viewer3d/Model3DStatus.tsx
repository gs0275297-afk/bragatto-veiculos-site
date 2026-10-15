import styles from "./Model3D.module.css";

/** Indicador discreto de carregamento: anel de progresso quando o tamanho é conhecido. */
export function Model3DStatus({ progress, checking }: { progress: number | null; checking: boolean }) {
  const pct = progress == null ? null : Math.round(progress * 100);
  const r = 22;
  const c = 2 * Math.PI * r;
  return (
    <div className={styles.overlay} role="status" aria-live="polite">
      <svg className={styles.ring} viewBox="0 0 56 56" data-indeterminate={pct == null || undefined} aria-hidden="true">
        <circle cx="28" cy="28" r={r} className={styles.ringTrack} />
        <circle
          cx="28"
          cy="28"
          r={r}
          className={styles.ringBar}
          strokeDasharray={c}
          strokeDashoffset={pct == null ? c * 0.72 : c * (1 - pct / 100)}
        />
      </svg>
      <p className="mono">{checking ? "Verificando modelo…" : pct == null ? "Carregando modelo 3D…" : `Carregando ${pct}%`}</p>
    </div>
  );
}
