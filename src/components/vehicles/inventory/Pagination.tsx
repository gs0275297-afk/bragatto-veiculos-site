import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { filtersToQuery, type ListingFilters } from "@/lib/filters";
import styles from "./Inventory.module.css";

function range(page: number, pages: number): (number | "…")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pages - 1, page + 1);
  if (start > 2) out.push("…");
  for (let i = start; i <= end; i++) out.push(i);
  if (end < pages - 1) out.push("…");
  out.push(pages);
  return out;
}

export function Pagination({ filters, page, pages }: { filters: ListingFilters; page: number; pages: number }) {
  if (pages <= 1) return null;
  const href = (p: number) => `/veiculos${filtersToQuery({ ...filters, pagina: p })}`;
  return (
    <nav className={styles.pagination} aria-label="Paginação">
      {page > 1 ? (
        <Link href={href(page - 1)} className={styles.pageArrow} aria-label="Página anterior">
          <Icon name="chevron-left" size={18} />
        </Link>
      ) : (
        <span className={styles.pageArrow} aria-hidden="true" data-disabled>
          <Icon name="chevron-left" size={18} />
        </span>
      )}
      <ol>
        {range(page, pages).map((p, i) =>
          p === "…" ? (
            <li key={`gap-${i}`} className={styles.pageGap} aria-hidden="true">
              …
            </li>
          ) : (
            <li key={p}>
              <Link href={href(p)} aria-current={p === page ? "page" : undefined} className={`mono ${styles.page}`}>
                <span className="sr-only">Página </span>
                {String(p).padStart(2, "0")}
              </Link>
            </li>
          ),
        )}
      </ol>
      {page < pages ? (
        <Link href={href(page + 1)} className={styles.pageArrow} aria-label="Próxima página">
          <Icon name="chevron" size={18} />
        </Link>
      ) : (
        <span className={styles.pageArrow} aria-hidden="true" data-disabled>
          <Icon name="chevron" size={18} />
        </span>
      )}
    </nav>
  );
}
