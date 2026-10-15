import { Icon, type IconName } from "@/components/ui/Icon";
import styles from "./Process.module.css";

const STEPS: { n: string; icon: IconName; kicker: string; title: string; text: string }[] = [
  {
    n: "01",
    icon: "search",
    kicker: "Compra",
    title: "Escolha no estoque",
    text: "Filtre por marca, ano, preço, câmbio e quilometragem. Cada anúncio reúne as fotos do veículo e os itens informados pela loja.",
  },
  {
    n: "02",
    icon: "whatsapp",
    kicker: "Atendimento",
    title: "Fale direto com a loja",
    text: "O botão de WhatsApp de cada anúncio já envia a mensagem com o veículo escolhido. Tire as dúvidas e combine a visita.",
  },
  {
    n: "03",
    icon: "swap",
    kicker: "Troca e venda",
    title: "Seu carro na negociação",
    text: "Informe modelo, ano e quilometragem do seu veículo. A avaliação para troca ou compra é feita pela loja no atendimento.",
  },
  {
    n: "04",
    icon: "key",
    kicker: "Financiamento",
    title: "Consulte as condições",
    text: "A loja atende quem deseja financiar. Taxas, prazos e aprovação dependem da análise de crédito da instituição financeira.",
  },
];

export function Process() {
  return (
    <section id="como-funciona" className={styles.section} aria-labelledby="processo-title">
      <div className="container">
        <div className={styles.head}>
          <p className={`eyebrow ${styles.eyebrow}`} data-reveal>
            02 — Como funciona
          </p>
          <h2 id="processo-title" className={`h2 ${styles.title}`} data-reveal style={{ "--reveal-i": 1 } as React.CSSProperties}>
            Do anúncio à visita, direto com a loja.
          </h2>
        </div>
        <ol className={styles.steps}>
          {STEPS.map((s, i) => (
            <li key={s.n} className={styles.step} data-reveal style={{ "--reveal-i": i } as React.CSSProperties}>
              <div className={styles.stepTop}>
                <span className={`mono ${styles.n}`}>{s.n}</span>
                <Icon name={s.icon} size={22} />
              </div>
              <p className={`mono ${styles.kicker}`}>{s.kicker}</p>
              <h3 className={styles.stepTitle}>{s.title}</h3>
              <p className={styles.text}>{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
