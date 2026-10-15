import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import type { VehicleCardData } from "@/lib/data/vehicles";
import { formatKm, formatPrice, formatYear } from "@/lib/format";
import { statusLabel, transmissionLabel } from "@/lib/vehicle-labels";
import { messages, whatsappUrl } from "@/lib/whatsapp";
import { VehiclePhoto } from "./VehiclePhoto";
import styles from "./VehicleCard.module.css";

type Props = {
  vehicle: VehicleCardData;
  size?: "default" | "large" | "row";
  sizes?: string;
  headingLevel?: "h2" | "h3";
  preload?: boolean;
};

export function VehicleCard({
  vehicle: v,
  size = "default",
  sizes = "(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 33vw",
  headingLevel: H = "h3",
  preload,
}: Props) {
  const name = [v.model, v.version].filter(Boolean).join(" ");
  const price = formatPrice(v.priceCents);
  const specs = [
    formatYear(v.yearManufacture, v.yearModel),
    formatKm(v.mileageKm),
    v.transmission ? transmissionLabel[v.transmission] : null,
  ].filter(Boolean);
  const href = `/veiculos/${v.slug}`;
  const alt = `${v.brand} ${name} ${formatYear(v.yearManufacture, v.yearModel)}`;

  return (
    <article className={styles.card} data-size={size}>
      <div className={styles.media}>
        {v.cover ? (
          <>
            <VehiclePhoto photo={v.cover} alt={alt} sizes={sizes} preload={preload} className={styles.img} />
            {v.second && size === "default" && (
              <VehiclePhoto photo={v.second} alt="" sizes={sizes} className={`${styles.img} ${styles.alt}`} />
            )}
          </>
        ) : (
          <div className={styles.noPhoto} aria-hidden="true">
            <Icon name="grid" size={28} />
            <span className="mono">Fotos em breve</span>
          </div>
        )}
        <div className={styles.flags}>
          {v.isDemo && <span className={`${styles.flag} ${styles.demo}`}>Demonstração</span>}
          {v.has3d && <span className={styles.flag}>3D</span>}
          {v.has360 && <span className={styles.flag}>360°</span>}
          {v.status !== "disponivel" && (
            <span className={styles.flag} data-status={v.status}>
              {statusLabel[v.status]}
            </span>
          )}
        </div>
        {v.photoCount > 1 && (
          <span className={`mono ${styles.count}`} aria-label={`${v.photoCount} fotos`}>
            {String(v.photoCount).padStart(2, "0")} fotos
          </span>
        )}
      </div>

      <div className={styles.body}>
        <p className={`mono ${styles.brand}`}>{v.brand}</p>
        <H className={styles.title}>
          <Link href={href} className={styles.stretched} prefetch={true}>
            {name}
          </Link>
        </H>
        <p className={`mono ${styles.specs}`}>
          {specs.map((s, i) => (
            <span key={i}>{s}</span>
          ))}
        </p>
        <div className={styles.foot}>
          {price ? (
            <p className={styles.price}>
              <span className="sr-only">Preço: </span>
              {price}
            </p>
          ) : (
            <p className={styles.consult}>Preço sob consulta</p>
          )}
          <a
            className={styles.wa}
            href={whatsappUrl(messages.vehicle(v))}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Pedir informações sobre ${v.brand} ${name} pelo WhatsApp`}
          >
            <Icon name="whatsapp" size={18} />
          </a>
        </div>
      </div>
    </article>
  );
}
