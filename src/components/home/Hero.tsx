import Link from "next/link";
import { site } from "@/config/site";
import { Icon } from "@/components/ui/Icon";
import { getFacets, getShowcase } from "@/lib/data/vehicles";
import { messages, whatsappUrl } from "@/lib/whatsapp";
import { HeroStage, type StageItem } from "./HeroStage";
import { HeroLight } from "./HeroLight";
import { formatKm, formatPrice, formatYear } from "@/lib/format";
import { transmissionLabel } from "@/lib/vehicle-labels";
import styles from "./Hero.module.css";

export async function Hero() {
  const [showcase, facets] = await Promise.all([getShowcase(5), getFacets()]);

  const items: StageItem[] = showcase.map((v) => ({
    slug: v.slug,
    brand: v.brand,
    model: v.model,
    name: [v.model, v.version].filter(Boolean).join(" "),
    specs: [
      formatYear(v.yearManufacture, v.yearModel),
      formatKm(v.mileageKm),
      v.transmission ? transmissionLabel[v.transmission] : null,
    ].filter(Boolean) as string[],
    price: formatPrice(v.priceCents),
    photo: v.cover!,
  }));

  return (
    <section className={`${styles.hero} grain`} aria-labelledby="hero-title">
      <HeroLight />
      <div className={`container ${styles.grid}`}>
        <div className={styles.copy}>
          <p className={`eyebrow ${styles.rise} ${styles.eyebrow}`} style={{ "--d": "0ms" } as React.CSSProperties}>
            {site.address.city} · {site.address.state}
          </p>
          <h1 id="hero-title" className={`display ${styles.title}`}>
            <span className={styles.line}>
              <span style={{ "--d": "80ms" } as React.CSSProperties}>Compra, venda</span>
            </span>
            <span className={styles.line}>
              <span style={{ "--d": "160ms" } as React.CSSProperties}>e troca de</span>
            </span>
            <span className={styles.line}>
              <span style={{ "--d": "240ms" } as React.CSSProperties}>
                veículos<span className="red-dot">.</span>
              </span>
            </span>
          </h1>
          <p className={`lead ${styles.rise} ${styles.lead}`} style={{ "--d": "380ms" } as React.CSSProperties}>
            Escolha no estoque, fale direto com a {site.shortName} pelo WhatsApp e venha ver o carro de perto na{" "}
            {site.address.street.replace("Avenida", "Av.")} — {site.address.district}.
          </p>
          <div className={`${styles.ctas} ${styles.rise}`} style={{ "--d": "480ms" } as React.CSSProperties}>
            <Link href="/veiculos" className="btn btn-primary">
              Ver estoque <Icon name="arrow" size={18} className="btn-arrow" />
            </Link>
            <a className="btn btn-ghost" href={whatsappUrl(messages.general())} target="_blank" rel="noopener noreferrer">
              <Icon name="whatsapp" size={18} /> Falar no WhatsApp
            </a>
          </div>

          <dl className={`${styles.readout} ${styles.rise}`} style={{ "--d": "600ms" } as React.CSSProperties}>
            <div>
              <dt>Estoque</dt>
              <dd>
                <span className={styles.big}>{String(facets.total).padStart(2, "0")}</span>{" "}
                {facets.total === 1 ? "veículo" : "veículos"}
              </dd>
            </div>
            <div>
              <dt>Serviços</dt>
              <dd>Compra · Venda · Troca</dd>
            </div>
            <div>
              <dt>Loja</dt>
              <dd>{site.address.district}</dd>
            </div>
          </dl>
        </div>

        {items.length > 0 ? (
          <HeroStage items={items} />
        ) : (
          <div className={styles.emptyStage} aria-hidden="true">
            <span className="mono">Estoque em atualização</span>
          </div>
        )}
      </div>

      <Link href="#estoque" className={styles.cue} aria-label="Ir para o estoque">
        <span className="mono">Estoque</span>
        <span className={styles.cueLine} aria-hidden="true" />
      </Link>
    </section>
  );
}
