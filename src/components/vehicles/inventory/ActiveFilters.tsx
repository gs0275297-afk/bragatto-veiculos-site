import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { filtersToQuery, type ListingFilters } from "@/lib/filters";
import { formatNumber } from "@/lib/format";
import { fuelLabel, transmissionLabel } from "@/lib/vehicle-labels";
import styles from "./Inventory.module.css";

/** Chips dos filtros ativos — cada um é um link que remove aquele filtro (funciona sem JS). */
export function ActiveFilters({ filters }: { filters: ListingFilters }) {
  const base = { ...filters, pagina: 1 };
  const chips: { label: string; href: string }[] = [];
  const href = (f: ListingFilters) => `/veiculos${filtersToQuery(f)}`;

  if (filters.q) chips.push({ label: `“${filters.q}”`, href: href({ ...base, q: undefined }) });
  if (filters.marca) chips.push({ label: filters.marca, href: href({ ...base, marca: undefined }) });
  if (filters.precoMin || filters.precoMax)
    chips.push({
      label: `R$ ${filters.precoMin ? formatNumber(filters.precoMin) : "0"} – ${filters.precoMax ? formatNumber(filters.precoMax) : "∞"}`,
      href: href({ ...base, precoMin: undefined, precoMax: undefined }),
    });
  if (filters.anoMin || filters.anoMax)
    chips.push({
      label: `Ano ${filters.anoMin ?? "…"}–${filters.anoMax ?? "…"}`,
      href: href({ ...base, anoMin: undefined, anoMax: undefined }),
    });
  if (filters.kmMax) chips.push({ label: `Até ${formatNumber(filters.kmMax)} km`, href: href({ ...base, kmMax: undefined }) });
  for (const c of filters.cambio)
    chips.push({ label: transmissionLabel[c], href: href({ ...base, cambio: filters.cambio.filter((x) => x !== c) }) });
  for (const c of filters.combustivel)
    chips.push({ label: fuelLabel[c], href: href({ ...base, combustivel: filters.combustivel.filter((x) => x !== c) }) });

  if (!chips.length) return null;
  return (
    <ul className={styles.active} aria-label="Filtros ativos">
      {chips.map((c) => (
        <li key={c.label}>
          <Link href={c.href} scroll={false} replace aria-label={`Remover filtro ${c.label}`}>
            {c.label}
            <Icon name="close" size={14} />
          </Link>
        </li>
      ))}
      <li>
        <Link href={`/veiculos${filtersToQuery({ ordem: filters.ordem })}`} scroll={false} replace className={styles.clearAll}>
          Limpar tudo
        </Link>
      </li>
    </ul>
  );
}
