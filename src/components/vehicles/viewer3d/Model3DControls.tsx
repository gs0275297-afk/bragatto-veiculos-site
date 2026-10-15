import { Icon } from "@/components/ui/Icon";
import styles from "./Model3D.module.css";

export function Model3DControls({
  onReset,
  onZoomIn,
  onZoomOut,
}: {
  onReset: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}) {
  return (
    <div className={styles.controls} role="toolbar" aria-label="Controles do 3D">
      <button type="button" onClick={onZoomIn} aria-label="Aproximar">
        <Icon name="plus" size={18} />
      </button>
      <button type="button" onClick={onZoomOut} aria-label="Afastar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M5 12h14" strokeLinecap="round" />
        </svg>
      </button>
      <span className={styles.controlsSep} aria-hidden="true" />
      <button type="button" onClick={onReset} aria-label="Restaurar visão inicial">
        <Icon name="orbit" size={18} />
        <span>Restaurar</span>
      </button>
    </div>
  );
}
