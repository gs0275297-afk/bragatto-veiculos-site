import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { site } from "@/config/site";
import { Icon } from "@/components/ui/Icon";
import { VehicleCard } from "@/components/vehicles/VehicleCard";
import { ActiveFilters } from "@/components/vehicles/inventory/ActiveFilters";
import { InventoryShell } from "@/components/vehicles/inventory/InventoryShell";
import { Pagination } from "@/components/vehicles/inventory/Pagination";
import { SortSelect } from "@/components/vehicles/inventory/SortSelect";
import { getFacets, getListing } from "@/lib/data/vehicles";
import { activeFilterCount, parseFilters } from "@/lib/filters";
import { messages, whatsappUrl } from "@/lib/whatsapp";
import styles from "./page.module.css";
import inv from "@/components/vehicles/inventory/Inventory.module.css";

export const metadata: Metadata = {
  title: "Estoque de veículos em Três Lagoas/MS",
  description: `Veja os carros à venda na ${site.name}, em Três Lagoas – MS. Filtre por marca, preço, ano, quilometragem, câmbio e combustível e fale com a loja pelo WhatsApp.`,
  alternates: { canonical: "/veiculos" },
  openGraph: { url: "/veiculos" },
};

export default function InventoryPage({ searchParams }: PageProps<"/veiculos">) {
  return (
    <>
      <section className={styles.head}>
        <div className="container">
          <p className="eyebrow">Estoque · {site.address.city} – {site.address.state}</p>
          <h1 className={`display ${styles.title}`}>
            Estoque<span className="red-dot">.</span>
          </h1>
          <p className="lead">
            Veículos anunciados pela {site.name}. Preços e disponibilidade são confirmados no atendimento pelo WhatsApp.
          </p>
        </div>
      </section>
      <section className={`container ${styles.body}`} aria-label="Veículos">
        <Suspense fallback={<ListingSkeleton />}>
          <Listing searchParams={searchParams} />
        </Suspense>
      </section>
    </>
  );
}

async function Listing({ searchParams }: { searchParams: PageProps<"/veiculos">["searchParams"] }) {
  const filters = parseFilters(await searchParams);
  const [{ items, total, page, pages }, facets] = await Promise.all([getListing(filters), getFacets()]);
  const active = activeFilterCount(filters);

  return (
    <InventoryShell filters={filters} facets={facets} total={total} activeCount={active}>
      <div className={inv.toolbar}>
        <p className={inv.total} aria-live="polite">
          <strong>{String(total).padStart(2, "0")}</strong> {total === 1 ? "veículo encontrado" : "veículos encontrados"}
          {pages > 1 && ` · página ${page} de ${pages}`}
        </p>
        <SortSelect />
      </div>
      <ActiveFilters filters={filters} />

      {items.length > 0 ? (
        <ul className={inv.grid}>
          {items.map((v, i) => (
            <li key={v.id} style={{ display: "flex" }}>
              <VehicleCard vehicle={v} headingLevel="h2" preload={i < 3} sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 30vw" />
            </li>
          ))}
        </ul>
      ) : (
        <div className={inv.empty}>
          <h2>{active ? "Nenhum veículo com esses filtros." : "Nenhum veículo anunciado no momento."}</h2>
          <p>
            {active
              ? "Tente ampliar a faixa de preço, de ano ou de quilometragem. Se preferir, conte para a loja o que você procura."
              : "O estoque está sendo atualizado. Fale com a loja para saber o que está disponível."}
          </p>
          <div className={inv.emptyActions}>
            {active > 0 && (
              <Link href="/veiculos" className="btn btn-ghost">
                Limpar filtros
              </Link>
            )}
            <a className="btn btn-primary" href={whatsappUrl(messages.search(filters.q ?? filters.marca ?? ""))} target="_blank" rel="noopener noreferrer">
              <Icon name="whatsapp" size={18} /> Avise-me pelo WhatsApp
            </a>
          </div>
        </div>
      )}

      <Pagination filters={filters} page={page} pages={pages} />
    </InventoryShell>
  );
}

function ListingSkeleton() {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      <div className={styles.skSide} />
      <div className={styles.skGrid}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className={styles.skCard} />
        ))}
      </div>
    </div>
  );
}
