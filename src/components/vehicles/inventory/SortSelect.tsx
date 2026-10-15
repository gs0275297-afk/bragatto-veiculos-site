"use client";

import { SORTS, type SortKey } from "@/lib/filters";
import { useInventory } from "./InventoryShell";
import styles from "./Inventory.module.css";

export function SortSelect() {
  const { filters, apply } = useInventory();
  return (
    <label className={styles.sort}>
      <span className="mono">Ordenar</span>
      <select value={filters.ordem} onChange={(e) => apply({ ordem: e.target.value as SortKey })} className={styles.select}>
        {Object.entries(SORTS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
