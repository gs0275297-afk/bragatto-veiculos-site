"use client";

import { useRouter } from "next/navigation";
import { createContext, use, useEffect, useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { filtersToQuery, type ListingFilters } from "@/lib/filters";
import type { Facets } from "@/lib/data/vehicles";
import { FiltersPanel } from "./FiltersPanel";
import styles from "./Inventory.module.css";

type Ctx = {
  filters: ListingFilters;
  apply: (next: Partial<ListingFilters>, opts?: { resetPage?: boolean }) => void;
  pending: boolean;
};

const InventoryContext = createContext<Ctx | null>(null);

export function useInventory() {
  const ctx = use(InventoryContext);
  if (!ctx) throw new Error("useInventory fora de InventoryShell");
  return ctx;
}

export function InventoryShell({
  filters,
  facets,
  total,
  activeCount,
  children,
}: {
  filters: ListingFilters;
  facets: Facets;
  total: number;
  activeCount: number;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [drawer, setDrawer] = useState(false);

  const apply: Ctx["apply"] = (next, opts = { resetPage: true }) => {
    const merged: ListingFilters = { ...filters, ...next, pagina: opts.resetPage ? 1 : (next.pagina ?? filters.pagina) };
    startTransition(() => {
      router.replace(`/veiculos${filtersToQuery(merged)}`, { scroll: false });
    });
  };

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawer]);

  return (
    <InventoryContext value={{ filters, apply, pending }}>
      <div className={styles.layout}>
        <button type="button" className={`btn btn-ghost ${styles.drawerToggle}`} onClick={() => setDrawer(true)} aria-expanded={drawer} aria-controls="filtros">
          <Icon name="filter" size={18} /> Filtros{activeCount ? ` (${activeCount})` : ""}
        </button>

        <aside id="filtros" className={styles.sidebar} data-open={drawer || undefined} aria-label="Filtros do estoque">
          <div className={styles.drawerHead}>
            <p className="h3">Filtros</p>
            <button type="button" className={styles.drawerClose} onClick={() => setDrawer(false)} aria-label="Fechar filtros">
              <Icon name="close" size={20} />
            </button>
          </div>
          <FiltersPanel facets={facets} />
          <div className={styles.drawerFoot}>
            <button type="button" className="btn btn-primary btn-block" onClick={() => setDrawer(false)}>
              Ver {total} {total === 1 ? "resultado" : "resultados"}
            </button>
          </div>
        </aside>
        {drawer && <div className={styles.scrim} onClick={() => setDrawer(false)} aria-hidden="true" />}

        <div className={styles.results} data-pending={pending || undefined} aria-busy={pending}>
          {children}
        </div>
      </div>
    </InventoryContext>
  );
}
