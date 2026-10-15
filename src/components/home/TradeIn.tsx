"use client";

import { useId, useState } from "react";
import { site } from "@/config/site";
import { Icon } from "@/components/ui/Icon";
import { whatsappUrl } from "@/lib/whatsapp";
import styles from "./TradeIn.module.css";

type Intent = "troca" | "venda" | "financiamento";

const INTENTS: { value: Intent; label: string; hint: string }[] = [
  { value: "troca", label: "Trocar", hint: "Usar meu carro na compra de outro" },
  { value: "venda", label: "Vender", hint: "Vender meu carro para a loja" },
  { value: "financiamento", label: "Financiar", hint: "Consultar condições de financiamento" },
];

/**
 * Monta uma mensagem de WhatsApp com os dados informados. Nada é enviado ao servidor do site
 * nem armazenado — o visitante revisa e envia a mensagem no próprio WhatsApp.
 */
export function TradeIn() {
  const id = useId();
  const [intent, setIntent] = useState<Intent>("troca");
  const [vehicle, setVehicle] = useState("");
  const [year, setYear] = useState("");
  const [km, setKm] = useState("");
  const [notes, setNotes] = useState("");

  const hasCar = intent !== "financiamento";

  const buildMessage = () => {
    const lines = [
      intent === "troca"
        ? `Olá! Gostaria de avaliar meu veículo para troca na ${site.name}.`
        : intent === "venda"
          ? `Olá! Tenho interesse em vender meu veículo para a ${site.name}.`
          : `Olá! Gostaria de consultar as condições de financiamento na ${site.name}.`,
    ];
    if (hasCar) {
      if (vehicle.trim()) lines.push(`Veículo: ${vehicle.trim()}`);
      if (year.trim()) lines.push(`Ano: ${year.trim()}`);
      if (km.trim()) lines.push(`Quilometragem: ${km.trim()} km`);
    }
    if (notes.trim()) lines.push(`Observações: ${notes.trim()}`);
    return lines.join("\n");
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    window.open(whatsappUrl(buildMessage()), "_blank", "noopener,noreferrer");
  };

  return (
    <section id="troca" className={styles.section} aria-labelledby={`${id}-title`}>
      <div className={`container ${styles.grid}`}>
        <div className={styles.copy}>
          <p className="eyebrow" data-reveal>
            03 — Troca, venda e financiamento
          </p>
          <h2 id={`${id}-title`} className="h2" data-reveal style={{ "--reveal-i": 1 } as React.CSSProperties}>
            Tem um carro para trocar ou vender?
          </h2>
          <p className="lead" data-reveal style={{ "--reveal-i": 2 } as React.CSSProperties}>
            Preencha os dados do seu veículo e envie direto para o WhatsApp da loja. A avaliação e as condições são
            combinadas no atendimento.
          </p>
          <p className={`mono ${styles.privacy}`} data-reveal style={{ "--reveal-i": 3 } as React.CSSProperties}>
            <Icon name="check" size={14} /> Nada é gravado no site — a mensagem abre no seu WhatsApp para você revisar.
          </p>
        </div>

        <form className={styles.form} onSubmit={onSubmit} data-reveal style={{ "--reveal-i": 1 } as React.CSSProperties}>
          <fieldset className={styles.intents}>
            <legend className="sr-only">O que você deseja?</legend>
            {INTENTS.map((opt) => (
              <label key={opt.value} className={styles.intent} data-checked={intent === opt.value || undefined}>
                <input
                  type="radio"
                  name="intent"
                  value={opt.value}
                  checked={intent === opt.value}
                  onChange={() => setIntent(opt.value)}
                />
                <span className={styles.intentLabel}>{opt.label}</span>
                <span className={styles.intentHint}>{opt.hint}</span>
              </label>
            ))}
          </fieldset>

          {hasCar && (
            <div className={styles.fields}>
              <label className={`${styles.field} ${styles.wide}`}>
                <span>Marca e modelo do seu veículo</span>
                <input
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value)}
                  placeholder="Ex.: Volkswagen Gol 1.6"
                  autoComplete="off"
                  maxLength={80}
                />
              </label>
              <label className={styles.field}>
                <span>Ano</span>
                <input value={year} onChange={(e) => setYear(e.target.value)} inputMode="numeric" placeholder="Ex.: 2018/2019" maxLength={9} />
              </label>
              <label className={styles.field}>
                <span>Quilometragem</span>
                <input value={km} onChange={(e) => setKm(e.target.value)} inputMode="numeric" placeholder="Ex.: 85.000" maxLength={9} />
              </label>
            </div>
          )}
          <label className={`${styles.field} ${styles.wide}`}>
            <span>Observações (opcional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={400}
              placeholder={hasCar ? "Estado de conservação, revisões, se é único dono..." : "Qual veículo do estoque te interessa?"}
            />
          </label>

          <button type="submit" className="btn btn-primary btn-block">
            <Icon name="whatsapp" size={18} /> Enviar pelo WhatsApp
          </button>
        </form>
      </div>
    </section>
  );
}
