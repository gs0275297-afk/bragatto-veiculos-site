import Link from "next/link";
import { mapsUrl, site } from "@/config/site";
import { Icon } from "@/components/ui/Icon";
import { VehicleCard } from "@/components/vehicles/VehicleCard";
import { getRelated, type PublicVehicle } from "@/lib/data/vehicles";
import { formatKm, formatPrice, formatYear, vehicleName } from "@/lib/format";
import { jsonLd, vehicleJsonLd } from "@/lib/seo";
import { fuelLabel, statusLabel, transmissionLabel } from "@/lib/vehicle-labels";
import { messages, whatsappUrl } from "@/lib/whatsapp";
import { ShareButton } from "./ShareButton";
import { VehicleMedia } from "./VehicleMedia";
import styles from "./VehicleDetail.module.css";

export async function VehicleDetail({ vehicle: v }: { vehicle: PublicVehicle }) {
  const related = await getRelated(v.id, v.brand, 3);
  const name = vehicleName(v);
  const year = formatYear(v.yearManufacture, v.yearModel);
  const price = formatPrice(v.priceCents);
  const url = `${site.url}/veiculos/${v.slug}`;
  const sold = v.status === "vendido";

  // ficha técnica: somente o que foi cadastrado
  const specs = [
    ["Marca", v.brand],
    ["Modelo", v.model],
    ["Versão", v.version],
    ["Ano fab./modelo", year],
    ["Quilometragem", formatKm(v.mileageKm)],
    ["Câmbio", v.transmission ? transmissionLabel[v.transmission] : null],
    ["Combustível", v.fuel ? fuelLabel[v.fuel] : null],
    ["Motor", v.engine],
    ["Carroceria", v.bodyType],
    ["Cor", v.color],
    ["Portas", v.doors ? String(v.doors) : null],
  ].filter((s): s is [string, string] => Boolean(s[1]));

  const readouts = [
    { label: "Ano", value: year },
    { label: "Km", value: v.mileageKm != null ? new Intl.NumberFormat("pt-BR").format(v.mileageKm) : null },
    { label: "Câmbio", value: v.transmission ? transmissionLabel[v.transmission] : null },
    { label: "Combustível", value: v.fuel ? fuelLabel[v.fuel] : null },
  ].filter((r) => r.value);

  return (
    <article className={styles.detail}>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(vehicleJsonLd(v))} />

      <div className={`container ${styles.top}`}>
        <nav className={styles.crumbs} aria-label="Navegação estrutural">
          <ol>
            <li>
              <Link href="/veiculos">Estoque</Link>
            </li>
            <li>
              <Link href={`/veiculos?marca=${encodeURIComponent(v.brand)}`}>{v.brand}</Link>
            </li>
            <li aria-current="page">{[v.model, v.version].filter(Boolean).join(" ")}</li>
          </ol>
        </nav>

        <div className={styles.grid}>
          <div className={styles.mediaCol}>
            <VehicleMedia photos={v.photos} spin={v.spin} model3d={v.model3d} name={name} />
          </div>

          <aside className={styles.panel} aria-label="Resumo e contato">
            <p className={`mono ${styles.brand}`}>{v.brand}</p>
            <h1 className={styles.title}>
              {v.model}
              {v.version && <span className={styles.version}>{v.version}</span>}
            </h1>

            <div className={styles.badges}>
              <span className={styles.status} data-status={v.status}>
                <span aria-hidden="true" /> {statusLabel[v.status]}
              </span>
              {v.isDemo && <span className={styles.demo}>Demonstração — dado fictício</span>}
            </div>

            {readouts.length > 0 && (
              <dl className={styles.readouts}>
                {readouts.map((r) => (
                  <div key={r.label}>
                    <dt>{r.label}</dt>
                    <dd className="mono">{r.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            <div className={styles.priceBlock}>
              {price ? (
                <>
                  <p className={styles.priceLabel}>Preço anunciado</p>
                  <p className={styles.price}>{price}</p>
                </>
              ) : (
                <>
                  <p className={styles.priceLabel}>Preço</p>
                  <p className={styles.priceConsult}>Sob consulta</p>
                </>
              )}
              <p className={styles.priceNote}>Valores e disponibilidade confirmados no atendimento.</p>
            </div>

            {sold ? (
              <div className={styles.ctas}>
                <p className={styles.soldNote}>Este veículo já foi vendido.</p>
                <Link href="/veiculos" className="btn btn-primary btn-block">
                  Ver veículos disponíveis <Icon name="arrow" size={18} className="btn-arrow" />
                </Link>
                <a className="btn btn-ghost btn-block" href={whatsappUrl(messages.search(name))} target="_blank" rel="noopener noreferrer">
                  <Icon name="whatsapp" size={18} /> Procuro um parecido
                </a>
              </div>
            ) : (
              <div className={styles.ctas}>
                <a className="btn btn-primary btn-block" href={whatsappUrl(messages.vehicle(v))} target="_blank" rel="noopener noreferrer">
                  <Icon name="whatsapp" size={18} /> {v.status === "reservado" ? "Consultar disponibilidade" : "Tenho interesse"}
                </a>
                <div className={styles.ctaRow}>
                  <a className="btn btn-ghost btn-block" href={`tel:${site.phone.e164}`}>
                    <Icon name="phone" size={18} /> Ligar
                  </a>
                  <ShareButton url={url} title={`${name} ${year} — ${site.name}`} />
                </div>
                <ul className={styles.moreActions}>
                  {site.services.troca && (
                    <li>
                      <a href={whatsappUrl(messages.tradeIn(v))} target="_blank" rel="noopener noreferrer">
                        <Icon name="swap" size={18} />
                        <span>
                          <strong>Tenho um carro para dar na troca</strong>
                          <small>Envie os dados para avaliação da loja</small>
                        </span>
                        <Icon name="arrow" size={16} />
                      </a>
                    </li>
                  )}
                  {site.services.financiamento && (
                    <li>
                      <a href={whatsappUrl(messages.financing(v))} target="_blank" rel="noopener noreferrer">
                        <Icon name="key" size={18} />
                        <span>
                          <strong>Consultar financiamento</strong>
                          <small>Condições sujeitas à análise de crédito</small>
                        </span>
                        <Icon name="arrow" size={16} />
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            )}

            <a className={styles.location} href={mapsUrl} target="_blank" rel="noopener noreferrer">
              <Icon name="pin" size={18} />
              <span>
                {site.address.street} — {site.address.district}, {site.address.city}/{site.address.state}
                <small>Ver rota até a loja</small>
              </span>
            </a>
          </aside>
        </div>
      </div>

      <section className={`container ${styles.info}`} aria-label="Detalhes do veículo">
        <div className={styles.infoMain}>
          {v.description && (
            <div className={styles.block}>
              <h2 className={styles.blockTitle}>
                <span className="mono">01</span> Sobre o veículo
              </h2>
              <p className={styles.description}>{v.description}</p>
            </div>
          )}
          {v.features.length > 0 && (
            <div className={styles.block}>
              <h2 className={styles.blockTitle}>
                <span className="mono">{v.description ? "02" : "01"}</span> Itens e opcionais informados
              </h2>
              <ul className={styles.features}>
                {v.features.map((f) => (
                  <li key={f}>
                    <Icon name="check" size={16} /> {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className={styles.block}>
          <h2 className={styles.blockTitle}>
            <span className="mono">Ficha</span> Dados do anúncio
          </h2>
          <dl className={styles.specs}>
            {specs.map(([k, val]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{val}</dd>
              </div>
            ))}
          </dl>
          <p className={styles.specsNote}>
            Informações cadastradas pela loja. Confirme os detalhes antes da compra.
          </p>
        </div>
      </section>

      {related.length > 0 && (
        <section className={styles.related} aria-labelledby="relacionados">
          <div className="container">
            <div className={styles.relatedHead}>
              <h2 id="relacionados" className="h3">
                Outros veículos no estoque
              </h2>
              <Link href="/veiculos" className="link">
                Ver todos <Icon name="arrow" size={16} />
              </Link>
            </div>
            <div className={styles.relatedGrid}>
              {related.map((r) => (
                <VehicleCard key={r.id} vehicle={r} sizes="(max-width: 640px) 100vw, 33vw" />
              ))}
            </div>
          </div>
        </section>
      )}

      {!sold && (
        <div className={styles.sticky}>
          <div>
            <p className={styles.stickyName}>{[v.model, v.version].filter(Boolean).join(" ")}</p>
            <p className={styles.stickyPrice}>{price ?? "Preço sob consulta"}</p>
          </div>
          <a className="btn btn-primary btn-sm" href={whatsappUrl(messages.vehicle(v))} target="_blank" rel="noopener noreferrer">
            <Icon name="whatsapp" size={18} /> WhatsApp
          </a>
        </div>
      )}
    </article>
  );
}
