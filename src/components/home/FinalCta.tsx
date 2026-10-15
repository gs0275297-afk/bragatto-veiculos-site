import Link from "next/link";
import { site } from "@/config/site";
import { Icon } from "@/components/ui/Icon";
import { messages, whatsappUrl } from "@/lib/whatsapp";
import styles from "./FinalCta.module.css";

export function FinalCta() {
  return (
    <section className={`${styles.section} grain`} aria-labelledby="cta-title">
      <div className={`container ${styles.inner}`}>
        <h2 id="cta-title" className={styles.title} data-reveal>
          Viu um carro que interessa<span className="red-dot">?</span>
        </h2>
        <div className={styles.side} data-reveal style={{ "--reveal-i": 1 } as React.CSSProperties}>
          <p>Mande uma mensagem para a {site.shortName}. Informações, visita, troca ou financiamento — tudo no mesmo atendimento.</p>
          <div className={styles.actions}>
            <a className="btn btn-primary" href={whatsappUrl(messages.general())} target="_blank" rel="noopener noreferrer">
              <Icon name="whatsapp" size={18} /> {site.whatsapp.display}
            </a>
            <Link className="btn btn-ghost" href="/veiculos">
              Ver estoque <Icon name="arrow" size={18} className="btn-arrow" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
