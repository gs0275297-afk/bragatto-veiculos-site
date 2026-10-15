"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { Facets } from "@/lib/data/vehicles";
import { FUELS, TRANSMISSIONS, type Fuel, type Transmission } from "@/lib/db/schema";
import { KM_PRESETS } from "@/lib/filters";
import { formatNumber } from "@/lib/format";
import { fuelLabel, transmissionLabel } from "@/lib/vehicle-labels";
import { Icon } from "@/components/ui/Icon";
import { useInventory } from "./InventoryShell";
import styles from "./Inventory.module.css";

function useDebounced(fn: () => void, deps: unknown[], delay = 450) {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(fn, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

const digits = (s: string) => s.replace(/\D/g, "");
const toNum = (s: string) => (digits(s) ? Number(digits(s)) : undefined);

/**
 * O formulário funciona sem JavaScript (GET /veiculos). Com JS, cada alteração atualiza a URL
 * e o servidor devolve os resultados filtrados.
 */
export function FiltersPanel({ facets }: { facets: Facets }) {
  const id = useId();
  const { filters, apply } = useInventory();

  const [q, setQ] = useState(filters.q ?? "");
  const [precoMin, setPrecoMin] = useState(filters.precoMin ? formatNumber(filters.precoMin) : "");
  const [precoMax, setPrecoMax] = useState(filters.precoMax ? formatNumber(filters.precoMax) : "");

  // Mantém os campos em sincronia quando os filtros mudam por fora (chips, limpar, voltar).
  // Ignora o "eco" das próprias alterações para não sobrescrever o que ainda está sendo digitado.
  const [echo, setEcho] = useState({ q: filters.q ?? "", min: filters.precoMin, max: filters.precoMax });
  const [synced, setSynced] = useState(filters);
  if (synced !== filters) {
    setSynced(filters);
    if ((filters.q ?? "") !== echo.q) setQ(filters.q ?? "");
    if (filters.precoMin !== echo.min) setPrecoMin(filters.precoMin ? formatNumber(filters.precoMin) : "");
    if (filters.precoMax !== echo.max) setPrecoMax(filters.precoMax ? formatNumber(filters.precoMax) : "");
    setEcho({ q: filters.q ?? "", min: filters.precoMin, max: filters.precoMax });
  }

  const applyQ = (value: string) => {
    setEcho((e) => ({ ...e, q: value }));
    apply({ q: value || undefined });
  };

  useDebounced(() => {
    if ((filters.q ?? "") !== q.trim()) applyQ(q.trim());
  }, [q]);
  useDebounced(() => {
    const min = toNum(precoMin);
    const max = toNum(precoMax);
    if (min !== filters.precoMin || max !== filters.precoMax) {
      setEcho((e) => ({ ...e, min, max }));
      apply({ precoMin: min, precoMax: max });
    }
  }, [precoMin, precoMax], 700);

  const toggle = <T extends string>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const transmissions = TRANSMISSIONS.filter((t) => facets.transmissions.includes(t) || filters.cambio.includes(t));
  const fuels = FUELS.filter((f) => facets.fuels.includes(f) || filters.combustivel.includes(f));
  const years = facets.years;
  const fmtMoney = (n: string) => (digits(n) ? formatNumber(Number(digits(n))) : "");

  return (
    <form className={styles.filters} action="/veiculos" method="get" onSubmit={(e) => e.preventDefault()} role="search">
      <div className={styles.group}>
        <label htmlFor={`${id}-q`} className={styles.label}>
          Buscar
        </label>
        <div className={styles.search}>
          <Icon name="search" size={18} />
          <input
            id={`${id}-q`}
            name="q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Marca ou modelo"
            autoComplete="off"
            enterKeyHint="search"
            onKeyDown={(e) => e.key === "Enter" && applyQ(q.trim())}
          />
        </div>
      </div>

      {facets.brands.length > 0 && (
        <div className={styles.group}>
          <label htmlFor={`${id}-marca`} className={styles.label}>
            Marca
          </label>
          <select
            id={`${id}-marca`}
            name="marca"
            className={styles.select}
            value={filters.marca ?? ""}
            onChange={(e) => apply({ marca: e.target.value || undefined })}
          >
            <option value="">Todas as marcas</option>
            {facets.brands.map((b) => (
              <option key={b.name} value={b.name}>
                {b.name} ({b.count})
              </option>
            ))}
          </select>
        </div>
      )}

      <fieldset className={styles.group}>
        <legend className={styles.label}>Preço (R$)</legend>
        <div className={styles.pair}>
          <input
            name="precoMin"
            inputMode="numeric"
            aria-label="Preço mínimo"
            placeholder={facets.priceRange ? `de ${formatNumber(Math.floor(facets.priceRange.min / 1000) * 1000)}` : "mínimo"}
            value={precoMin}
            onChange={(e) => setPrecoMin(fmtMoney(e.target.value))}
            className={styles.input}
          />
          <input
            name="precoMax"
            inputMode="numeric"
            aria-label="Preço máximo"
            placeholder={facets.priceRange ? `até ${formatNumber(Math.ceil(facets.priceRange.max / 1000) * 1000)}` : "máximo"}
            value={precoMax}
            onChange={(e) => setPrecoMax(fmtMoney(e.target.value))}
            className={styles.input}
          />
        </div>
        <p className={styles.hint}>Veículos com preço sob consulta não entram no filtro de preço.</p>
      </fieldset>

      {years.length > 0 && (
        <fieldset className={styles.group}>
          <legend className={styles.label}>Ano do modelo</legend>
          <div className={styles.pair}>
            <select
              name="anoMin"
              aria-label="Ano mínimo"
              className={styles.select}
              value={filters.anoMin ?? ""}
              onChange={(e) => apply({ anoMin: e.target.value ? Number(e.target.value) : undefined })}
            >
              <option value="">De</option>
              {[...years].reverse().map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select
              name="anoMax"
              aria-label="Ano máximo"
              className={styles.select}
              value={filters.anoMax ?? ""}
              onChange={(e) => apply({ anoMax: e.target.value ? Number(e.target.value) : undefined })}
            >
              <option value="">Até</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </fieldset>
      )}

      <div className={styles.group}>
        <label htmlFor={`${id}-km`} className={styles.label}>
          Quilometragem
        </label>
        <select
          id={`${id}-km`}
          name="kmMax"
          className={styles.select}
          value={filters.kmMax ?? ""}
          onChange={(e) => apply({ kmMax: e.target.value ? Number(e.target.value) : undefined })}
        >
          <option value="">Qualquer quilometragem</option>
          {KM_PRESETS.map((k) => (
            <option key={k} value={k}>
              Até {formatNumber(k)} km
            </option>
          ))}
        </select>
      </div>

      {transmissions.length > 0 && (
        <fieldset className={styles.group}>
          <legend className={styles.label}>Câmbio</legend>
          <div className={styles.chips}>
            {transmissions.map((t) => (
              <label key={t} className={styles.chip}>
                <input
                  type="checkbox"
                  name="cambio"
                  value={t}
                  checked={filters.cambio.includes(t)}
                  onChange={() => apply({ cambio: toggle<Transmission>(filters.cambio, t) })}
                />
                <span>{transmissionLabel[t]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {fuels.length > 0 && (
        <fieldset className={styles.group}>
          <legend className={styles.label}>Combustível</legend>
          <div className={styles.chips}>
            {fuels.map((f) => (
              <label key={f} className={styles.chip}>
                <input
                  type="checkbox"
                  name="combustivel"
                  value={f}
                  checked={filters.combustivel.includes(f)}
                  onChange={() => apply({ combustivel: toggle<Fuel>(filters.combustivel, f) })}
                />
                <span>{fuelLabel[f]}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <noscript>
        <button type="submit" className="btn btn-light btn-block">
          Aplicar filtros
        </button>
      </noscript>
      <Link
        href="/veiculos"
        className={`link ${styles.clear}`}
        scroll={false}
        onClick={(e) => {
          e.preventDefault();
          apply({ q: undefined, marca: undefined, precoMin: undefined, precoMax: undefined, anoMin: undefined, anoMax: undefined, kmMax: undefined, cambio: [], combustivel: [] });
        }}
      >
        Limpar filtros
      </Link>
    </form>
  );
}
