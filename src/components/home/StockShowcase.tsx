import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { VehicleCard } from "@/components/vehicles/VehicleCard";
import { getFacets, getLatest } from "@/lib/data/vehicles";
import styles from "./StockShowcase.module.css";

export async function StockShowcase() {
  const [latest, facets] = await Promise.all([getLatest(5), getFacets()]);
  const [lead, ...rest] = latest;

  return (
    <section id="estoque" className={styles.section} aria-labelledby="estoque-title">
      <div className="container">
        <header className={styles.head}>
          <div>
            <p className="eyebrow" data-reveal>
              01 — Estoque
            </p>
            <h2 id="estoque-title" className="h2" data-reveal style={{ "--reveal-i": 1 } as React.CSSProperties}>
              Disponíveis na loja
            </h2>
          </div>
          <div className={styles.headAside} data-reveal style={{ "--reveal-i": 2 } as React.CSSProperties}>
            <p className={styles.count}>
              <span className="mono">{String(facets.total).padStart(2, "0")}</span>
              {facets.total === 1 ? "veículo anunciado" : "veículos anunciados"}
            </p>
            <Link href="/veiculos" className="link">
              Ver estoque completo <Icon name="arrow" size={16} />
            </Link>
          </div>
        </header>

        {facets.brands.length > 0 && (
          <nav className={styles.brands} aria-label="Filtrar por marca" data-reveal>
            {facets.brands.map((b) => (
              <Link key={b.name} href={`/veiculos?marca=${encodeURIComponent(b.name)}`} className={styles.brand}>
                {b.name}
                <span className="mono">{b.count}</span>
              </Link>
            ))}
          </nav>
        )}

        {lead ? (
          <div
            className={styles.grid}
            data-layout={rest.length >= 4 ? "mosaic" : "list"}
            style={{ "--rows": Math.max(1, rest.length) } as React.CSSProperties}
          >
            <div className={styles.lead} data-reveal>
              <VehicleCard vehicle={lead} size="large" sizes="(max-width: 980px) 100vw, 50vw" />
            </div>
            {rest.map((v, i) => (
              <div key={v.id} data-reveal style={{ "--reveal-i": (i % 2) + 1 } as React.CSSProperties}>
                <VehicleCard
                  vehicle={v}
                  size={rest.length >= 4 ? "default" : "row"}
                  sizes="(max-width: 640px) 100vw, (max-width: 980px) 50vw, 25vw"
                />
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.empty}>O estoque está sendo atualizado. Fale com a loja para saber o que está disponível.</p>
        )}
      </div>
    </section>
  );
}
