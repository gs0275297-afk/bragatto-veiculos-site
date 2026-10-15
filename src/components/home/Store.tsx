import Image from "next/image";
import { mapsUrl, site } from "@/config/site";
import { Icon } from "@/components/ui/Icon";
import { messages, whatsappUrl } from "@/lib/whatsapp";
import { MapEmbed } from "./MapEmbed";
import styles from "./Store.module.css";

export function Store() {
  return (
    <section id="loja" className={styles.section} aria-labelledby="loja-title">
      <div className={`container ${styles.grid}`}>
        <figure className={styles.photo} data-reveal="mask">
          <Image
            src="/brand/showroom-mezanino.jpg"
            alt="Interior da loja Bragatto Veículos, com mezanino e veículos expostos"
            fill
            sizes="(max-width: 980px) 100vw, 55vw"
            quality={75}
            style={{ objectFit: "cover", objectPosition: "50% 30%" }}
          />
          <figcaption className="mono">Showroom · {site.address.street.replace("Avenida", "Av.")}</figcaption>
        </figure>

        <div className={styles.info} id="contato">
          <p className="eyebrow" data-reveal>
            04 — A loja
          </p>
          <h2 id="loja-title" className="h2" data-reveal style={{ "--reveal-i": 1 } as React.CSSProperties}>
            Venha ver de perto, no Centro de {site.address.city}.
          </h2>
          <p className="lead" data-reveal style={{ "--reveal-i": 2 } as React.CSSProperties}>
            A {site.name} trabalha com compra, venda e troca de veículos. Combine sua visita pelo WhatsApp e conheça o
            carro pessoalmente antes de decidir.
          </p>

          <dl className={styles.list} data-reveal style={{ "--reveal-i": 3 } as React.CSSProperties}>
            <div>
              <dt>Endereço</dt>
              <dd>
                {site.address.street}
                <br />
                {site.address.district} — {site.address.city} – {site.address.state}
              </dd>
            </div>
            <div>
              <dt>WhatsApp</dt>
              <dd>
                <a href={whatsappUrl(messages.general())} target="_blank" rel="noopener noreferrer" className="link">
                  {site.whatsapp.display}
                </a>
              </dd>
            </div>
            <div>
              <dt>Telefone</dt>
              <dd>
                <a href={`tel:${site.phone.e164}`} className="link">
                  {site.phone.display}
                </a>
              </dd>
            </div>
            <div>
              <dt>Instagram</dt>
              <dd>
                <a href={site.instagram.url} target="_blank" rel="noopener noreferrer" className="link">
                  @{site.instagram.handle}
                </a>
              </dd>
            </div>
            {site.openingHours?.map((h) => (
              <div key={h.days}>
                <dt>{h.days}</dt>
                <dd>{h.hours}</dd>
              </div>
            ))}
          </dl>

          <div className={styles.actions} data-reveal style={{ "--reveal-i": 4 } as React.CSSProperties}>
            <a className="btn btn-primary" href={whatsappUrl(messages.general())} target="_blank" rel="noopener noreferrer">
              <Icon name="whatsapp" size={18} /> Agendar visita
            </a>
            <a className="btn btn-ghost" href={mapsUrl} target="_blank" rel="noopener noreferrer">
              <Icon name="route" size={18} /> Como chegar
            </a>
          </div>

          <MapEmbed />
        </div>
      </div>
    </section>
  );
}
