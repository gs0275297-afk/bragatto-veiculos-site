import Image from "next/image";
import Link from "next/link";
import { fullAddress, mapsUrl, site } from "@/config/site";
import { Icon } from "@/components/ui/Icon";
import { messages, whatsappUrl } from "@/lib/whatsapp";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.top}`}>
        <div className={styles.brand}>
          <Image src="/brand/bragatto-logo.png" alt={site.name} width={180} height={126} sizes="180px" />
          <p>Compra, venda e troca de veículos em {site.address.city} – {site.address.state}.</p>
        </div>

        <nav className={styles.col} aria-label="Rodapé">
          <h2 className={styles.title}>Navegação</h2>
          <ul>
            <li>
              <Link href="/veiculos">Estoque</Link>
            </li>
            <li>
              <Link href="/#como-funciona">Como funciona</Link>
            </li>
            <li>
              <Link href="/#troca">Troca e venda</Link>
            </li>
            <li>
              <Link href="/#contato">Contato</Link>
            </li>
          </ul>
        </nav>

        <div className={styles.col}>
          <h2 className={styles.title}>Atendimento</h2>
          <ul>
            <li>
              <a href={whatsappUrl(messages.general())} target="_blank" rel="noopener noreferrer">
                <Icon name="whatsapp" size={16} /> {site.whatsapp.display}
              </a>
            </li>
            <li>
              <a href={`tel:${site.phone.e164}`}>
                <Icon name="phone" size={16} /> Ligar para a loja
              </a>
            </li>
            <li>
              <a href={site.instagram.url} target="_blank" rel="noopener noreferrer">
                <Icon name="instagram" size={16} /> @{site.instagram.handle}
              </a>
            </li>
            {site.email && (
              <li>
                <a href={`mailto:${site.email}`}>{site.email}</a>
              </li>
            )}
          </ul>
        </div>

        <div className={styles.col}>
          <h2 className={styles.title}>Endereço</h2>
          <address>
            {site.address.street}
            <br />
            {site.address.district} — {site.address.city} – {site.address.state}
          </address>
          <a className="link" href={mapsUrl} target="_blank" rel="noopener noreferrer">
            Como chegar <Icon name="arrow" size={16} />
          </a>
          {site.openingHours && (
            <dl className={styles.hours}>
              {site.openingHours.map((h) => (
                <div key={h.days}>
                  <dt>{h.days}</dt>
                  <dd>{h.hours}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>

      <div className={`container ${styles.bottom}`}>
        <p>
          © {site.name}
          {site.cnpj ? ` · CNPJ ${site.cnpj}` : ""}
        </p>
        <p className={styles.legal}>
          Preços, disponibilidade e condições podem mudar sem aviso. Confirme as informações com a loja antes de fechar negócio.
          Fotos dos veículos: acervo da {site.name}.
        </p>
        <p className="sr-only">{fullAddress}</p>
      </div>
    </footer>
  );
}
